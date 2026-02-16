"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Homework, Subject } from "@/lib/db"
import { toggleHomeworkCompletion, deleteHomework } from "@/app/actions/homework"
import { getTimeSlots, updateTimeSlots } from "@/app/actions/scholium"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2, Plus, X, Save } from "lucide-react"
import { EditHomeworkDialog } from "./edit-homework-dialog"
import { cn } from "@/lib/utils"

const TIME_SLOTS = [
  { start: "07:00", end: "08:30", label: "7:00 AM - 8:30 AM" },
  { start: "08:30", end: "10:00", label: "8:30 AM - 10:00 AM" },
  // Add more time slots as needed
]

interface HomeworkTimetableProps {
  homework: Homework[]
  subjects: Subject[]
  canAddHomework: boolean
  isHost: boolean
  scholiumId: number
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function HomeworkTimetable({ homework: initialHomework, subjects, canAddHomework, isHost, scholiumId }: HomeworkTimetableProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null)
  const [homework, setHomework] = useState(initialHomework)
  const [timeSlots, setTimeSlots] = useState<Array<{ start: string; end: string }>>([])
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const [editingField, setEditingField] = useState<{ index: number; field: 'start' | 'end'; previousValue: string } | null>(null)
  const [editingSlots, setEditingSlots] = useState(false)
  const [tempSlots, setTempSlots] = useState<Array<{ start: string; end: string }>>([])
  const { toast } = useToast()

  // Sync local homework state with props when they change
  useEffect(() => {
    setHomework(initialHomework)
  }, [initialHomework])

  // Load time slots immediately on mount
  useEffect(() => {
    loadTimeSlots()
  }, [scholiumId])

  async function loadTimeSlots() {
    const slots = await getTimeSlots(scholiumId)
    setTimeSlots(slots)
  }

  function formatTimeInput(value: string): string {
    // Remove non-numeric characters
    const numbers = value.replace(/\D/g, '')
    
    // Auto-format as HH:MM
    if (numbers.length >= 2) {
      return numbers.slice(0, 2) + (numbers.length > 2 ? ':' + numbers.slice(2, 4) : '')
    }
    return numbers
  }

  async function updateSlotTime(index: number, field: 'start' | 'end', value: string, previousValue: string) {
    // Validate HH:MM format
    if (!value.match(/^\d{2}:\d{2}$/)) {
      toast({
        title: "Invalid time format",
        description: "Please use HH:MM format (e.g., 07:30)",
        variant: "destructive",
      })
      // Revert to previous value
      const newSlots = [...timeSlots]
      newSlots[index] = { ...newSlots[index], [field]: previousValue }
      setTimeSlots(newSlots)
      setEditingField(null)
      return
    }

    const newSlots = [...timeSlots]
    const updatedSlot = { ...newSlots[index], [field]: value }
    
    // Validate that end time is after start time
    if (updatedSlot.end <= updatedSlot.start) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time",
        variant: "destructive",
      })
      // Revert to previous value
      const revertSlots = [...timeSlots]
      revertSlots[index] = { ...revertSlots[index], [field]: previousValue }
      setTimeSlots(revertSlots)
      setEditingField(null)
      return
    }

    // Validate ascending order: current slot must be after previous slot
    if (index > 0) {
      const previousSlot = newSlots[index - 1]
      if (updatedSlot.start < previousSlot.end) {
        toast({
          title: "Invalid time order",
          description: "Start time must be after previous slot's end time",
          variant: "destructive",
        })
        // Revert to previous value
        const revertSlots = [...timeSlots]
        revertSlots[index] = { ...revertSlots[index], [field]: previousValue }
        setTimeSlots(revertSlots)
        setEditingField(null)
        return
      }
    }

    // Validate ascending order: current slot must be before next slot
    if (index < newSlots.length - 1) {
      const nextSlot = newSlots[index + 1]
      if (updatedSlot.end > nextSlot.start) {
        toast({
          title: "Invalid time order",
          description: "End time must be before next slot's start time",
          variant: "destructive",
        })
        // Revert to previous value
        const revertSlots = [...timeSlots]
        revertSlots[index] = { ...revertSlots[index], [field]: previousValue }
        setTimeSlots(revertSlots)
        setEditingField(null)
        return
      }
    }
    
    newSlots[index] = updatedSlot
    setTimeSlots(newSlots)
    setEditingField(null)
    
    // Update in database
    await updateTimeSlots(scholiumId, newSlots)
    router.refresh()
    setEditingField(null)
  }

  async function addTimeSlot() {
    if (timeSlots.length < 10) {
      let newStart = "07:00"
      let newEnd = "07:45"
      
      // If there are existing slots, calculate based on the last one
      if (timeSlots.length > 0) {
        const lastSlot = timeSlots[timeSlots.length - 1]
        const [lastEndHour, lastEndMinute] = lastSlot.end.split(':').map(Number)
        
        // Add 15-minute break after last slot
        let startMinutes = lastEndHour * 60 + lastEndMinute + 15
        let endMinutes = startMinutes + 45 // 45-minute slot
        
        // Convert back to HH:MM format
        const startHour = Math.floor(startMinutes / 60)
        const startMinute = startMinutes % 60
        const endHour = Math.floor(endMinutes / 60)
        const endMinute = endMinutes % 60
        
        newStart = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`
        newEnd = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
      }
      
      const newSlots = [...timeSlots, { start: newStart, end: newEnd }]
      setTimeSlots(newSlots)
      await updateTimeSlots(scholiumId, newSlots)
      router.refresh()
    }
  }

  async function removeTimeSlot(index: number) {
    const newSlots = timeSlots.filter((_, i) => i !== index)
    setTimeSlots(newSlots)
    await updateTimeSlots(scholiumId, newSlots)
    router.refresh()
  }

  function startEditingSlots() {
    setEditingSlots(true)
    setTempSlots(timeSlots) // Copy current time slots to tempSlots when editing starts
  }

  function cancelEditingSlots() {
    setEditingSlots(false)
  }

  async function saveTimeSlots() {
    setTimeSlots(tempSlots)
    setEditingSlots(false)
    await updateTimeSlots(scholiumId, tempSlots)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get the week dates (Monday to Sunday)
  const weekDates = useMemo(() => {
    const dates: Date[] = []
    const start = new Date(currentDate)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)

    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [currentDate])

  const homeworkByDateAndTime = useMemo(() => {
    const grouped: Record<string, Record<string, Homework[]>> = {}

    homework.forEach((hw) => {
      const dateKey = new Date(hw.due_date).toISOString().split("T")[0]

      if (!grouped[dateKey]) {
        grouped[dateKey] = {}
      }

      // Find matching time slot or use "unscheduled"
      let slotKey = "unscheduled"
      if (hw.start_time) {
        const hwStart = hw.start_time.substring(0, 5)
        slotKey = hwStart
      }

      if (!grouped[dateKey][slotKey]) {
        grouped[dateKey][slotKey] = []
      }
      grouped[dateKey][slotKey].push(hw)
    })

    return grouped
  }, [homework])

  function navigateWeek(direction: number) {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + direction * 7)
    setCurrentDate(newDate)
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  async function handleToggleComplete(id: number) {
    await toggleHomeworkCompletion(id)
    router.refresh()
  }

  async function handleDelete(id: number) {
    if (confirm("Are you sure you want to delete this homework?")) {
      await deleteHomework(id)
      router.refresh()
    }
  }

  function formatMonthYear(dates: Date[]) {
    const firstMonth = dates[0].toLocaleDateString("en-US", { month: "long", year: "numeric" })
    const lastMonth = dates[6].toLocaleDateString("en-US", { month: "long", year: "numeric" })
    if (firstMonth === lastMonth) return firstMonth
    return `${dates[0].toLocaleDateString("en-US", { month: "short" })} - ${dates[6].toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
  }

  function isToday(date: Date) {
    return date.toDateString() === today.toDateString()
  }

  function formatTime(time: string | null) {
    if (!time) return ""
    return time.substring(0, 5)
  }

  const activeTimeSlots = useMemo(() => {
    return timeSlots.map(slot => slot.start).sort()
  }, [timeSlots])

  const hasUnscheduled = useMemo(() => {
    return weekDates.some((date) => {
      const dateKey = date.toISOString().split("T")[0]
      return homeworkByDateAndTime[dateKey]?.["unscheduled"]?.length > 0
    })
  }, [weekDates, homeworkByDateAndTime])

  return (
    <div className="space-y-4">
      {/* Calendar navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-foreground">{formatMonthYear(weekDates)}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header row with days */}
        <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b bg-muted/50">
          <div className="p-3 border-r font-medium text-sm text-muted-foreground">Time</div>
          {weekDates.map((date, idx) => {
            const isCurrentDay = isToday(date)
            return (
              <div
                key={idx}
                className={cn("p-3 text-center border-r last:border-r-0", isCurrentDay && "bg-primary/10")}
              >
                <div className="text-xs text-muted-foreground">{DAYS_SHORT[idx]}</div>
                <div
                  className={cn(
                    "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold mt-1",
                    isCurrentDay && "bg-primary text-primary-foreground",
                  )}
                >
                  {date.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Time slot rows */}
        {timeSlots.map((slot, slotIndex) => {
          return (
            <div 
              key={slotIndex} 
              className="grid grid-cols-[180px_repeat(7,1fr)] border-b last:border-b-0"
            >
              {/* Time column */}
              <div 
                className="p-2 border-r bg-muted/30 flex items-center justify-between gap-2 group relative"
                onMouseEnter={() => !editingField && setHoveredSlot(slotIndex)}
                onMouseLeave={() => !editingField && setHoveredSlot(null)}
              >
                {isHost ? (
                  <div className="flex items-center gap-2 w-full">
                    {editingField?.index === slotIndex && editingField?.field === 'start' ? (
                      <Input
                        type="text"
                        value={slot.start}
                        onChange={(e) => {
                          const formatted = formatTimeInput(e.target.value)
                          const newSlots = [...timeSlots]
                          newSlots[slotIndex] = { ...newSlots[slotIndex], start: formatted }
                          setTimeSlots(newSlots)
                        }}
                        onBlur={(e) => {
                          updateSlotTime(slotIndex, 'start', e.target.value, editingField.previousValue)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateSlotTime(slotIndex, 'start', e.currentTarget.value, editingField.previousValue)
                          }
                        }}
                        placeholder="HH:MM"
                        maxLength={5}
                        autoFocus
                        className="h-8 text-sm w-20 font-mono"
                      />
                    ) : (
                      <span 
                        className="text-sm font-mono font-medium text-muted-foreground cursor-pointer hover:text-foreground px-2 py-1 rounded hover:bg-background transition-colors min-w-[3rem]"
                        onClick={() => setEditingField({ index: slotIndex, field: 'start', previousValue: slot.start })}
                      >
                        {slot.start}
                      </span>
                    )}
                    <span className="text-sm font-mono">-</span>
                    {editingField?.index === slotIndex && editingField?.field === 'end' ? (
                      <Input
                        type="text"
                        value={slot.end}
                        onChange={(e) => {
                          const formatted = formatTimeInput(e.target.value)
                          const newSlots = [...timeSlots]
                          newSlots[slotIndex] = { ...newSlots[slotIndex], end: formatted }
                          setTimeSlots(newSlots)
                        }}
                        onBlur={(e) => {
                          updateSlotTime(slotIndex, 'end', e.target.value, editingField.previousValue)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateSlotTime(slotIndex, 'end', e.currentTarget.value, editingField.previousValue)
                          }
                        }}
                        placeholder="HH:MM"
                        maxLength={5}
                        autoFocus
                        className="h-8 text-sm w-20 font-mono"
                      />
                    ) : (
                      <span 
                        className="text-sm font-mono font-medium text-muted-foreground cursor-pointer hover:text-foreground px-2 py-1 rounded hover:bg-background transition-colors min-w-[3rem]"
                        onClick={() => setEditingField({ index: slotIndex, field: 'end', previousValue: slot.end })}
                      >
                        {slot.end}
                      </span>
                    )}
                    {isHost && hoveredSlot === slotIndex && !editingField && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeTimeSlot(slotIndex)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {slot.start} - {slot.end}
                  </span>
                )}
              </div>

              {/* Day cells */}
              {weekDates.map((date, dayIdx) => {
                const dateKey = date.toISOString().split("T")[0]
                const cellHomework = homeworkByDateAndTime[dateKey]?.[slot.start] || []
                const isCurrentDay = isToday(date)

                return (
                  <div
                    key={dayIdx}
                    className={cn("p-1.5 border-r last:border-r-0 min-h-[80px]", isCurrentDay && "bg-primary/5")}
                  >
                    {cellHomework.map((hw) => (
                      <HomeworkCard
                        key={hw.id}
                        homework={hw}
                        onToggleComplete={handleToggleComplete}
                        onEdit={() => setEditingHomework(hw)}
                        onDelete={handleDelete}
                        canAddHomework={canAddHomework}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* Add new slot button */}
        {isHost && timeSlots.length < 10 && (
          <div className="border-t p-2 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer" onClick={addTimeSlot}>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Plus className="h-4 w-4" />
              <span>Add Row</span>
            </div>
          </div>
        )}

        {/* Unscheduled row */}
        {hasUnscheduled && (
          <div className="grid grid-cols-[180px_repeat(7,1fr)] border-t">
            <div className="p-2 border-r bg-muted/30 flex items-start justify-center">
              <span className="text-xs font-medium text-muted-foreground">No Time Set</span>
            </div>
            {weekDates.map((date, dayIdx) => {
              const dateKey = date.toISOString().split("T")[0]
              const cellHomework = homeworkByDateAndTime[dateKey]?.["unscheduled"] || []
              const isCurrentDay = isToday(date)

              return (
                <div
                  key={dayIdx}
                  className={cn("p-1.5 border-r last:border-r-0 min-h-[60px]", isCurrentDay && "bg-primary/5")}
                >
                  {!editingSlots && cellHomework.map((hw) => (
                    <HomeworkCard
                      key={hw.id}
                      homework={hw}
                      onToggleComplete={handleToggleComplete}
                      onEdit={() => setEditingHomework(hw)}
                      onDelete={handleDelete}
                      canAddHomework={canAddHomework}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {activeTimeSlots.length === 0 && !hasUnscheduled && (
          <div className="p-8 text-center text-muted-foreground">No homework scheduled for this week</div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox checked className="h-3 w-3" disabled />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Type
          </Badge>
          <span>Homework Type</span>
        </div>
      </div>

      {editingHomework && (
        <EditHomeworkDialog
          open={!!editingHomework}
          onOpenChange={(open) => !open && setEditingHomework(null)}
          homework={editingHomework}
          subjects={subjects}
          scholiumId={scholiumId}
        />
      )}
    </div>
  )
}

interface HomeworkCardProps {
  homework: Homework
  onToggleComplete: (id: number) => void
  onEdit: () => void
  onDelete: (id: number) => void
  canAddHomework: boolean
}

function HomeworkCard({ homework, onToggleComplete, onEdit, onDelete, canAddHomework }: HomeworkCardProps) {
  const hw = homework

  return (
    <div
      className={cn(
        "group relative p-2 rounded-md text-xs mb-1.5 transition-all",
        hw.completed ? "bg-muted/50 border border-muted" : "border shadow-sm hover:shadow-md",
      )}
      style={{
        backgroundColor: hw.completed ? undefined : hw.subject_color ? `${hw.subject_color}15` : "hsl(var(--card))",
        borderColor: hw.subject_color || "hsl(var(--border))",
      }}
    >
      {/* Subject name as title */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <h4
          className={cn("font-bold text-sm leading-tight", hw.completed && "line-through text-muted-foreground")}
          style={{ color: hw.completed ? undefined : hw.subject_color }}
        >
          {hw.subject_name || "General"}
        </h4>
        <div className="flex items-center gap-1 shrink-0">
          <Checkbox checked={hw.completed} onCheckedChange={() => onToggleComplete(hw.id)} className="h-3.5 w-3.5" />
          {canAddHomework && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-3 w-3" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(hw.id)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Homework title */}
      <p className={cn("font-medium leading-tight mb-1.5", hw.completed && "line-through text-muted-foreground")}>
        {hw.title}
      </p>

      {/* Time display */}
      {(hw.start_time || hw.end_time) && (
        <div className="text-[10px] text-muted-foreground mb-1">
          {hw.start_time?.substring(0, 5)} - {hw.end_time?.substring(0, 5)}
        </div>
      )}

      {/* Homework type tag */}
      {hw.homework_type && (
        <Badge variant="outline" className="text-xs">
          {hw.homework_type.charAt(0).toUpperCase() + hw.homework_type.slice(1)}
        </Badge>
      )}
    </div>
  )
}

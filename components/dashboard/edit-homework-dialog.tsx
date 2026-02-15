"use client"

import { useState, useRef, useEffect } from "react"
import type { Homework, Subject } from "@/lib/db"
import { HOMEWORK_TYPES } from "@/lib/db"
import { updateHomework } from "@/app/actions/homework"
import { getTimeSlots } from "@/app/actions/scholium"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface EditHomeworkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  homework: Homework
  subjects: Subject[]
  scholiumId: number
}

export function EditHomeworkDialog({ open, onOpenChange, homework, subjects, scholiumId }: EditHomeworkDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeSlots, setTimeSlots] = useState<Array<{ start: string; end: string }>>([])
  const [selectedStartTime, setSelectedStartTime] = useState<string>(homework.start_time || "")
  const [selectedEndTime, setSelectedEndTime] = useState<string>(homework.end_time || "")
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    if (open) {
      loadTimeSlots()
      setSelectedStartTime(homework.start_time || "")
      setSelectedEndTime(homework.end_time || "")
    }
  }, [open, homework])

  async function loadTimeSlots() {
    const slots = await getTimeSlots(scholiumId)
    setTimeSlots(slots)
  }

  function handleStartTimeChange(value: string) {
    setSelectedStartTime(value)
    // Find the matching time slot and auto-fill end time
    const slot = timeSlots.find(s => s.start === value)
    if (slot) {
      setSelectedEndTime(slot.end)
    }
  }

  async function handleSubmit(formData: FormData) {
    if (isSubmittingRef.current) return

    isSubmittingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const result = await updateHomework(homework.id, formData)

      if (result?.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
      }
    } finally {
      setLoading(false)
      isSubmittingRef.current = false
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setError(null)
      isSubmittingRef.current = false
    }
    onOpenChange(open)
  }

  const dueDate = new Date(homework.due_date).toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Homework</DialogTitle>
          <DialogDescription>Update the homework assignment details.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" name="title" defaultValue={homework.title} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea id="edit-description" name="description" defaultValue={homework.description || ""} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-subject_id">Subject</Label>
                <Select name="subject_id" defaultValue={homework.subject_id?.toString() || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-homework_type">Homework Type</Label>
                <Select name="homework_type" defaultValue={homework.homework_type || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOMEWORK_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-due_date">Due Date</Label>
              <Input id="edit-due_date" name="due_date" type="date" defaultValue={dueDate} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject_time">Subject Time (optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time" className="text-xs text-muted-foreground">Start</Label>
                  <Select 
                    name="start_time" 
                    value={selectedStartTime} 
                    onValueChange={handleStartTimeChange}
                    disabled={timeSlots.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot, idx) => (
                        <SelectItem key={idx} value={slot.start}>
                          {slot.start}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time" className="text-xs text-muted-foreground">End</Label>
                  <Input 
                    id="end_time" 
                    name="end_time" 
                    value={selectedEndTime}
                    readOnly
                    className="bg-muted"
                    placeholder="Auto-filled"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {timeSlots.length === 0 ? 'No time slots available' : 'Select start time, end time will be auto-filled'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

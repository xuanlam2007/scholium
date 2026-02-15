"use client"

import { useState, useRef, useEffect } from "react"
import type { Subject } from "@/lib/db"
import { HOMEWORK_TYPES } from "@/lib/db"
import { createHomework } from "@/app/actions/homework"
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

interface AddHomeworkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Subject[]
  scholiumId: number
}

export function AddHomeworkDialog({ open, onOpenChange, subjects, scholiumId }: AddHomeworkDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [timeSlots, setTimeSlots] = useState<Array<{ start: string; end: string }>>([])
  const [selectedStartTime, setSelectedStartTime] = useState<string>("")
  const [selectedEndTime, setSelectedEndTime] = useState<string>("")
  const isSubmittingRef = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (open) {
      loadTimeSlots()
    }
  }, [open])

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
    if (isSubmittingRef.current) {
      return
    }

    isSubmittingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const result = await createHomework(formData)

      if (result?.error) {
        setError(result.error)
      } else {
        formRef.current?.reset()
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Homework</DialogTitle>
          <DialogDescription>Create a new homework assignment for students to see.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="e.g., Chapter 5 Exercises" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Add details about the assignment..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject_id">Subject</Label>
                <Select name="subject_id">
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
                <Label htmlFor="homework_type">Homework Type</Label>
                <Select name="homework_type">
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
              <Label htmlFor="due_date">Due Date</Label>
              <Input 
                id="due_date" 
                name="due_date" 
                type="date" 
                required 
                onChange={(e) => setSelectedDate(e.target.value)}
              />
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
                    disabled={!selectedDate || timeSlots.length === 0}
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
                {!selectedDate ? 'Select due date first' : timeSlots.length === 0 ? 'No time slots available' : 'Select start time, end time will be auto-filled'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Homework
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

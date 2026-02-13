'use client'

import { useState } from 'react'
import { updateTimeSlots, getTimeSlots } from '@/app/actions/scholium'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Plus, Trash2, Loader2 } from 'lucide-react'

interface TimeSlotsEditorProps {
  scholiumId: number
  isHost: boolean
}

export function TimeSlotsEditor({ scholiumId, isHost }: TimeSlotsEditorProps) {
  const [slots, setSlots] = useState<Array<{ start: string; end: string }>>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  async function loadTimeSlots() {
    setLoading(true)
    const timeSlots = await getTimeSlots(scholiumId)
    setSlots(timeSlots)
    setLoading(false)
  }

  function updateSlot(index: number, field: 'start' | 'end', value: string) {
    const newSlots = [...slots]
    newSlots[index] = { ...newSlots[index], [field]: value }
    setSlots(newSlots)
  }

  function addSlot() {
    if (slots.length < 10) {
      let newStart = "07:00"
      let newEnd = "07:45"
      console.log('Current slots:', slots)
      
      if (slots.length > 0) {
        const lastSlot = slots[slots.length - 1]
        console.log('Last slot:', lastSlot)
        
        const [lastEndHour, lastEndMinute] = lastSlot.end.split(':').map(Number)
        console.log('Last end time:', lastEndHour, ':', lastEndMinute)
        
        // Add 15-minute break
        let startMinutes = lastEndHour * 60 + lastEndMinute + 15
        let endMinutes = startMinutes + 45
        
        console.log('Calculated start minutes:', startMinutes, 'end minutes:', endMinutes)
        
        // Convert back to HH:MM format
        const startHour = Math.floor(startMinutes / 60)
        const startMinute = startMinutes % 60
        const endHour = Math.floor(endMinutes / 60)
        const endMinute = endMinutes % 60
        
        newStart = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`
        newEnd = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
        
        console.log('New time slot:', newStart, '-', newEnd)
      }
      
      setSlots([...slots, { start: newStart, end: newEnd }])
    }
  }

  function removeSlot(index: number) {
    if (slots.length > 4) {
      setSlots(slots.filter((_, i) => i !== index))
    }
  }

  async function handleSave() {
    setSaving(true)
    const result = await updateTimeSlots(scholiumId, slots)
    setSaving(false)
    if (result.success) {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 bg-transparent"
          disabled={!isHost}
          onClick={loadTimeSlots}
        >
          <Clock className="h-4 w-4" />
          Time Slots
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Time Slots</DialogTitle>
          <DialogDescription>
            Manage class time slots (minimum 4, maximum 10). You can only edit the hour and minute numbers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            slots.map((slot, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center gap-2">
                      <label className="text-sm font-medium">Start:</label>
                      <Input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateSlot(index, 'start', e.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <label className="text-sm font-medium">End:</label>
                      <Input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateSlot(index, 'end', e.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                    {slots.length > 4 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlot(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex gap-2">
          {slots.length < 10 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSlot}
              className="bg-transparent"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Slot
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || slots.length < 4 || slots.length > 10}
            className="ml-auto"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Time Slots
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

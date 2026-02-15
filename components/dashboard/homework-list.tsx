"use client"

import { useState } from "react"
import type { Homework, Subject } from "@/lib/db"
import { toggleHomeworkCompletion, deleteHomework } from "@/app/actions/homework"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar, MoreVertical, Pencil, Trash2, Paperclip } from "lucide-react"
import { EditHomeworkDialog } from "./edit-homework-dialog"
import { AttachmentsDialog } from "./attachments-dialog"
import { cn } from "@/lib/utils"

interface HomeworkListProps {
  homework: Homework[]
  subjects: Subject[]
  canAddHomework: boolean
  scholiumId: number
}

export function HomeworkList({ homework, subjects, canAddHomework, scholiumId }: HomeworkListProps) {
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null)
  const [viewingAttachments, setViewingAttachments] = useState<Homework | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const groupedHomework = homework.reduce(
    (acc, hw) => {
      const dueDate = new Date(hw.due_date)
      dueDate.setHours(0, 0, 0, 0)

      if (hw.completed) {
        acc.completed.push(hw)
      } else if (dueDate < today) {
        acc.overdue.push(hw)
      } else if (dueDate.getTime() === today.getTime()) {
        acc.today.push(hw)
      } else {
        acc.upcoming.push(hw)
      }
      return acc
    },
    { overdue: [], today: [], upcoming: [], completed: [] } as Record<string, Homework[]>,
  )

  async function handleToggleComplete(id: number) {
    await toggleHomeworkCompletion(id)
  }

  async function handleDelete(id: number) {
    if (confirm("Are you sure you want to delete this homework?")) {
      await deleteHomework(id)
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  function getDaysUntilDue(dateStr: string) {
    const due = new Date(dateStr)
    due.setHours(0, 0, 0, 0)
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return "Today"
    if (diff === 1) return "Tomorrow"
    if (diff < 0) return `${Math.abs(diff)} days overdue`
    return `${diff} days left`
  }

  const HomeworkItem = ({ hw }: { hw: Homework }) => {
    const isOverdue = new Date(hw.due_date) < today && !hw.completed

    return (
      <div
        className={cn(
          "flex items-start gap-4 p-4 rounded-lg border border-border bg-card transition-colors hover:bg-muted/50",
          hw.completed && "opacity-60",
        )}
      >
        <Checkbox checked={hw.completed} onCheckedChange={() => handleToggleComplete(hw.id)} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h4 className={cn("font-medium text-foreground", hw.completed && "line-through text-muted-foreground")}>
                {hw.title}
              </h4>
              {hw.description && <p className="text-sm text-muted-foreground line-clamp-2">{hw.description}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                {hw.subject_name && (
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: hw.subject_color ? `${hw.subject_color}20` : undefined,
                      color: hw.subject_color || undefined,
                      borderColor: hw.subject_color || undefined,
                    }}
                    className="border"
                  >
                    {hw.subject_name}
                  </Badge>
                )}
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    isOverdue ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {formatDate(hw.due_date)} • {getDaysUntilDue(hw.due_date)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingAttachments(hw)}>
                <Paperclip className="h-4 w-4" />
              </Button>
              {canAddHomework && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingHomework(hw)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(hw.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groupedHomework.overdue.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-destructive flex items-center gap-2">
              Overdue
              <Badge variant="destructive">{groupedHomework.overdue.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedHomework.overdue.map((hw) => (
              <HomeworkItem key={hw.id} hw={hw} />
            ))}
          </CardContent>
        </Card>
      )}

      {groupedHomework.today.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-amber-600 dark:text-amber-500 flex items-center gap-2">
              Due Today
              <Badge className="bg-amber-500">{groupedHomework.today.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedHomework.today.map((hw) => (
              <HomeworkItem key={hw.id} hw={hw} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            Upcoming
            <Badge variant="secondary">{groupedHomework.upcoming.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {groupedHomework.upcoming.length > 0 ? (
            groupedHomework.upcoming.map((hw) => <HomeworkItem key={hw.id} hw={hw} />)
          ) : (
            <p className="text-muted-foreground text-center py-8">No upcoming homework. Enjoy your free time!</p>
          )}
        </CardContent>
      </Card>

      {groupedHomework.completed.length > 0 && (
        <Card className="border-green-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-green-600 dark:text-green-500 flex items-center gap-2">
              Completed
              <Badge className="bg-green-500">{groupedHomework.completed.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedHomework.completed.map((hw) => (
              <HomeworkItem key={hw.id} hw={hw} />
            ))}
          </CardContent>
        </Card>
      )}

      {editingHomework && (
        <EditHomeworkDialog
          open={!!editingHomework}
          onOpenChange={(open) => !open && setEditingHomework(null)}
          homework={editingHomework}
          subjects={subjects}
          scholiumId={scholiumId}
        />
      )}

      {viewingAttachments && (
        <AttachmentsDialog
          open={!!viewingAttachments}
          onOpenChange={(open) => !open && setViewingAttachments(null)}
          homework={viewingAttachments}
          canAddHomework={canAddHomework}
        />
      )}
    </div>
  )
}

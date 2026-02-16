"use client"

import { useState } from "react"
import type { Subject } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, CalendarDays, List } from "lucide-react"
import { AddHomeworkDialog } from "./add-homework-dialog"
import { SubjectManager } from "./subject-manager"
import { MemberPermissionsManager } from "./member-permissions-manager"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ScholiumMember } from "@/lib/scholium"

interface HomeworkFiltersProps {
  subjects: Subject[]
  canAddHomework: boolean
  canCreateSubject: boolean
  isHost: boolean
  scholiumId: number
  members: (ScholiumMember & { user_name: string; user_email: string })[]
  viewMode: "list" | "timetable"
  onViewModeChange: (mode: "list" | "timetable") => void
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedSubject: string
  onSubjectChange: (subject: string) => void
  onSubjectsChange?: () => void
}

export function HomeworkFilters({
  subjects,
  canAddHomework,
  canCreateSubject,
  isHost,
  scholiumId,
  members,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  selectedSubject,
  onSubjectChange,
  onSubjectsChange,
}: HomeworkFiltersProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-1 gap-3 w-full sm:w-auto flex-wrap">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search homework..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Select value={selectedSubject} onValueChange={onSubjectChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id.toString()}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && onViewModeChange(v as "list" | "timetable")}
        >
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="timetable" aria-label="Timetable view">
            <CalendarDays className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex gap-2 flex-wrap">
        {canAddHomework && (
          <>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Homework
            </Button>
            <AddHomeworkDialog open={dialogOpen} onOpenChange={setDialogOpen} subjects={subjects} scholiumId={scholiumId} />
          </>
        )}

        <SubjectManager 
          subjects={subjects} 
          canManageSubjects={canCreateSubject}
          onSubjectsChange={onSubjectsChange}
        />
        {isHost && (
          <MemberPermissionsManager
            scholiumId={scholiumId}
            members={members}
            isHost={isHost}
          />
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useMemo } from "react"
import type { Homework, Subject } from "@/lib/db"
import type { ScholiumMember } from "@/lib/scholium"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import { HomeworkFilters } from "./homework-filters"
import { HomeworkList } from "./homework-list"
import { HomeworkTimetable } from "./homework-timetable"

interface HomeworkContentProps {
  homework: Homework[]
  subjects: Subject[]
  canAddHomework: boolean
  canCreateSubject: boolean
  isHost: boolean
  scholiumId: number
  currentUserId: string
  members: (ScholiumMember & { user_name: string; user_email: string })[]
  onSubjectsChange?: () => void
}

export function HomeworkContent({ 
  homework, 
  subjects, 
  canAddHomework, 
  canCreateSubject,
  isHost,
  scholiumId,
  currentUserId,
  members,
  onSubjectsChange,
}: HomeworkContentProps) {
  // Enable real-time updates and member check (redirects if kicked)
  useRealtimeRefresh(scholiumId, currentUserId)

  const [viewMode, setViewMode] = useState<"list" | "timetable">("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("all")

  // Filter homework based on search and subject
  const filteredHomework = useMemo(() => {
    return homework.filter((hw) => {
      const matchesSearch =
        searchQuery === "" ||
        hw.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hw.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesSubject = selectedSubject === "all" || hw.subject_id?.toString() === selectedSubject

      return matchesSearch && matchesSubject
    })
  }, [homework, searchQuery, selectedSubject])

  return (
    <div className="space-y-6">
      <HomeworkFilters
        subjects={subjects}
        canAddHomework={canAddHomework}
        canCreateSubject={canCreateSubject}
        isHost={isHost}
        scholiumId={scholiumId}
        members={members}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSubject={selectedSubject}
        onSubjectChange={setSelectedSubject}
        onSubjectsChange={onSubjectsChange}
      />

      {viewMode === "list" ? (
        <HomeworkList homework={filteredHomework} subjects={subjects} canAddHomework={canAddHomework} scholiumId={scholiumId} />
      ) : (
        <HomeworkTimetable 
          homework={filteredHomework} 
          subjects={subjects} 
          canAddHomework={canAddHomework}
          isHost={isHost}
          scholiumId={scholiumId}
        />
      )}
    </div>
  )
}

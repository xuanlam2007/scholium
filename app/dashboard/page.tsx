import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getHomework, getSubjects, getUpcomingDeadlines } from "@/app/actions/homework"
import { getCurrentScholiumId, getScholiumMembers, getScholiumDetails } from "@/app/actions/scholium"
import { DashboardHeader } from "@/components/dashboard/header"
import { HomeworkContent } from "@/components/dashboard/homework-content"
import { UpcomingReminders } from "@/components/dashboard/upcoming-reminders"
// ParticipantsSection with isHost prop for member management
import { ParticipantsSection } from "@/components/dashboard/participants-section"
import { ScholiumSettings } from "@/components/dashboard/scholium-settings"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getSession()

  if (!user) {
    redirect("/login")
  }

  if (user.role === "admin") {
    redirect("/admin")
  }

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) {
    redirect("/scholiums")
  }

  const [homework, subjects, upcomingDeadlines, members, scholiumDetailsResult] = await Promise.all([
    getHomework(),
    getSubjects(),
    getUpcomingDeadlines(),
    getScholiumMembers(scholiumId),
    getScholiumDetails(scholiumId),
  ])

  const scholiumDetails = scholiumDetailsResult.success ? scholiumDetailsResult.data : null

  // Check if user is a member and if they're a host
  const userMember = members.find((m) => m.user_id === user.id)
  const canAddHomework = userMember?.is_host || userMember?.can_add_homework || false
  const canCreateSubject = userMember?.is_host || userMember?.can_create_subject || false
  const isHost = !!userMember && userMember.is_host

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} scholiumId={scholiumId} />
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <HomeworkContent 
              homework={homework} 
              subjects={subjects} 
              canAddHomework={canAddHomework}
              canCreateSubject={canCreateSubject}
              isHost={isHost}
              scholiumId={scholiumId}
              currentUserId={user.id}
              members={members}
            />
          </div>
          <aside className="space-y-6">
            <UpcomingReminders deadlines={upcomingDeadlines} />
            <ParticipantsSection 
              scholiumId={scholiumId}
              members={members} 
              currentUserId={user.id}
              isHost={isHost} 
            />
            {scholiumDetails && (
              <ScholiumSettings
                scholiumId={scholiumId}
                scholiumName={scholiumDetails.name}
                accessId={scholiumDetails.accessId}
                members={members}
                currentUserId={user.id}
                isHost={isHost}
              />
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}

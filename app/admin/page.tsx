import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getAllUsers } from "@/app/actions/admin"
import { getAllScholiums } from "@/app/actions/admin"
import { getAdminStats } from "@/app/actions/admin"
import { DashboardHeader } from "@/components/dashboard/header"
import { AdminTabs } from "@/components/admin/admin-tabs"
import { StatsCards } from "@/components/admin/stats-cards"

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const user = await getSession()

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "admin") {
    redirect("/scholiums")
  }

  const [users, scholiums, stats] = await Promise.all([getAllUsers(), getAllScholiums(), getAdminStats()])

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} scholiumId={0} />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users and scholiums</p>
        </div>

        <StatsCards stats={stats} />
        <AdminTabs users={users} scholiums={scholiums} currentUserId={user.id} />
      </main>
    </div>
  )
}

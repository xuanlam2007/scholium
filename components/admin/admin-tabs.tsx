"use client"

import type { User } from "@/lib/db"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersManagement } from "./users-management"
import { ScholiumsManagement } from "./scholiums-management"

interface AdminTabsProps {
  users: User[]
  scholiums: any[]
  currentUserId: string
}

export function AdminTabs({ users, scholiums, currentUserId }: AdminTabsProps) {
  return (
    <Tabs defaultValue="users" className="space-y-4">
      <TabsList>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="scholiums">Scholiums</TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="space-y-4">
        <UsersManagement users={users} currentUserId={currentUserId} />
      </TabsContent>

      <TabsContent value="scholiums" className="space-y-4">
        <ScholiumsManagement scholiums={scholiums} />
      </TabsContent>
    </Tabs>
  )
}

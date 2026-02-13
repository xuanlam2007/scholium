'use client'

import { useState } from 'react'
import { updateMemberPermissionsAsHost, removeScholiumMemberAsHost } from '@/app/actions/scholium'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Users, Settings2, X } from 'lucide-react'
import type { ScholiumMember } from '@/lib/scholium'
import { useRouter } from 'next/navigation'

interface MemberPermissionsManagerProps {
  scholiumId: number
  members: (ScholiumMember & { user_name: string; user_email: string })[]
  isHost: boolean
  onPermissionsChange?: () => void
}

export function MemberPermissionsManager({
  scholiumId,
  members: initialMembers,
  isHost,
  onPermissionsChange,
}: MemberPermissionsManagerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [members, setMembers] = useState(initialMembers)
  const [updating, setUpdating] = useState<number | null>(null)

  // Update local state when props change
  useState(() => {
    setMembers(initialMembers)
  })

  async function handleTogglePermission(memberId: number, field: 'can_add_homework' | 'can_create_subject', currentValue: boolean) {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    const updated = {
      can_add_homework: field === 'can_add_homework' ? !currentValue : (member as any).can_add_homework,
      can_create_subject: field === 'can_create_subject' ? !currentValue : (member as any).can_create_subject,
    }

    // Optimistically update local state
    setMembers(prev => prev.map(m => 
      m.id === memberId 
        ? { ...m, [field]: !currentValue } as typeof m
        : m
    ))

    setUpdating(memberId)
    const result = await updateMemberPermissionsAsHost(memberId, updated)
    setUpdating(null)

    if (result.success) {
      router.refresh()
      onPermissionsChange?.()
    } else {
      // Revert on failure
      setMembers(initialMembers)
    }
  }

  async function handleRemoveMember(memberId: number) {
    setRemovingId(memberId)
    const result = await removeScholiumMemberAsHost(memberId)
    if (result.success) {
      router.refresh()
      setOpen(false)
    }
    setRemovingId(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-transparent"
          disabled={!isHost}
        >
          <Users className="h-4 w-4" />
          Manage Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Member Permissions</DialogTitle>
          <DialogDescription>
            Manage what permissions each member has in this scholium.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 overflow-y-auto pr-2">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{member.user_name}</p>
                    <p className="text-sm text-muted-foreground truncate">{member.user_email}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
                      {member.is_host ? 'Host' : 'Member'}
                    </div>
                    
                    {!member.is_host && (
                      <>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64" align="end">
                            <div className="space-y-4">
                              <h4 className="font-medium text-sm">Permissions</h4>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label htmlFor={`homework-${member.id}`} className="text-sm">
                                    Can Add Homework
                                  </Label>
                                  <Switch
                                    id={`homework-${member.id}`}
                                    checked={(member as any).can_add_homework}
                                    onCheckedChange={() => handleTogglePermission(member.id, 'can_add_homework', (member as any).can_add_homework)}
                                    disabled={updating === member.id}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor={`subject-${member.id}`} className="text-sm">
                                    Can Create Subject
                                  </Label>
                                  <Switch
                                    id={`subject-${member.id}`}
                                    checked={(member as any).can_create_subject}
                                    onCheckedChange={() => handleTogglePermission(member.id, 'can_create_subject', (member as any).can_create_subject)}
                                    disabled={updating === member.id}
                                  />
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removingId === member.id}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

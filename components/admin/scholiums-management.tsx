'use client'

import { useState } from 'react'
import { deleteScholium, getScholiumMembers, removeScholiumMember, updateScholiumMemberPermissions } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, Users, Settings, Crown, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface ScholiumsManagementProps {
  scholiums: any[]
}

export function ScholiumsManagement({ scholiums: initialScholiums }: ScholiumsManagementProps) {
  const [scholiums, setScholiums] = useState(initialScholiums)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewMembersId, setViewMembersId] = useState<number | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null)

  async function handleDelete(id: number) {
    setDeleting(true)
    const result = await deleteScholium(id)
    if (result.success) {
      setScholiums(scholiums.filter(t => t.id !== id))
    }
    setDeleting(false)
    setDeleteId(null)
  }

  async function handleViewMembers(scholiumId: number) {
    setViewMembersId(scholiumId)
    setLoadingMembers(true)
    const membersList = await getScholiumMembers(scholiumId)
    setMembers(membersList as any[])
    setLoadingMembers(false)
  }

  async function handleRemoveMember(memberId: number) {
    setRemovingMemberId(memberId)
    const result = await removeScholiumMember(memberId)
    if (result.success) {
      setMembers(members.filter(m => m.id !== memberId))
    }
    setRemovingMemberId(null)
  }

  async function handleTogglePermission(memberId: number, field: 'can_add_homework' | 'can_create_subject', value: boolean) {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    const updatedPermissions = {
      can_add_homework: field === 'can_add_homework' ? value : member.can_add_homework,
      can_create_subject: field === 'can_create_subject' ? value : member.can_create_subject,
    }

    await updateScholiumMemberPermissions(memberId, updatedPermissions)
    
    setMembers(members.map(m => 
      m.id === memberId 
        ? { ...m, [field]: value }
        : m
    ))
  }

  return (
    <div className="space-y-4">
      {scholiums.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No scholiums yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scholiums.map((scholium) => (
            <Card key={scholium.id} className="hover:border-primary transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{scholium.name}</CardTitle>
                    <CardDescription className="text-sm">
                      Created by {scholium.creator_name} ({scholium.creator_email})
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-sm ml-2">
                    <Users className="h-3 w-3" />
                    <span>{scholium.member_count}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(scholium.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewMembers(scholium.id)}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    View Members
                  </Button>
                  <AlertDialog open={deleteId === scholium.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(scholium.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Scholium</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{scholium.name}"? All associated data will be permanently removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-2 justify-end">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDelete(scholium.id)}
                        disabled={deleting}
                        className="bg-destructive"
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
            <Dialog open={!!viewMembersId} onOpenChange={(open) => !open && setViewMembersId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scholium Members</DialogTitle>
            <DialogDescription>
              View and manage members of {scholiums.find(s => s.id === viewMembersId)?.name}
            </DialogDescription>
          </DialogHeader>
          
          {loadingMembers ? (
            <div className="py-8 text-center text-muted-foreground">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No members in this scholium</div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{member.user_name}</span>
                              {member.is_host && (
                                <span className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                  <Crown className="h-3 w-3" />
                                  Host
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{member.user_email}</div>
                          </div>
                        </div>

                        {!member.is_host && (
                          <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`add-homework-${member.id}`} className="text-sm">Can Add Homework</Label>
                              <Switch
                                id={`add-homework-${member.id}`}
                                checked={member.can_add_homework}
                                onCheckedChange={(checked) => handleTogglePermission(member.id, 'can_add_homework', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`create-subject-${member.id}`} className="text-sm">Can Create Subject</Label>
                              <Switch
                                id={`create-subject-${member.id}`}
                                checked={member.can_create_subject}
                                onCheckedChange={(checked) => handleTogglePermission(member.id, 'can_create_subject', checked)}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {!member.is_host && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removingMemberId === member.id}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

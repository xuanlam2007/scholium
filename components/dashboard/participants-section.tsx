'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Crown, Shield, UserMinus, LogOut } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import type { ScholiumMember } from '@/lib/scholium'
import { 
  quitScholium, 
  toggleCohost,
  removeScholiumMemberAsHost
} from '@/app/actions/scholium'

interface ParticipantsSectionProps {
  scholiumId: number
  members: (ScholiumMember & {
    user_name: string
    user_email: string
  })[]
  currentUserId: string
  isHost: boolean
}

export function ParticipantsSection({ scholiumId, members, currentUserId, isHost }: ParticipantsSectionProps) {
  const router = useRouter()
  const [quitDialogOpen, setQuitDialogOpen] = useState(false)
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{ id: number; name: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentUserMember = members.find(m => m.user_id === currentUserId)
  const isCohost = currentUserMember?.is_cohost || false
  const canManage = isHost || isCohost

  const hosts = members.filter((m) => m.is_host)
  const cohosts = members.filter((m) => m.is_cohost && !m.is_host)
  const participants = members.filter((m) => !m.is_host && !m.is_cohost)

  const handleQuitScholium = async () => {
    setLoading(true)
    setError(null)
    const result = await quitScholium(scholiumId)
    if (result.success) {
      router.push('/scholiums')
      router.refresh()
    } else {
      setError(result.error || 'Failed to quit scholium')
    }
    setLoading(false)
    setQuitDialogOpen(false)
  }

  const handleToggleCohost = async (memberId: number, currentStatus: boolean) => {
    setLoading(true)
    setError(null)
    const result = await toggleCohost(memberId, !currentStatus)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to update co-host status')
    }
    setLoading(false)
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return
    setLoading(true)
    setError(null)
    const result = await removeScholiumMemberAsHost(memberToRemove.id)
    if (result.success) {
      router.refresh()
      setRemoveMemberDialogOpen(false)
      setMemberToRemove(null)
    } else {
      setError(result.error || 'Failed to remove member')
    }
    setLoading(false)
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </h3>
          <Badge variant="secondary">{members.length}</Badge>
        </div>
        <div className="space-y-3">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}

          {/* Hosts */}
          {hosts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                Host
              </h4>
              <div className="space-y-1">
                {hosts.map((member) => (
                  <div key={member.id} className="p-2 rounded bg-primary/10 border border-primary/20">
                    <p className="text-sm font-medium truncate">{member.user_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.user_email}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Co-hosts */}
          {cohosts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Co-hosts ({cohosts.length})
              </h4>
              <div className="space-y-1">
                {cohosts.map((member) => (
                  <div key={member.id} className="p-2 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.user_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.user_email}</p>
                    </div>
                    {isHost && member.user_id !== currentUserId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleCohost(member.id, true)}
                        disabled={loading}
                        className="ml-2 h-7"
                      >
                        <UserMinus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants */}
          {participants.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                Participants ({participants.length})
              </h4>
              <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-hide">
                {participants.map((member) => (
                  <div key={member.id} className="p-2 rounded hover:bg-muted/50 transition-colors flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.user_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.user_email}</p>
                    </div>
                    {isHost && member.user_id !== currentUserId && (
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleCohost(member.id, false)}
                          disabled={loading}
                          title="Make co-host"
                          className="h-7"
                        >
                          <Shield className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setMemberToRemove({ id: member.id, name: member.user_name })
                            setRemoveMemberDialogOpen(true)
                          }}
                          disabled={loading}
                          title="Remove member"
                          className="h-7 text-destructive hover:text-destructive"
                        >
                          <UserMinus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {members.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No members yet
            </div>
          )}

          {/* Action Buttons */}
          {!isHost && (
            <div className="pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuitDialogOpen(true)}
                disabled={loading}
                className="w-full justify-start text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Quit Scholium
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Quit Scholium Dialog */}
      <AlertDialog open={quitDialogOpen} onOpenChange={setQuitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quit Scholium?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer have access to this scholium's homework and subjects. You can rejoin using the access ID if you change your mind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleQuitScholium} disabled={loading}>
              Quit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={removeMemberDialogOpen} onOpenChange={setRemoveMemberDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {memberToRemove?.name} from this scholium? They will lose access to all homework and subjects and will need the access ID to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} disabled={loading} className="bg-destructive text-white hover:bg-destructive/90 hover:text-white">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

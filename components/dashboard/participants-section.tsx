'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Crown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ScholiumMember } from '@/lib/scholium'

export interface ParticipantsSectionProps {
  members: (ScholiumMember & {
    user_name: string
    user_email: string
  })[]
}

export function ParticipantsSection({ members }: ParticipantsSectionProps) {
  const hosts = members.filter((m) => m.is_host)
  const participants = members.filter((m) => !m.is_host)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </CardTitle>
          <Badge variant="secondary">{members.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Hosts */}
        {hosts.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Crown className="h-3 w-3" />
              Hosts
            </h4>
            <div className="space-y-2">
              {hosts.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.user_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.user_email}</p>
                  </div>
                  <Badge variant="outline" className="ml-2 shrink-0">
                    Host
                  </Badge>
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
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {participants.map((member) => (
                <div key={member.id} className="p-2 rounded hover:bg-muted/50 transition-colors">
                  <p className="text-sm font-medium truncate">{member.user_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.user_email}</p>
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

        {/* View all members dialog */}
        {members.length > 5 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                View all members
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Scholium Members</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {/* Hosts */}
                {hosts.length > 0 && (
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Crown className="h-4 w-4" />
                      Hosts
                    </h4>
                    <div className="space-y-2">
                      {hosts.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 rounded bg-muted/50">
                          <div>
                            <p className="font-medium">{member.user_name}</p>
                            <p className="text-sm text-muted-foreground">{member.user_email}</p>
                          </div>
                          <Badge>Host</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Participants */}
                {participants.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Participants ({participants.length})</h4>
                    <div className="space-y-2">
                      {participants.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 rounded bg-muted/50">
                          <div>
                            <p className="font-medium">{member.user_name}</p>
                            <p className="text-sm text-muted-foreground">{member.user_email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}

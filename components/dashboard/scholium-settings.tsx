'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Settings,
  Copy,
  RotateCw,
  UserCog,
  Trash2,
  FileText,
  Eraser,
  Shield,
  Loader2,
} from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ScholiumMember } from '@/lib/scholium'
import {
  deleteScholium,
  transferHost,
  renewScholiumAccessId,
  renameScholium,
  clearAllScholiumData,
} from '@/app/actions/scholium'
import { useToast } from '@/hooks/use-toast'

interface ScholiumSettingsProps {
  scholiumId: number
  scholiumName: string
  accessId: string
  members: (ScholiumMember & {
    user_name: string
    user_email: string
  })[]
  currentUserId: string
  isHost: boolean
  onSettingsChange?: () => void
}

export function ScholiumSettings({
  scholiumId,
  scholiumName,
  accessId,
  members,
  currentUserId,
  isHost,
  onSettingsChange,
}: ScholiumSettingsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false)
  const [selectedNewHost, setSelectedNewHost] = useState<string>('')
  const [newScholiumName, setNewScholiumName] = useState(scholiumName)
  const [loading, setLoading] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCopyAccessId = async () => {
    await navigator.clipboard.writeText(accessId)
    toast({
      title: 'Access ID copied!',
      description: 'Share this ID with others to invite them.',
    })
  }

  const handleRenewAccessId = async () => {
    setRenewing(true)
    setError(null)
    const result = await renewScholiumAccessId(scholiumId)
    if (result.success) {
      toast({
        title: 'Access ID renewed!',
        description: 'A new access ID has been generated.',
      })
      onSettingsChange?.()
      router.refresh()
    } else {
      setError(result.error || 'Failed to renew access ID')
      toast({
        title: 'Error',
        description: result.error || 'Failed to renew access ID',
        variant: 'destructive',
      })
    }
    setRenewing(false)
  }

  const handleDeleteScholium = async () => {
    setLoading(true)
    setError(null)
    const result = await deleteScholium(scholiumId)
    if (result.success) {
      toast({
        title: 'Scholium deleted',
        description: 'The scholium has been permanently deleted.',
      })
      router.push('/scholiums')
      router.refresh()
    } else {
      setError(result.error || 'Failed to delete scholium')
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete scholium',
        variant: 'destructive',
      })
    }
    setLoading(false)
    setDeleteDialogOpen(false)
  }

  const handleTransferHost = async () => {
    if (!selectedNewHost) return
    setLoading(true)
    setError(null)
    const result = await transferHost(scholiumId, selectedNewHost)
    if (result.success) {
      toast({
        title: 'Host transferred',
        description: 'The host role has been transferred successfully.',
      })
      onSettingsChange?.()
      router.refresh()
      setTransferDialogOpen(false)
      setSelectedNewHost('')
    } else {
      setError(result.error || 'Failed to transfer host')
      toast({
        title: 'Error',
        description: result.error || 'Failed to transfer host',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const handleRenameScholium = async () => {
    if (!newScholiumName.trim()) return
    setLoading(true)
    setError(null)
    const result = await renameScholium(scholiumId, newScholiumName)
    if (result.success) {
      toast({
        title: 'Scholium renamed',
        description: 'The scholium name has been updated successfully.',
      })
      onSettingsChange?.()
      router.refresh()
      setRenameDialogOpen(false)
    } else {
      setError(result.error || 'Failed to rename scholium')
      toast({
        title: 'Error',
        description: result.error || 'Failed to rename scholium',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const handleClearAllData = async () => {
    setLoading(true)
    setError(null)
    const result = await clearAllScholiumData(scholiumId)
    if (result.success) {
      toast({
        title: 'Data cleared',
        description: 'All homework and subjects have been removed.',
      })
      onSettingsChange?.()
      router.refresh()
      setClearDataDialogOpen(false)
    } else {
      setError(result.error || 'Failed to clear data')
      toast({
        title: 'Error',
        description: result.error || 'Failed to clear data',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Scholium Settings
          </CardTitle>
          <CardDescription>Manage your scholium configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}

          {/* Access ID Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Access ID</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                {accessId}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyAccessId}
                title="Copy Access ID"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {isHost && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRenewAccessId}
                disabled={renewing}
                className="w-full"
              >
                {renewing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4 mr-2" />
                )}
                Renew Access ID
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Share this ID with others to invite them to your scholium
            </p>
          </div>

          {isHost && (
            <>
              {/* Rename Scholium Section */}
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-sm font-semibold text-foreground">Scholium Name</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRenameDialogOpen(true)}
                  disabled={loading}
                  className="w-full justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Rename Scholium
                </Button>
                <p className="text-xs text-muted-foreground">
                  Change the display name of your scholium
                </p>
              </div>

              {/* Clear Data Section */}
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-sm font-semibold text-foreground">Data Management</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClearDataDialogOpen(true)}
                  disabled={loading}
                  className="w-full justify-start"
                >
                  <Eraser className="h-4 w-4 mr-2" />
                  Remove All Homework & Subjects
                </Button>
                <p className="text-xs text-muted-foreground">
                  Clear all homework and subjects while keeping members
                </p>
              </div>

              {/* Transfer Host Section */}
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-sm font-semibold text-foreground">Host Management</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTransferDialogOpen(true)}
                  disabled={loading || members.length <= 1}
                  className="w-full justify-start"
                >
                  <UserCog className="h-4 w-4 mr-2" />
                  Transfer Host Role
                </Button>
                <p className="text-xs text-muted-foreground">
                  Transfer ownership to another member
                </p>
              </div>

              {/* Danger Zone */}
              <div className="space-y-2 pt-2 border-t border-destructive/20">
                <h4 className="text-sm font-semibold text-destructive">Danger Zone</h4>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={loading}
                  className="w-full justify-start text-white hover:text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Scholium
                </Button>
                <p className="text-xs text-muted-foreground">
                  Permanently delete this scholium and all its data
                </p>
              </div>
            </>
          )}

          {!isHost && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Only the host can modify scholium settings</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Scholium Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scholium?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the scholium and all its data including homework, subjects, and members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteScholium}
              disabled={loading}
              className="bg-destructive text-white hover:bg-destructive/90 hover:text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Host Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Host Role</DialogTitle>
            <DialogDescription>
              Select a member to become the new host. You will become a regular member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedNewHost} onValueChange={setSelectedNewHost}>
              <SelectTrigger>
                <SelectValue placeholder="Select new host..." />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter((m) => m.user_id !== currentUserId)
                  .map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.user_name} ({m.user_email})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransferHost} disabled={loading || !selectedNewHost}>
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Scholium Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Scholium</DialogTitle>
            <DialogDescription>
              Enter a new name for your scholium
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="scholium-name">Scholium Name</Label>
            <Input
              id="scholium-name"
              value={newScholiumName}
              onChange={(e) => setNewScholiumName(e.target.value)}
              placeholder="Enter scholium name..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameScholium} disabled={loading || !newScholiumName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Data Dialog */}
      <AlertDialog open={clearDataDialogOpen} onOpenChange={setClearDataDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove All Homework & Subjects?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all homework assignments and subjects in this scholium. Members will remain. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              disabled={loading}
              className="bg-destructive text-white hover:bg-destructive/90 hover:text-white"
            >
              Remove All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

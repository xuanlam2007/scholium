"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { signOut } from "@/app/actions/auth"
import { getScholiumDetails, renewScholiumAccessId, getScholiumMembers } from "@/app/actions/scholium"
import type { User } from "@/lib/db"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { BookOpen, LogOut, Settings, Shield, Grid3X3, Copy, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ScholiumSettings } from "@/components/dashboard/scholium-settings"

interface ScholiumDetails {
  name: string;
  accessId: string;
  isHost: boolean;
}

interface DashboardHeaderProps {
  user: User
  scholiumId: number
}

export function DashboardHeader({ user, scholiumId }: DashboardHeaderProps) {
  const [scholiumDetails, setScholiumDetails] = useState<ScholiumDetails | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [openAccessDialog, setOpenAccessDialog] = useState(false)
  const [openSettingsDialog, setOpenSettingsDialog] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadScholiumDetails()
    loadMembers()
  }, [scholiumId])

  async function loadScholiumDetails() {
    const result = await getScholiumDetails(scholiumId)
    if (result.success && result.data) {
      setScholiumDetails({
        name: result.data.name,
        accessId: result.data.accessId,
        isHost: result.data.isHost,
      })
    }
  }

  async function loadMembers() {
    const result = await getScholiumMembers(scholiumId)
    setMembers(result)
  }

  async function handleCopyAccessId() {
    if (scholiumDetails?.accessId) {
      await navigator.clipboard.writeText(scholiumDetails.accessId)
      toast({
        title: "Access ID copied!",
        description: "Share this ID with others to invite them.",
      })
    }
  }

  async function handleRenewAccessId() {
    setRenewing(true)
    const result = await renewScholiumAccessId(scholiumId)
    if (result.success) {
      await loadScholiumDetails()
      toast({
        title: "Access ID renewed!",
        description: "A new access ID has been generated.",
      })
    }
    setRenewing(false)
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">Scholium</h1>
            {scholiumDetails && (
              <p className="text-sm text-muted-foreground">{scholiumDetails.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">

          {/* Admin's view */}
          {user.role !== "admin" && (
            <>
              <Dialog open={openAccessDialog} onOpenChange={setOpenAccessDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Grid3X3 className="h-4 w-4" />
                    Access ID
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Scholium Access</DialogTitle>
                    <DialogDescription>
                      Share this Access ID with others to invite them to your scholium
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                        {scholiumDetails?.accessId || "Loading..."}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyAccessId}
                        disabled={!scholiumDetails?.accessId}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {scholiumDetails?.isHost && (
                      <Button
                        type="button"
                        className="w-full"
                        onClick={handleRenewAccessId}
                        disabled={renewing}
                      >
                        {renewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Renew Access ID
                      </Button>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={openSettingsDialog} onOpenChange={setOpenSettingsDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  {scholiumDetails && (
                    <ScholiumSettings
                      scholiumId={scholiumId}
                      scholiumName={scholiumDetails.name}
                      accessId={scholiumDetails.accessId}
                      members={members}
                      currentUserId={user.id}
                      isHost={scholiumDetails.isHost}
                    />
                  )}
                </DialogContent>
              </Dialog>

              <Link href="/scholiums">
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Grid3X3 className="h-4 w-4" />
                  Scholiums
                </Button>
              </Link>
            </>
          )}


          {user.role === "admin" && (
            <Link href="/admin">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  <Badge variant="secondary" className="w-fit mt-1 text-xs">
                    {user.role}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

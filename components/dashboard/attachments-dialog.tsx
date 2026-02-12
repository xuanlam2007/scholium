"use client"

import { useState, useEffect } from "react"
import type { Homework, Attachment } from "@/lib/db"
import { getAttachments, deleteAttachment } from "@/app/actions/homework"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, File, Trash2, Upload } from "lucide-react"
import { FileUploader } from "./file-uploader"

interface AttachmentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  homework: Homework
  canAddHomework: boolean
}

export function AttachmentsDialog({ open, onOpenChange, homework, canAddHomework }: AttachmentsDialogProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploader, setShowUploader] = useState(false)

  useEffect(() => {
    if (open) {
      loadAttachments()
    }
  }, [open, homework.id])

  async function loadAttachments() {
    setLoading(true)
    const data = await getAttachments(homework.id)
    setAttachments(data)
    setLoading(false)
  }

  async function handleDelete(id: number) {
    if (confirm("Are you sure you want to delete this attachment?")) {
      await deleteAttachment(id)
      loadAttachments()
    }
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "Unknown size"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Attachments</DialogTitle>
          <DialogDescription>Files attached to &quot;{homework.title}&quot;</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {canAddHomework && (
            <div>
              {showUploader ? (
                <FileUploader
                  homeworkId={homework.id}
                  onUploadComplete={() => {
                    setShowUploader(false)
                    loadAttachments()
                  }}
                  onCancel={() => setShowUploader(false)}
                />
              ) : (
                <Button variant="outline" className="w-full gap-2 bg-transparent" onClick={() => setShowUploader(true)}>
                  <Upload className="h-4 w-4" />
                  Upload File
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            {loading ? (
              <p className="text-center text-muted-foreground py-4">Loading...</p>
            ) : attachments.length > 0 ? (
              attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <File className="h-8 w-8 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{attachment.file_name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={attachment.file_url} target="_blank" rel="noopener noreferrer" download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    {canAddHomework && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(attachment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No attachments yet</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

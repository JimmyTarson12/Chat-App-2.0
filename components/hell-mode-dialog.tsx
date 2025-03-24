"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Flame, Plus, Trash } from "lucide-react"
import { enableHellMode, getDefaultDemonMessages } from "@/utils/hell-mode"
import { useToast } from "@/components/ui/use-toast"

interface HellModeDialogProps {
  isOpen: boolean
  onClose: () => void
  username: string
  adminName: string
}

export default function HellModeDialog({ isOpen, onClose, username, adminName }: HellModeDialogProps) {
  const [demonMessages, setLocalDemonMessages] = useState<string[]>(getDefaultDemonMessages())
  const [newMessage, setNewMessage] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleAddMessage = () => {
    if (!newMessage.trim()) return

    setLocalDemonMessages([...demonMessages, newMessage])
    setNewMessage("")
  }

  const handleRemoveMessage = (index: number) => {
    const newMessages = [...demonMessages]
    newMessages.splice(index, 1)
    setLocalDemonMessages(newMessages)
  }

  const handleEnableHellMode = async () => {
    try {
      setIsSubmitting(true)
      console.log("Enabling Hell Mode for", username, "with messages:", demonMessages)

      // Make sure we have at least one message
      const messagesToUse = demonMessages.length > 0 ? demonMessages : getDefaultDemonMessages()

      await enableHellMode(username, adminName, messagesToUse)

      toast({
        title: "Hell Mode Activated",
        description: `${username} has been sent to hell.`,
        variant: "destructive",
      })

      onClose()
    } catch (error) {
      console.error("Error enabling hell mode:", error)
      toast({
        title: "Error",
        description: "Failed to enable Hell Mode. Check console for details.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Flame className="h-5 w-5 mr-2 text-red-500" />
            Enable Hell Mode for {username}
          </DialogTitle>
          <DialogDescription>
            This user will experience a hellish chat interface and their messages will be altered.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div>
            <Label htmlFor="demon-messages">Demon Messages</Label>
            <p className="text-xs text-muted-foreground mb-2">
              These messages will be shown to the user when they send a message.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
              {demonMessages.map((message, index) => (
                <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                  <p className="text-sm">{message}</p>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveMessage(index)} className="h-6 w-6 p-0">
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}

              {demonMessages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No demon messages added. Add some below.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="new-message">Add New Message</Label>
              <Input
                id="new-message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Enter a demonic message..."
              />
            </div>
            <Button onClick={handleAddMessage} className="flex-shrink-0">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleEnableHellMode}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>Processing...</>
            ) : (
              <>
                <Flame className="h-4 w-4 mr-1" /> Enable Hell Mode
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

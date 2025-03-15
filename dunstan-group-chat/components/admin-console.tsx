"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2, Edit, Save, X } from "lucide-react"
import Gun from "gun"

// Initialize Gun
const gun = Gun({
  peers: ["https://gun-manhattan.herokuapp.com/gun"],
})

interface Message {
  id: string
  sender: string
  text: string
  timestamp: number
}

interface AdminConsoleProps {
  username: string
  onLogout: () => void
}

export default function AdminConsole({ username, onLogout }: AdminConsoleProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState<string>("")

  useEffect(() => {
    // Subscribe to messages
    const messagesRef = gun.get("chat-messages")

    messagesRef.map().on((data, id) => {
      if (data && data.timestamp && data.sender && data.text) {
        setMessages((prevMessages) => {
          // Check if message already exists
          const exists = prevMessages.some((msg) => msg.id === id)
          if (exists) {
            // Update existing message
            return prevMessages.map((msg) => (msg.id === id ? { ...data, id } : msg))
          }

          // Add new message
          const newMessages = [...prevMessages, { ...data, id }]
          // Sort by timestamp
          return newMessages.sort((a, b) => a.timestamp - b.timestamp)
        })
      }
    })
  }, [])

  const handleDeleteMessage = (id: string) => {
    const messagesRef = gun.get("chat-messages")
    messagesRef.get(id).put(null)

    // Update local state
    setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== id))
  }

  const handleEditMessage = (id: string, currentText: string) => {
    setEditingId(id)
    setEditText(currentText)
  }

  const handleSaveEdit = (id: string) => {
    const messagesRef = gun.get("chat-messages")
    const messageToUpdate = messages.find((msg) => msg.id === id)

    if (messageToUpdate) {
      messagesRef.get(id).put({
        ...messageToUpdate,
        text: editText,
      })
    }

    setEditingId(null)
    setEditText("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText("")
  }

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Card className="h-[calc(100vh-2rem)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Admin Console - {username}</CardTitle>
          <Button variant="outline" size="sm" onClick={onLogout}>
            Logout
          </Button>
        </CardHeader>
        <CardContent className="flex h-[calc(100%-5rem)] flex-col gap-4">
          <ScrollArea className="flex-1 rounded-md border p-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No messages to moderate.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex items-start justify-between rounded-lg border p-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{msg.sender}</span>
                        <span className="text-xs opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {editingId === msg.id ? (
                        <div className="mt-1">
                          <Input value={editText} onChange={(e) => setEditText(e.target.value)} className="mb-2" />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleSaveEdit(msg.id)}>
                              <Save className="h-4 w-4 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              <X className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1">{msg.text}</p>
                      )}
                    </div>

                    {editingId !== msg.id && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditMessage(msg.id, msg.text)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteMessage(msg.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
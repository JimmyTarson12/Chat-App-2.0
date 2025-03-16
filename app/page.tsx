"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, AlertCircle, Pin, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import LoginForm from "@/components/login-form"
import ChatMessage from "@/components/chat-message"
import AdminConsole from "@/components/admin-console"
import Gun from "gun"
import { checkSession, updateSessionActivity, endSession } from "@/utils/session-manager"

// Initialize Gun
const gun = Gun({
  peers: ["https://gun-manhattan.herokuapp.com/gun"], // Public relay server
})

// Reference to the muted users in Gun
const mutedUsersRef = gun.get("muted-users")
// Reference to pinned messages
const pinnedMessagesRef = gun.get("pinned-messages")
// Reference to chat status
const chatStatusRef = gun.get("chat-status")

interface PinnedMessage {
  id: string
  messageId: string
  sender: string
  text: string
  timestamp: number
  pinnedBy: string
  pinnedAt: number
}

interface ChatStatus {
  enabled: boolean
  disabledBy?: string
  disabledAt?: number
  reason?: string
}

export default function Home() {
  const [username, setUsername] = useState<string>("")
  const [sessionId, setSessionId] = useState<string>("")
  const [message, setMessage] = useState<string>("")
  const [messages, setMessages] = useState<any[]>([])
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [chatStatus, setChatStatus] = useState<ChatStatus>({ enabled: true })

  // Function to handle logout
  const handleLogout = useCallback(() => {
    if (sessionId) {
      endSession(sessionId)
    }
    setUsername("")
    setSessionId("")
    setIsAdmin(false)
    setIsMuted(false)
    localStorage.removeItem("chat-username")
    localStorage.removeItem("chat-admin")
    localStorage.removeItem("chat-session-id")
  }, [sessionId])

  // Check for existing session on load
  useEffect(() => {
    const storedSessionId = localStorage.getItem("chat-session-id")

    if (storedSessionId) {
      checkSession(storedSessionId, (isValid) => {
        if (isValid) {
          const storedUsername = localStorage.getItem("chat-username")
          const storedAdminStatus = localStorage.getItem("chat-admin")

          if (storedUsername) {
            setUsername(storedUsername)
            setSessionId(storedSessionId)

            if (storedAdminStatus === "true") {
              setIsAdmin(true)
            }

            // Update session activity
            updateSessionActivity(storedSessionId)
          } else {
            handleLogout()
          }
        } else {
          // Session is invalid, force logout
          handleLogout()
        }
      })
    }

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

    // Subscribe to pinned messages
    pinnedMessagesRef.map().on((data, id) => {
      if (data && data.messageId) {
        setPinnedMessages((prev) => {
          // Check if pinned message already exists
          const exists = prev.some((msg) => msg.id === id)
          if (exists) {
            // Update existing pinned message
            return prev.map((msg) => (msg.id === id ? { ...data, id } : msg))
          }

          // Add new pinned message
          const newPinnedMessages = [...prev, { ...data, id }]

          // Sort by pinnedAt timestamp (newest first)
          return newPinnedMessages.sort((a, b) => b.pinnedAt - a.pinnedAt)
        })
      } else if (data === null) {
        // Remove unpinned message
        setPinnedMessages((prev) => prev.filter((msg) => msg.id !== id))
      }
    })

    // Subscribe to chat status
    chatStatusRef.on((data) => {
      if (data) {
        setChatStatus(data)
      } else {
        // Default to enabled if no data
        setChatStatus({ enabled: true })
      }
    })

    setIsLoading(false)
  }, [handleLogout])

  // Periodically check if session is still valid
  useEffect(() => {
    if (!sessionId) return

    const interval = setInterval(() => {
      checkSession(sessionId, (isValid) => {
        if (!isValid) {
          handleLogout()
        } else {
          // Update session activity
          updateSessionActivity(sessionId)
        }
      })
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [sessionId, handleLogout])

  // Subscribe to mute status when username changes
  useEffect(() => {
    if (username && !isAdmin) {
      const unsubscribe = mutedUsersRef.get(username).on((data) => {
        if (data && typeof data.muted === "boolean") {
          console.log(`Mute status for ${username}:`, data.muted)
          setIsMuted(data.muted)
        } else {
          setIsMuted(false)
        }
      })

      // Return cleanup function
      return () => {
        mutedUsersRef.get(username).off()
      }
    }
  }, [username, isAdmin])

  const handleLogin = (name: string, newSessionId: string) => {
    setUsername(name)
    setSessionId(newSessionId)
    localStorage.setItem("chat-username", name)
  }

  const handleAdminLogin = (newSessionId: string) => {
    setIsAdmin(true)
    setUsername("Admin")
    setSessionId(newSessionId)
    localStorage.setItem("chat-admin", "true")
    localStorage.setItem("chat-username", "Admin")
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || isMuted || !chatStatus.enabled) return

    // Add message to Gun
    const messagesRef = gun.get("chat-messages")
    const messageData = {
      sender: username,
      text: message,
      timestamp: Date.now(),
    }

    messagesRef.set(messageData)
    setMessage("")
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!username || !sessionId) {
    return <LoginForm onLogin={handleLogin} onAdminLogin={handleAdminLogin} />
  }

  if (isAdmin) {
    return <AdminConsole username={username} sessionId={sessionId} onLogout={handleLogout} />
  }

  const isChatDisabled = !chatStatus.enabled

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Card className="h-[calc(100vh-2rem)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Massive Group Chat</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{username}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex h-[calc(100%-5rem)] flex-col gap-4">
          {isMuted && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have been muted by an administrator. You can still read messages but cannot send new ones.
              </AlertDescription>
            </Alert>
          )}

          {isChatDisabled && (
            <Alert
              variant="warning"
              className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
            >
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-300">
                Chat is currently disabled for maintenance
                {chatStatus.reason ? `: ${chatStatus.reason}` : ""}
                {chatStatus.disabledBy ? ` (by ${chatStatus.disabledBy})` : ""}
              </AlertDescription>
            </Alert>
          )}

          {pinnedMessages.length > 0 && (
            <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Pin className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Pinned Message{pinnedMessages.length > 1 ? "s" : ""}
                </h3>
              </div>
              <ScrollArea className="max-h-32">
                <div className="space-y-2">
                  {pinnedMessages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          {msg.sender === "GOD" ? <span className="text-red-500">{msg.sender}</span> : msg.sender}:
                        </span>
                      </div>
                      <p className="mt-0.5">{msg.text}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <ScrollArea className="flex-1 rounded-md border p-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No messages yet. Be the first to say hello!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} isCurrentUser={msg.sender === username} />
                ))}
              </div>
            )}
          </ScrollArea>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isMuted ? "You have been muted" : isChatDisabled ? "Chat is currently disabled" : "Type your message..."
              }
              className="flex-1"
              disabled={isMuted || isChatDisabled}
            />
            <Button type="submit" disabled={isMuted || isChatDisabled}>
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

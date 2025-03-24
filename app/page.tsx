"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, AlertCircle, Pin, AlertTriangle, Flame } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import LoginForm from "@/components/login-form"
import ChatMessage from "@/components/chat-message"
import AdminConsole from "@/components/admin-console"
import Gun from "gun"
import { Analytics } from "@/utils/analytics"
import { subscribeToHellMode, processHellModeMessage, type HellModeSettings } from "@/utils/hell-mode"
import DemonMessage from "@/components/demon-message"
import { motion } from "framer-motion"

// Import the debug component at the top
import HellModeDebug from "@/components/hell-mode-debug"

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
  const [message, setMessage] = useState<string>("")
  const [messages, setMessages] = useState<any[]>([])
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [chatStatus, setChatStatus] = useState<ChatStatus>({ enabled: true })
  const [isInHellMode, setIsInHellMode] = useState<boolean>(false)
  const [hellModeSettings, setHellModeSettings] = useState<HellModeSettings | null>(null)
  const [demonMessage, setDemonMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if username is stored in localStorage
    const storedUsername = localStorage.getItem("chat-username")
    if (storedUsername) {
      setUsername(storedUsername)
    }

    // Check if admin status is stored
    const storedAdminStatus = localStorage.getItem("chat-admin")
    if (storedAdminStatus === "true") {
      setIsAdmin(true)
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
  }, [])

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

  // Add this useEffect for Hell Mode
  useEffect(() => {
    if (!username || isAdmin) return

    console.log("Setting up Hell Mode subscription for", username)

    const unsubscribe = subscribeToHellMode(username, (settings) => {
      console.log("Hell Mode update received:", settings)
      setIsInHellMode(!!settings)
      setHellModeSettings(settings)

      if (settings) {
        console.log("User is now in Hell Mode with settings:", settings)
      } else {
        console.log("User is not in Hell Mode")
      }
    })

    return () => {
      console.log("Cleaning up Hell Mode subscription")
      unsubscribe()
    }
  }, [username, isAdmin])

  // Scroll to bottom when new messages arrive or demon message appears
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, demonMessage])

  const handleLogin = (name: string) => {
    setUsername(name)
    localStorage.setItem("chat-username", name)
  }

  const handleAdminLogin = () => {
    setIsAdmin(true)
    setUsername("Admin")
    localStorage.setItem("chat-admin", "true")
    localStorage.setItem("chat-username", "Admin")
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || isMuted || !chatStatus.enabled) return

    // Process message if in hell mode
    let messageToSend = message
    let messageType = "normal"

    if (isInHellMode && hellModeSettings) {
      const processed = processHellModeMessage(message)
      messageToSend = processed.text
      messageType = processed.type

      // Show a random demon message
      if (hellModeSettings.demonMessages && hellModeSettings.demonMessages.length > 0) {
        const randomIndex = Math.floor(Math.random() * hellModeSettings.demonMessages.length)
        setDemonMessage(hellModeSettings.demonMessages[randomIndex])
      } else if (hellModeSettings.customMessage) {
        setDemonMessage(hellModeSettings.customMessage)
      }
    }

    // Add message to Gun
    const messagesRef = gun.get("chat-messages")
    const messageData = {
      sender: username,
      text: messageToSend,
      timestamp: Date.now(),
      hellMode: isInHellMode ? messageType : undefined,
    }

    messagesRef.set(messageData)
    Analytics.trackMessageSent(isAdmin)
    setMessage("")
  }

  // Add this function to handle closing the demon message
  const handleCloseDemonMessage = () => {
    setDemonMessage(null)
  }

  const handleLogout = () => {
    setUsername("")
    setIsAdmin(false)
    setIsMuted(false)
    localStorage.removeItem("chat-username")
    localStorage.removeItem("chat-admin")
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!username) {
    return <LoginForm onLogin={handleLogin} onAdminLogin={handleAdminLogin} />
  }

  if (isAdmin) {
    return <AdminConsole username={username} onLogout={handleLogout} />
  }

  const isChatDisabled = !chatStatus.enabled

  // Define hell mode class names
  const hellModeClasses = isInHellMode
    ? {
        container: "bg-black",
        card: "bg-gray-900 border-red-800",
        header: "border-red-800",
        title: "text-red-500",
        username: "text-red-400",
        button: "bg-red-900 hover:bg-red-800 text-red-100",
        scrollArea: "border-red-800 bg-gray-900",
        input: "bg-gray-800 border-red-800 text-red-300 placeholder:text-red-700",
      }
    : {}

  return (
    <div className={`container mx-auto max-w-4xl p-4 ${hellModeClasses.container || ""}`}>
      <Card className={`h-[calc(100vh-2rem)] ${hellModeClasses.card || ""}`}>
        <CardHeader
          className={`flex flex-row items-center justify-between space-y-0 pb-2 ${hellModeClasses.header || ""}`}
        >
          <CardTitle className={hellModeClasses.title || ""}>
            {isInHellMode ? (
              <span className="flex items-center">
                <Flame className="h-5 w-5 mr-2 text-red-600" />
                Hellish Chat
              </span>
            ) : (
              "Massive Group Chat"
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${hellModeClasses.username || ""}`}>{username}</span>
            <Button
              variant={isInHellMode ? "default" : "outline"}
              size="sm"
              onClick={handleLogout}
              className={hellModeClasses.button || ""}
            >
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

          {isInHellMode && (
            <Alert variant="destructive" className="bg-red-900 border-red-700 text-red-200">
              <Flame className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                You have been sent to hell by an administrator. Your messages may be corrupted by demonic forces.
              </AlertDescription>
            </Alert>
          )}

          {pinnedMessages.length > 0 && (
            <div
              className={`rounded-md border ${isInHellMode ? "border-red-800 bg-gray-900" : "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800"} p-3`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Pin className={`h-4 w-4 ${isInHellMode ? "text-red-500" : "text-blue-500"}`} />
                <h3
                  className={`text-sm font-medium ${isInHellMode ? "text-red-400" : "text-blue-700 dark:text-blue-300"}`}
                >
                  Pinned Message{pinnedMessages.length > 1 ? "s" : ""}
                </h3>
              </div>
              <ScrollArea className="max-h-32">
                <div className="space-y-2">
                  {pinnedMessages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <div className="flex items-center gap-1">
                        <span className={`font-medium ${isInHellMode ? "text-red-400" : ""}`}>
                          {msg.sender === "GOD" ? (
                            <span className={isInHellMode ? "text-red-600" : "text-red-500"}>{msg.sender}</span>
                          ) : (
                            msg.sender
                          )}
                          :
                        </span>
                      </div>
                      <p className={`mt-0.5 ${isInHellMode ? "text-red-300" : ""}`}>{msg.text}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <ScrollArea className={`flex-1 rounded-md border p-4 ${hellModeClasses.scrollArea || ""}`}>
            {messages.length === 0 ? (
              <div
                className={`flex h-full items-center justify-center ${isInHellMode ? "text-red-700" : "text-muted-foreground"}`}
              >
                {isInHellMode ? "The void awaits your first message..." : "No messages yet. Be the first to say hello!"}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isCurrentUser={msg.sender === username}
                    isHellMode={isInHellMode}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isMuted
                  ? "You have been muted"
                  : isChatDisabled
                    ? "Chat is currently disabled"
                    : isInHellMode
                      ? "Type your message to the void..."
                      : "Type your message..."
              }
              className={`flex-1 ${hellModeClasses.input || ""}`}
              disabled={isMuted || isChatDisabled}
            />
            <Button
              type="submit"
              disabled={isMuted || isChatDisabled}
              className={isInHellMode ? "bg-red-800 hover:bg-red-700 text-red-100" : ""}
            >
              Send
            </Button>
          </form>
        </CardContent>
      </Card>

      {demonMessage && <DemonMessage message={demonMessage} onClose={handleCloseDemonMessage} />}

      {isInHellMode && (
        <>
          {/* Floating flames effect */}
          <div className="fixed inset-0 pointer-events-none z-0">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{
                  bottom: -20,
                  left: `${Math.random() * 100}%`,
                  opacity: 0.3 + Math.random() * 0.5,
                }}
                animate={{
                  bottom: `${80 + Math.random() * 20}%`,
                  left: `${Math.random() * 100}%`,
                }}
                transition={{
                  duration: 10 + Math.random() * 20,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "loop",
                }}
              >
                <Flame className="text-red-600/30 h-10 w-10" />
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Debug component - only visible in development */}
      {process.env.NODE_ENV === "development" && !isAdmin && username && <HellModeDebug username={username} />}
    </div>
  )
}

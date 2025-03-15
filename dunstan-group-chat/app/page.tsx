"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import LoginForm from "@/components/login-form"
import ChatMessage from "@/components/chat-message"
import AdminConsole from "@/components/admin-console"
import Gun from "gun"

// Initialize Gun
const gun = Gun({
  peers: ["https://gun-manhattan.herokuapp.com/gun"], // Public relay server
})

export default function Home() {
  const [username, setUsername] = useState<string>("")
  const [message, setMessage] = useState<string>("")
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)

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

    setIsLoading(false)
  }, [])

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

    if (!message.trim()) return

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

  const handleLogout = () => {
    setUsername("")
    setIsAdmin(false)
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
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button type="submit">Send</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

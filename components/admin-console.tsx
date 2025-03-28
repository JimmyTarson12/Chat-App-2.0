"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardFooter, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Trash2,
  Edit,
  Save,
  X,
  Send,
  VolumeX,
  Volume2,
  Download,
  Trash,
  Pin,
  PinOff,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  UserX,
  Key,
  Lock,
  Unlock,
  Shield,
  Flame,
  Settings2,
  CalendarIcon,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmationDialog } from "./confirmation-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Gun from "gun"
import {
  addAllowedManualLogin,
  removeManualLogin,
  subscribeToAllowedManualLogins,
  subscribeToManualLoginAccounts,
  verifyAdminPassword,
  type AllowedManualLogin,
  type ManualLoginAccount,
} from "@/utils/manual-login"
import { Analytics } from "@/utils/analytics"
import { subscribeToAllHellModeUsers, disableHellMode, type HellModeSettings } from "@/utils/hell-mode"
import HellModeDialog from "./hell-mode-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"

// Initialize Gun
const gun = Gun({
  peers: ["https://gun-manhattan.herokuapp.com/gun"],
})

// Reference to the muted users in Gun
const mutedUsersRef = gun.get("muted-users")
// Reference to pinned messages
const pinnedMessagesRef = gun.get("pinned-messages")
// Reference to chat status
const chatStatusRef = gun.get("chat-status")
// Reference to hell mode settings
const hellModeSettingsRef = gun.get("hell-mode-settings")
// Reference to hell mode
const hellModeRef = gun.get("hell-mode")

interface Message {
  id: string
  sender: string
  text: string
  timestamp: number
  customColor?: string
  adminSent?: boolean
}

interface MutedUser {
  muted: boolean
  timestamp: number
}

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

interface AdminConsoleProps {
  username: string
  onLogout: () => void
}

export default function AdminConsole({ username, onLogout }: AdminConsoleProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState<string>("")
  const [newMessage, setNewMessage] = useState<string>("")
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set())
  const [mutedUsers, setMutedUsers] = useState<Record<string, MutedUser>>({})
  const [chatStatus, setChatStatus] = useState<ChatStatus>({ enabled: true })
  const [disableReason, setDisableReason] = useState<string>("")
  const [allowedManualLogins, setAllowedManualLogins] = useState<Record<string, AllowedManualLogin>>({})
  const [manualLoginAccounts, setManualLoginAccounts] = useState<Record<string, ManualLoginAccount>>({})
  const [newManualLoginId, setNewManualLoginId] = useState<string>("")
  const [newManualLoginName, setNewManualLoginName] = useState<string>("")
  const [adminPassword, setAdminPassword] = useState<string>("")
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(false)
  const [adminPasswordError, setAdminPasswordError] = useState<string>("")
  const { toast } = useToast()
  const [hellModeUsers, setHellModeUsers] = useState<Record<string, HellModeSettings>>({})
  const [hellModeDialogOpen, setHellModeDialogOpen] = useState<boolean>(false)
  const [selectedUserForHellMode, setSelectedUserForHellMode] = useState<string>("")
  const [customSender, setCustomSender] = useState<string>("GOD")
  const [customColor, setCustomColor] = useState<string>("")
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date())
  const [customTime, setCustomTime] = useState<string>(format(new Date(), "HH:mm"))
  const [showMessageOptions, setShowMessageOptions] = useState<boolean>(false)

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

          // Update active users set
          setActiveUsers((prev) => {
            const newSet = new Set(prev)
            if (data.sender !== "GOD" && data.sender !== "Admin") {
              newSet.add(data.sender)
            }
            return newSet
          })

          // Sort by timestamp
          return newMessages.sort((a, b) => a.timestamp - b.timestamp)
        })
      }
    })

    // Subscribe to muted users
    mutedUsersRef.map().on((data, key) => {
      if (data && key) {
        setMutedUsers((prev) => ({
          ...prev,
          [key]: data,
        }))
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

    // Subscribe to allowed manual logins
    const unsubscribeAllowedLogins = subscribeToAllowedManualLogins(setAllowedManualLogins)

    // Subscribe to manual login accounts
    const unsubscribeManualAccounts = subscribeToManualLoginAccounts(setManualLoginAccounts)

    // Subscribe to hell mode users
    const unsubscribeHellMode = subscribeToAllHellModeUsers(setHellModeUsers)

    return () => {
      unsubscribeAllowedLogins()
      unsubscribeManualAccounts()
      unsubscribeHellMode()
    }
  }, [])

  // Add a test function to directly check Hell Mode status
  // Add this function to the component:

  const testHellModeStatus = (username: string) => {
    console.log("Current Hell Mode users:", hellModeUsers)
    console.log("Is user in Hell Mode?", !!hellModeUsers[username])

    // Force a refresh of the hellModeUsers state
    subscribeToAllHellModeUsers((users) => {
      console.log("Updated Hell Mode users:", users)
      setHellModeUsers(users)
    })

    toast({
      title: "Hell Mode Status",
      description: `${username} is ${hellModeUsers[username] ? "in" : "not in"} Hell Mode.`,
    })
  }

  // Add this function to the component

  const handleDeleteMessage = (id: string) => {
    const messagesRef = gun.get("chat-messages")
    messagesRef.get(id).put(null)

    // Update local state
    setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== id))

    // Also remove from pinned messages if it was pinned
    const pinnedMessage = pinnedMessages.find((pm) => pm.messageId === id)
    if (pinnedMessage) {
      pinnedMessagesRef.get(pinnedMessage.id).put(null)
    }
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

      // Also update pinned message if it exists
      const pinnedMessage = pinnedMessages.find((pm) => pm.messageId === id)
      if (pinnedMessage) {
        pinnedMessagesRef.get(pinnedMessage.id).put({
          ...pinnedMessage,
          text: editText,
        })
      }
    }

    setEditingId(null)
    setEditText("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText("")
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    // Calculate timestamp from custom date and time
    let timestamp = Date.now()
    if (customDate) {
      const [hours, minutes] = customTime.split(":").map(Number)
      const customTimestamp = new Date(customDate)
      customTimestamp.setHours(hours || 0)
      customTimestamp.setMinutes(minutes || 0)
      timestamp = customTimestamp.getTime()
    }

    // Add message to Gun
    const messagesRef = gun.get("chat-messages")
    const messageData = {
      sender: customSender,
      text: newMessage,
      timestamp,
      adminSent: true,
    }

    // Only add custom color if it's set
    if (customColor) {
      messageData.customColor = customColor
    }

    messagesRef.set(messageData)
    Analytics.trackMessageSent(true)
    setNewMessage("")
  }

  const handleToggleMute = (user: string) => {
    const isMuted = mutedUsers[user]?.muted

    // Direct update to Gun
    mutedUsersRef.get(user).put({
      muted: !isMuted,
      timestamp: Date.now(),
    })

    // Also update local state for immediate UI feedback
    setMutedUsers((prev) => ({
      ...prev,
      [user]: {
        muted: !isMuted,
        timestamp: Date.now(),
      },
    }))

    if (isMuted) {
      Analytics.trackUserUnmuted(user)
    } else {
      Analytics.trackUserMuted(user)
    }
  }

  const handleDeleteAllMessages = () => {
    const messagesRef = gun.get("chat-messages")

    // Delete all messages
    messages.forEach((msg) => {
      messagesRef.get(msg.id).put(null)
    })

    // Clear local state
    setMessages([])

    // Also clear all pinned messages
    pinnedMessages.forEach((pm) => {
      pinnedMessagesRef.get(pm.id).put(null)
    })

    toast({
      title: "All messages deleted",
      description: "All messages have been permanently deleted.",
    })
  }

  const handleDownloadMessages = () => {
    // Format messages for download
    const formattedMessages = messages.map((msg) => ({
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp,
      date: new Date(msg.timestamp).toLocaleString(),
    }))

    // Create a JSON string
    const jsonString = JSON.stringify(formattedMessages, null, 2)

    // Create a blob
    const blob = new Blob([jsonString], { type: "application/json" })

    // Create a download link
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `chat-messages-${new Date().toISOString().split("T")[0]}.json`

    // Trigger download
    document.body.appendChild(a)
    a.click()

    // Cleanup
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Messages downloaded",
      description: "All messages have been downloaded as a JSON file.",
    })
  }

  const handleTogglePin = (message: Message) => {
    // Check if message is already pinned
    const existingPin = pinnedMessages.find((pm) => pm.messageId === message.id)

    if (existingPin) {
      // Unpin the message
      pinnedMessagesRef.get(existingPin.id).put(null)
      Analytics.trackMessageUnpinned()

      toast({
        title: "Message unpinned",
        description: "The message has been removed from pinned messages.",
      })
    } else {
      // Pin the message
      const pinnedMessage = {
        messageId: message.id,
        sender: message.sender,
        text: message.text,
        timestamp: message.timestamp,
        pinnedBy: username,
        pinnedAt: Date.now(),
      }

      pinnedMessagesRef.set(pinnedMessage)
      Analytics.trackMessagePinned()

      toast({
        title: "Message pinned",
        description: "The message has been pinned and will be visible to all users.",
      })
    }
  }

  const handleToggleChatStatus = () => {
    if (chatStatus.enabled) {
      // Disable the chat
      chatStatusRef.put({
        enabled: false,
        disabledBy: username,
        disabledAt: Date.now(),
        reason: disableReason.trim() || "Maintenance",
      })
      Analytics.trackChatDisabled(disableReason.trim() || "Maintenance")

      toast({
        title: "Chat disabled",
        description: "The chat has been disabled for all users.",
      })
    } else {
      // Enable the chat
      chatStatusRef.put({
        enabled: true,
      })
      Analytics.trackChatEnabled()

      toast({
        title: "Chat enabled",
        description: "The chat has been enabled for all users.",
      })
    }

    // Clear reason field after toggling
    setDisableReason("")
  }

  const handleVerifyAdminPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setAdminPasswordError("")

    if (!adminPassword) {
      setAdminPasswordError("Please enter the admin password")
      return
    }

    if (verifyAdminPassword(adminPassword)) {
      setIsAdminVerified(true)
      setAdminPassword("")
      toast({
        title: "Access granted",
        description: "You can now add new IDs to the system.",
      })
    } else {
      setAdminPasswordError("Incorrect password")
    }
  }

  const handleAddManualLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newManualLoginId.trim() || !newManualLoginName.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both ID and name.",
        variant: "destructive",
      })
      return
    }

    // Check if ID is already in the allowed list
    if (allowedManualLogins[newManualLoginId]) {
      toast({
        title: "ID already exists",
        description: "This ID is already in the allowed list.",
        variant: "destructive",
      })
      return
    }

    // Check if ID is already registered as an account
    if (manualLoginAccounts[newManualLoginId]) {
      toast({
        title: "Account already exists",
        description: "An account with this ID already exists.",
        variant: "destructive",
      })
      return
    }

    try {
      await addAllowedManualLogin(newManualLoginId, newManualLoginName, username)
      Analytics.trackIdAdded()

      toast({
        title: "ID added",
        description: `${newManualLoginName} (ID: ${newManualLoginId}) can now create an account.`,
      })

      // Clear form
      setNewManualLoginId("")
      setNewManualLoginName("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add ID to allowed list.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveManualLogin = async (id: string) => {
    try {
      await removeManualLogin(id)
      Analytics.trackIdRemoved()

      toast({
        title: "ID removed",
        description: "ID has been removed from the system.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove ID from the system.",
        variant: "destructive",
      })
    }
  }

  const handleLogoutFromIDManagement = () => {
    setIsAdminVerified(false)
    toast({
      title: "Logged out",
      description: "You have been logged out of ID management.",
    })
  }

  const isMessagePinned = (messageId: string) => {
    return pinnedMessages.some((pm) => pm.messageId === messageId)
  }

  const sortedActiveUsers = Array.from(activeUsers).sort()

  // Sort allowed manual logins by added time (newest first)
  const sortedAllowedLogins = Object.values(allowedManualLogins).sort((a, b) => b.addedAt - a.addedAt)

  // Sort manual login accounts by creation time (newest first)
  const sortedManualAccounts = Object.values(manualLoginAccounts).sort((a, b) => b.createdAt - a.createdAt)

  const handleOpenHellModeDialog = (username: string) => {
    setSelectedUserForHellMode(username)
    setHellModeDialogOpen(true)
  }

  const handleDisableHellMode = async (username: string) => {
    try {
      await disableHellMode(username)

      // Update local state immediately for UI feedback
      setHellModeUsers((prev) => {
        const newUsers = { ...prev }
        delete newUsers[username]
        return newUsers
      })

      toast({
        title: "Hell Mode Disabled",
        description: `${username} has been released from hell.`,
      })
    } catch (error) {
      console.error("Error disabling hell mode:", error)
      toast({
        title: "Error",
        description: "Failed to disable Hell Mode.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Card className="h-[calc(100vh-2rem)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Admin Console - {username}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadMessages}>
              <Download className="h-4 w-4 mr-1" /> Download Messages
            </Button>
            <ConfirmationDialog
              title="Delete All Messages"
              description="Are you sure you want to delete all messages? This action cannot be undone."
              confirmText="Delete All"
              destructive={true}
              onConfirm={handleDeleteAllMessages}
              doubleConfirm={true}
              doubleConfirmText="Type CONFIRM to permanently delete all messages"
              trigger={
                <Button variant="destructive" size="sm">
                  <Trash className="h-4 w-4 mr-1" /> Delete All
                </Button>
              }
            />
            <Button variant="outline" size="sm" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </CardHeader>

        <Tabs defaultValue="messages" className="flex flex-col flex-1">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="pinned">
              Pinned Messages
              {pinnedMessages.length > 0 && (
                <span className="ml-2 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                  {pinnedMessages.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="id-management">
              ID Management
              {sortedAllowedLogins.length > 0 && (
                <span className="ml-2 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                  {sortedAllowedLogins.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="flex-1 flex flex-col">
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
                          <span className={`text-xs font-semibold ${msg.sender === "GOD" ? "text-red-500" : ""}`}>
                            {msg.sender}
                            {mutedUsers[msg.sender]?.muted && (
                              <span className="ml-2 text-xs text-red-500">(Muted)</span>
                            )}
                            {isMessagePinned(msg.id) && (
                              <span className="ml-2 text-xs text-blue-500">
                                <Pin className="h-3 w-3 inline" /> Pinned
                              </span>
                            )}
                          </span>
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
                          <Button
                            size="sm"
                            variant={isMessagePinned(msg.id) ? "default" : "outline"}
                            onClick={() => handleTogglePin(msg)}
                          >
                            {isMessagePinned(msg.id) ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                          </Button>
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

            <CardFooter className="pt-4">
              <form onSubmit={handleSendMessage} className="w-full space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMessageOptions(!showMessageOptions)}
                    className={showMessageOptions ? "bg-muted" : ""}
                  >
                    <Settings2 className="h-4 w-4 mr-1" />
                    {showMessageOptions ? "Hide Options" : "Show Options"}
                  </Button>

                  {showMessageOptions && (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-muted-foreground">Sending as:</span>
                      <span className="font-medium">{customSender}</span>

                      {customColor && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Color:</span>
                          <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: customColor }}></div>
                        </div>
                      )}

                      {customDate && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Time:</span>
                          <span className="text-xs">
                            {format(customDate, "MMM d, yyyy")} {customTime}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {showMessageOptions && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-muted/30">
                    <div className="space-y-2">
                      <Label htmlFor="custom-sender">Sender Name</Label>
                      <Input
                        id="custom-sender"
                        value={customSender}
                        onChange={(e) => setCustomSender(e.target.value)}
                        placeholder="Enter sender name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-color">Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="custom-color"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          placeholder="#ff0000 or red"
                        />
                        <div
                          className="w-10 h-10 rounded border flex-shrink-0"
                          style={{ backgroundColor: customColor || "transparent" }}
                        ></div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 bg-red-600 text-white hover:bg-red-700 hover:text-white"
                          onClick={() => setCustomColor("#ef4444")}
                        >
                          Red
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
                          onClick={() => setCustomColor("#3b82f6")}
                        >
                          Blue
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 bg-green-600 text-white hover:bg-green-700 hover:text-white"
                          onClick={() => setCustomColor("#22c55e")}
                        >
                          Green
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 bg-purple-600 text-white hover:bg-purple-700 hover:text-white"
                          onClick={() => setCustomColor("#9333ea")}
                        >
                          Purple
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 bg-yellow-500 text-white hover:bg-yellow-600 hover:text-white"
                          onClick={() => setCustomColor("#eab308")}
                        >
                          Yellow
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 bg-gray-800 text-white hover:bg-gray-900 hover:text-white"
                          onClick={() => setCustomColor("#1f2937")}
                        >
                          Dark
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2"
                          onClick={() => setCustomColor("")}
                        >
                          Default
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Message Date & Time</Label>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {customDate ? format(customDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={customDate} onSelect={setCustomDate} initialFocus />
                          </PopoverContent>
                        </Popover>

                        <Input
                          type="time"
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                          className="w-24"
                        />

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCustomDate(new Date())
                            setCustomTime(format(new Date(), "HH:mm"))
                          }}
                        >
                          Now
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex w-full gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Send a message as ${customSender}...`}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    className={customColor ? "" : "bg-red-600 hover:bg-red-700"}
                    style={{
                      backgroundColor: customColor || "",
                      color: customColor ? "white" : "",
                    }}
                  >
                    <Send className="h-4 w-4 mr-1" /> Send
                  </Button>
                </div>
              </form>
            </CardFooter>
          </TabsContent>

          <TabsContent value="pinned" className="flex-1 flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-medium">Pinned Messages</h3>
              <p className="text-sm text-muted-foreground">
                These messages are visible to all users at the top of the chat.
              </p>
            </div>

            <ScrollArea className="flex-1 rounded-md border p-4">
              {pinnedMessages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No pinned messages. Pin a message to make it visible to all users.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {pinnedMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-start justify-between rounded-lg border p-3 bg-blue-50 dark:bg-blue-950"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${msg.sender === "GOD" ? "text-red-500" : ""}`}>
                            {msg.sender}
                          </span>
                          <span className="text-xs opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-xs text-blue-500">
                            <Pin className="h-3 w-3 inline mr-1" />
                            Pinned by {msg.pinnedBy} on {new Date(msg.pinnedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-1">{msg.text}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => pinnedMessagesRef.get(msg.id).put(null)}>
                        <PinOff className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="users" className="flex-1 flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-medium">User Management</h3>
              <p className="text-sm text-muted-foreground">
                Mute or unmute users to control who can send messages in the chat.
              </p>
            </div>

            <ScrollArea className="flex-1 rounded-md border">
              {sortedActiveUsers.length === 0 ? (
                <div className="flex h-full items-center justify-center p-4 text-muted-foreground">
                  No active users found.
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {sortedActiveUsers.map((user) => (
                    <div key={user} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <span className="font-medium">{user}</span>
                        {mutedUsers[user]?.muted && (
                          <span className="ml-2 text-xs text-red-500">
                            (Muted since {new Date(mutedUsers[user].timestamp).toLocaleString()})
                          </span>
                        )}
                        {hellModeUsers[user] && (
                          <span className="ml-2 text-xs text-red-600 flex items-center">
                            <Flame className="h-3 w-3 mr-1" /> Hell Mode Active
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={mutedUsers[user]?.muted ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleMute(user)}
                        >
                          {mutedUsers[user]?.muted ? (
                            <>
                              <Volume2 className="h-4 w-4 mr-1" /> Unmute
                            </>
                          ) : (
                            <>
                              <VolumeX className="h-4 w-4 mr-1" /> Mute
                            </>
                          )}
                        </Button>

                        {hellModeUsers[user] ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisableHellMode(user)}
                            className="border-red-200 hover:bg-red-100 hover:text-red-600"
                          >
                            <Flame className="h-4 w-4 mr-1 text-red-500" /> Release from Hell
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenHellModeDialog(user)}
                            className="border-red-200 hover:bg-red-100 hover:text-red-600"
                          >
                            <Flame className="h-4 w-4 mr-1 text-red-500" /> Hell Mode
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <HellModeDialog
              isOpen={hellModeDialogOpen}
              onClose={() => setHellModeDialogOpen(false)}
              username={selectedUserForHellMode}
              adminName={username}
            />
          </TabsContent>

          <TabsContent value="id-management" className="flex-1 flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-medium">ID Management</h3>
              <p className="text-sm text-muted-foreground">
                Manage users who can log in without an ID card. Add their ID number and name to allow them to create an
                account.
              </p>
            </div>

            {!isAdminVerified ? (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <Lock className="h-4 w-4 mr-2" /> Admin Authentication Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleVerifyAdminPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Enter Admin Password</Label>
                      <Input
                        id="admin-password"
                        type="password"
                        placeholder="Enter password to manage IDs"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                      />
                      {adminPasswordError && <p className="text-sm text-destructive">{adminPasswordError}</p>}
                    </div>
                    <Button type="submit" className="w-full">
                      <Shield className="h-4 w-4 mr-2" /> Verify Password
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Unlock className="h-4 w-4 mr-2" /> Add New ID
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleLogoutFromIDManagement}>
                      <Lock className="h-4 w-4 mr-1" /> Lock
                    </Button>
                  </CardHeader>
                  <CardFooter>
                    <form onSubmit={handleAddManualLogin} className="w-full space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="id-number">ID Number</Label>
                        <Input
                          id="id-number"
                          placeholder="e.g. 2266995"
                          value={newManualLoginId}
                          onChange={(e) => setNewManualLoginId(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="full-name">Full Name</Label>
                        <Input
                          id="full-name"
                          placeholder="e.g. John Smith"
                          value={newManualLoginName}
                          onChange={(e) => setNewManualLoginName(e.target.value)}
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        <UserPlus className="h-4 w-4 mr-1" /> Add ID to Allowed List
                      </Button>
                    </form>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Manual Login Statistics</CardTitle>
                  </CardHeader>
                  <CardFooter>
                    <div className="w-full space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border p-3 text-center">
                          <p className="text-sm text-muted-foreground">Allowed IDs</p>
                          <p className="text-2xl font-bold">{sortedAllowedLogins.length}</p>
                        </div>
                        <div className="rounded-lg border p-3 text-center">
                          <p className="text-sm text-muted-foreground">Registered Accounts</p>
                          <p className="text-2xl font-bold">{sortedManualAccounts.length}</p>
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-muted-foreground mb-1">Pending Registration</p>
                        <p className="text-lg font-bold">{sortedAllowedLogins.length - sortedManualAccounts.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Users who can register but haven't yet</p>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            )}

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base">Allowed IDs</CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1 px-4 pb-4">
                  {sortedAllowedLogins.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      No IDs have been added to the allowed list.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sortedAllowedLogins.map((login) => (
                        <div key={login.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <div className="font-medium">{login.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {login.id}
                              {!manualLoginAccounts[login.id] && (
                                <span className="ml-2 text-yellow-600 dark:text-yellow-400">(Not registered yet)</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Added by {login.addedBy} on {new Date(login.addedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveManualLogin(login.id)}
                            title="Remove from system"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </Card>

              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base">Registered Accounts</CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1 px-4 pb-4">
                  {sortedManualAccounts.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      No users have registered accounts yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sortedManualAccounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <div className="font-medium">{account.name}</div>
                            <div className="text-sm text-muted-foreground">ID: {account.id}</div>
                            <div className="text-sm text-muted-foreground flex items-center">
                              <Key className="h-3 w-3 mr-1" />
                              Password:{" "}
                              <span className="font-mono bg-muted px-1 ml-1 rounded">{account.passwordPlain}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Registered on {new Date(account.createdAt).toLocaleDateString()}
                              {account.lastLogin && (
                                <>
                                  <span className="mx-1">•</span>
                                  Last login: {new Date(account.lastLogin).toLocaleString()}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveManualLogin(account.id)}
                              className="text-red-500"
                              title="Remove account and block access"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-medium">Chat Settings</h3>
              <p className="text-sm text-muted-foreground">Control global chat settings and maintenance mode.</p>
            </div>

            <div className="rounded-md border p-4 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Chat Status</h4>
                    <p className="text-sm text-muted-foreground">Enable or disable the chat for all users</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="chat-status" className={chatStatus.enabled ? "text-green-600" : "text-red-600"}>
                      {chatStatus.enabled ? (
                        <span className="flex items-center">
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Enabled
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1" /> Disabled
                        </span>
                      )}
                    </Label>
                    <Switch id="chat-status" checked={chatStatus.enabled} onCheckedChange={handleToggleChatStatus} />
                  </div>
                </div>

                {!chatStatus.enabled && (
                  <div className="text-sm text-muted-foreground border-l-2 pl-3 ml-2 border-muted">
                    <p>
                      Disabled by {chatStatus.disabledBy} on {new Date(chatStatus.disabledAt || 0).toLocaleString()}
                    </p>
                    {chatStatus.reason && <p>Reason: {chatStatus.reason}</p>}
                  </div>
                )}

                {chatStatus.enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="disable-reason">Reason for disabling (optional):</Label>
                    <Textarea
                      id="disable-reason"
                      placeholder="Enter reason for maintenance..."
                      value={disableReason}
                      onChange={(e) => setDisableReason(e.target.value)}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      This message will be shown to users when the chat is disabled.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

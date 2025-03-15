import { cn } from "@/lib/utils"

interface ChatMessageProps {
  message: {
    sender: string
    text: string
    timestamp: number
  }
  isCurrentUser: boolean
}

export default function ChatMessage({ message, isCurrentUser }: ChatMessageProps) {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className={cn("flex gap-2", isCurrentUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2",
          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{message.sender}</span>
          <span className="text-xs opacity-70">{formattedTime}</span>
        </div>
        <p className="mt-1">{message.text}</p>
      </div>
    </div>
  )
}

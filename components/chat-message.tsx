import { cn } from "@/lib/utils"

interface ChatMessageProps {
  message: {
    sender: string
    text: string
    timestamp: number
    hellMode?: "normal" | "randomized" | "demonic"
  }
  isCurrentUser: boolean
  isHellMode?: boolean
}

export default function ChatMessage({ message, isCurrentUser, isHellMode = false }: ChatMessageProps) {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  const isGodMessage = message.sender === "GOD"
  const isHellModeMessage = message.hellMode && message.hellMode !== "normal"

  return (
    <div className={cn("flex gap-2", isCurrentUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2",
          isGodMessage
            ? "bg-red-600 text-white"
            : isHellMode && isHellModeMessage
              ? isCurrentUser
                ? "bg-red-900 text-red-200"
                : "bg-gray-800 text-red-300"
              : isHellMode
                ? isCurrentUser
                  ? "bg-red-800 text-red-200"
                  : "bg-gray-800 text-red-300"
                : isCurrentUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-semibold", isGodMessage ? "text-white" : isHellMode ? "text-red-400" : "")}>
            {message.sender}
          </span>
          <span
            className={cn(
              "text-xs opacity-70",
              isGodMessage ? "text-white opacity-90" : isHellMode ? "text-red-500 opacity-90" : "",
            )}
          >
            {formattedTime}
          </span>
          {message.hellMode && message.hellMode !== "normal" && (
            <span className="text-xs text-red-500 opacity-90">
              ({message.hellMode === "randomized" ? "corrupted" : "possessed"})
            </span>
          )}
        </div>
        <p className={cn("mt-1", isHellMode && message.hellMode === "demonic" && "font-semibold text-red-400")}>
          {message.text}
        </p>
      </div>
    </div>
  )
}

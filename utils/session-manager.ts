import Gun from "gun"

// Initialize Gun
const gun = Gun({
  peers: ["https://gun-manhattan.herokuapp.com/gun"],
})

// Reference to active sessions
const sessionsRef = gun.get("active-sessions")

export interface SessionData {
  username: string
  loginTime: number
  lastActive: number
  sessionId: string
  isAdmin: boolean
  forceLogout?: boolean
}

// Generate a unique session ID
export function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Register a new session
export function registerSession(username: string, isAdmin = false): string {
  const sessionId = generateSessionId()
  const now = Date.now()

  sessionsRef.get(sessionId).put({
    username,
    loginTime: now,
    lastActive: now,
    sessionId,
    isAdmin,
    forceLogout: false,
  })

  // Store session ID in localStorage
  localStorage.setItem("chat-session-id", sessionId)

  return sessionId
}

// Update last active timestamp
export function updateSessionActivity(sessionId: string): void {
  if (!sessionId) return

  sessionsRef.get(sessionId).get("lastActive").put(Date.now())
}

// Check if session is valid
export function checkSession(sessionId: string, callback: (isValid: boolean) => void): void {
  if (!sessionId) {
    callback(false)
    return
  }

  sessionsRef.get(sessionId).once((data) => {
    if (!data || data.forceLogout) {
      callback(false)
    } else {
      callback(true)
    }
  })
}

// Force logout a specific session
export function forceLogout(sessionId: string): void {
  sessionsRef.get(sessionId).get("forceLogout").put(true)
}

// End a session (on voluntary logout)
export function endSession(sessionId: string): void {
  if (!sessionId) return

  sessionsRef.get(sessionId).put(null)
  localStorage.removeItem("chat-session-id")
}

// Get all active sessions
export function subscribeToSessions(callback: (sessions: Record<string, SessionData>) => void): () => void {
  const handler = sessionsRef.map().on((data, id) => {
    if (data) {
      callback((prevSessions) => ({
        ...prevSessions,
        [id]: { ...data, sessionId: id },
      }))
    } else {
      callback((prevSessions) => {
        const newSessions = { ...prevSessions }
        delete newSessions[id]
        return newSessions
      })
    }
  })

  // Return unsubscribe function
  return () => {
    sessionsRef.map().off(handler)
  }
}

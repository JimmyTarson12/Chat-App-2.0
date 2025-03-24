import Gun from "gun"

// Initialize Gun
const gun = Gun({
  peers: ["https://gun-manhattan.herokuapp.com/gun"],
})

// Reference to hell mode settings
const hellModeRef = gun.get("hell-mode-settings")

export interface HellModeSettings {
  enabled: boolean
  enabledBy: string
  enabledAt: number
  demonMessages: string[]
  customMessage?: string
}

// Enable hell mode for a user
export function enableHellMode(username: string, enabledBy: string, demonMessages: string[] = []): Promise<void> {
  return new Promise((resolve) => {
    hellModeRef.get(username).put(
      {
        enabled: true,
        enabledBy,
        enabledAt: Date.now(),
        demonMessages: demonMessages.length > 0 ? demonMessages : getDefaultDemonMessages(),
      },
      () => {
        resolve()
      },
    )
  })
}

// Disable hell mode for a user
export function disableHellMode(username: string): Promise<void> {
  return new Promise((resolve) => {
    hellModeRef.get(username).put(
      {
        enabled: false,
        enabledAt: Date.now(),
      },
      () => {
        resolve()
      },
    )
  })
}

// Set custom demon messages for a user
export function setDemonMessages(username: string, messages: string[]): Promise<void> {
  return new Promise((resolve) => {
    hellModeRef
      .get(username)
      .get("demonMessages")
      .put(messages, () => {
        resolve()
      })
  })
}

// Set a single custom message for a user
export function setCustomMessage(username: string, message: string): Promise<void> {
  return new Promise((resolve) => {
    hellModeRef
      .get(username)
      .get("customMessage")
      .put(message, () => {
        resolve()
      })
  })
}

// Check if a user is in hell mode
export function checkHellMode(username: string): Promise<HellModeSettings | null> {
  return new Promise((resolve) => {
    hellModeRef.get(username).once((data) => {
      if (data && data.enabled) {
        resolve(data as HellModeSettings)
      } else {
        resolve(null)
      }
    })
  })
}

// Subscribe to hell mode changes for a user
export function subscribeToHellMode(
  username: string,
  callback: (settings: HellModeSettings | null) => void,
): () => void {
  const handler = hellModeRef.get(username).on((data) => {
    if (data && data.enabled) {
      callback(data as HellModeSettings)
    } else {
      callback(null)
    }
  })

  // Return unsubscribe function
  return () => {
    hellModeRef.get(username).off(handler)
  }
}

// Subscribe to all users in hell mode
export function subscribeToAllHellModeUsers(callback: (users: Record<string, HellModeSettings>) => void): () => void {
  const handler = hellModeRef.map().on((data, username) => {
    if (data && data.enabled) {
      callback((prevUsers) => ({
        ...prevUsers,
        [username]: data as HellModeSettings,
      }))
    } else {
      callback((prevUsers) => {
        const newUsers = { ...prevUsers }
        delete newUsers[username]
        return newUsers
      })
    }
  })

  // Return unsubscribe function
  return () => {
    hellModeRef.map().off(handler)
  }
}

// Get a random demonic message
export function getRandomDemonicMessage(): string {
  const messages = [
    "Your soul is mine!",
    "There is no escape from the darkness.",
    "I see your sins...",
    "The void awaits you.",
    "Your suffering pleases me.",
    "Darkness consumes all.",
    "Your fear is delicious.",
    "I am always watching.",
    "The abyss stares back.",
    "Your soul burns eternally.",
  ]

  return messages[Math.floor(Math.random() * messages.length)]
}

// Get default demon messages
export function getDefaultDemonMessages(): string[] {
  return [
    "I'm watching your every move...",
    "Your soul belongs to the void now.",
    "There is no escape from my realm.",
    "Your fear feeds me.",
    "The darkness grows stronger with each message.",
    "I can see your thoughts.",
    "Your suffering is just beginning.",
    "The void hungers for more souls.",
    "Your friends cannot save you now.",
    "The shadows whisper your name.",
  ]
}

// Randomize or demonize a message
export function processHellModeMessage(originalMessage: string): {
  text: string
  type: "normal" | "randomized" | "demonic"
} {
  const random = Math.random()

  // 40% chance of normal message
  if (random < 0.4) {
    return { text: originalMessage, type: "normal" }
  }

  // 30% chance of randomized message
  if (random < 0.7) {
    return { text: randomizeText(originalMessage), type: "randomized" }
  }

  // 30% chance of demonic message
  return { text: getRandomDemonicMessage(), type: "demonic" }
}

// Randomize text by scrambling some letters and adding glitchy characters
function randomizeText(text: string): string {
  const glitchChars = ["̷̢", "̵̨", "̶̡", "̴̢", "̸̧", "̵͔", "̶͚", "̷͓", "̴͎", "̸͖"]

  // Split into words
  const words = text.split(" ")

  // Process each word
  const processedWords = words.map((word) => {
    // Short words have a chance to be completely replaced with a glitch character
    if (word.length <= 3 && Math.random() < 0.3) {
      return glitchChars[Math.floor(Math.random() * glitchChars.length)].repeat(word.length)
    }

    // Longer words get some letters scrambled and glitch characters inserted
    const chars = word.split("")

    // Scramble some characters
    for (let i = 0; i < chars.length; i++) {
      if (Math.random() < 0.4) {
        // Swap with a random character in the word
        const swapIndex = Math.floor(Math.random() * chars.length)
        const temp = chars[i]
        chars[i] = chars[swapIndex]
        chars[swapIndex] = temp
      }

      // Add glitch character
      if (Math.random() < 0.2) {
        chars[i] += glitchChars[Math.floor(Math.random() * glitchChars.length)]
      }
    }

    return chars.join("")
  })

  return processedWords.join(" ")
}

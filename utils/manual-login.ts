import Gun from "gun"
import { sha256 } from "js-sha256"

// Initialize Gun
const gun = Gun({
  peers: ["https://gun-manhattan.herokuapp.com/gun"],
})

// Reference to allowed manual logins
const allowedManualLoginsRef = gun.get("allowed-manual-logins")
// Reference to manual login accounts
const manualLoginAccountsRef = gun.get("manual-login-accounts")

export interface AllowedManualLogin {
  id: string
  name: string
  addedBy: string
  addedAt: number
}

export interface ManualLoginAccount {
  id: string
  name: string
  passwordHash: string
  createdAt: number
  lastLogin?: number
}

// Add an ID to the allowed list
export function addAllowedManualLogin(id: string, name: string, adminName: string): Promise<void> {
  return new Promise((resolve) => {
    allowedManualLoginsRef.get(id).put(
      {
        id,
        name,
        addedBy: adminName,
        addedAt: Date.now(),
      },
      () => {
        resolve()
      },
    )
  })
}

// Remove an ID from the allowed list
export function removeAllowedManualLogin(id: string): Promise<void> {
  return new Promise((resolve) => {
    allowedManualLoginsRef.get(id).put(null, () => {
      resolve()
    })
  })
}

// Check if an ID is in the allowed list
export function checkAllowedManualLogin(id: string): Promise<AllowedManualLogin | null> {
  return new Promise((resolve) => {
    allowedManualLoginsRef.get(id).once((data) => {
      if (data && data.id && data.name) {
        resolve(data as AllowedManualLogin)
      } else {
        resolve(null)
      }
    })
  })
}

// Create a manual login account
export function createManualLoginAccount(id: string, name: string, password: string): Promise<void> {
  return new Promise((resolve) => {
    // Hash the password
    const passwordHash = sha256(password)

    manualLoginAccountsRef.get(id).put(
      {
        id,
        name,
        passwordHash,
        createdAt: Date.now(),
      },
      () => {
        resolve()
      },
    )
  })
}

// Verify manual login credentials
export function verifyManualLogin(id: string, password: string): Promise<ManualLoginAccount | null> {
  return new Promise((resolve) => {
    manualLoginAccountsRef.get(id).once((data) => {
      if (data && data.passwordHash) {
        // Hash the provided password and compare
        const passwordHash = sha256(password)

        if (passwordHash === data.passwordHash) {
          // Update last login time
          manualLoginAccountsRef.get(id).get("lastLogin").put(Date.now())
          resolve(data as ManualLoginAccount)
        } else {
          resolve(null)
        }
      } else {
        resolve(null)
      }
    })
  })
}

// Subscribe to allowed manual logins
export function subscribeToAllowedManualLogins(
  callback: (logins: Record<string, AllowedManualLogin>) => void,
): () => void {
  const handler = allowedManualLoginsRef.map().on((data, id) => {
    if (data) {
      callback((prevLogins) => ({
        ...prevLogins,
        [id]: { ...data, id } as AllowedManualLogin,
      }))
    } else {
      callback((prevLogins) => {
        const newLogins = { ...prevLogins }
        delete newLogins[id]
        return newLogins
      })
    }
  })

  // Return unsubscribe function
  return () => {
    allowedManualLoginsRef.map().off(handler)
  }
}

// Subscribe to manual login accounts
export function subscribeToManualLoginAccounts(
  callback: (accounts: Record<string, ManualLoginAccount>) => void,
): () => void {
  const handler = manualLoginAccountsRef.map().on((data, id) => {
    if (data) {
      callback((prevAccounts) => ({
        ...prevAccounts,
        [id]: { ...data, id } as ManualLoginAccount,
      }))
    } else {
      callback((prevAccounts) => {
        const newAccounts = { ...prevAccounts }
        delete newAccounts[id]
        return newAccounts
      })
    }
  })

  // Return unsubscribe function
  return () => {
    manualLoginAccountsRef.map().off(handler)
  }
}

// Password validation
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" }
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" }
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character" }
  }

  return { valid: true, message: "Password is strong" }
}

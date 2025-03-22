"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Key, UserPlus } from "lucide-react"
import {
  checkAllowedManualLogin,
  createManualLoginAccount,
  verifyManualLogin,
  validatePassword,
} from "@/utils/manual-login"

interface ManualLoginFormProps {
  onLogin: (username: string) => void
  onBack: () => void
}

export default function ManualLoginForm({ onLogin, onBack }: ManualLoginFormProps) {
  const [step, setStep] = useState<"id-check" | "create-account" | "login">("id-check")
  const [id, setId] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleIdCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!id.trim()) {
      setError("Please enter your ID number")
      return
    }

    setIsLoading(true)

    try {
      // First check if this ID already has an account
      const existingAccount = await verifyManualLogin(id, "")

      if (existingAccount) {
        // If account exists, go to login step
        setName(existingAccount.name)
        setStep("login")
        setIsLoading(false)
        return
      }

      // Check if ID is in the allowed list
      const allowedLogin = await checkAllowedManualLogin(id)

      if (allowedLogin) {
        // ID is allowed, go to account creation step
        setName(allowedLogin.name)
        setStep("create-account")
      } else {
        // ID is not allowed
        setError("This ID is not authorized for manual login. Please contact an administrator.")
      }
    } catch (error) {
      console.error("Error checking ID:", error)
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!password) {
      setError("Please enter a password")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Validate password strength
    const validation = validatePassword(password)
    if (!validation.valid) {
      setError(validation.message)
      return
    }

    setIsLoading(true)

    try {
      // Check again if ID is still allowed (in case admin removed it)
      const allowedLogin = await checkAllowedManualLogin(id)
      if (!allowedLogin) {
        setError("This ID is no longer authorized for manual login. Please contact an administrator.")
        setIsLoading(false)
        return
      }

      await createManualLoginAccount(id, name, password)

      toast({
        title: "Account created",
        description: "Your account has been created successfully. You can now log in.",
      })

      // Log the user in
      onLogin(name)
    } catch (error) {
      console.error("Error creating account:", error)
      setError("An error occurred while creating your account. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!password) {
      setError("Please enter your password")
      return
    }

    setIsLoading(true)

    try {
      // First check if ID is still allowed (in case admin removed it)
      const allowedLogin = await checkAllowedManualLogin(id)

      // Verify login credentials
      const account = await verifyManualLogin(id, password)

      if (!allowedLogin && !account) {
        // ID is not allowed and no account exists
        setError("This ID is not authorized for manual login. Please contact an administrator.")
        setIsLoading(false)
        return
      }

      if (!allowedLogin && account) {
        // ID was removed by admin but account exists
        setError("Your account has been disabled by an administrator.")
        setIsLoading(false)
        return
      }

      if (account) {
        // Login successful
        toast({
          title: "Login successful",
          description: `Welcome back, ${account.name}!`,
        })

        onLogin(account.name)
      } else {
        // Login failed
        setError("Invalid password. Please try again.")
      }
    } catch (error) {
      console.error("Error logging in:", error)
      setError("An error occurred while logging in. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle>
                {step === "id-check" && "Manual Login"}
                {step === "create-account" && "Create Account"}
                {step === "login" && "Login"}
              </CardTitle>
              <CardDescription>
                {step === "id-check" && "Enter your ID number to continue"}
                {step === "create-account" && "Create a password for your account"}
                {step === "login" && "Enter your password to log in"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {step === "id-check" && (
            <form onSubmit={handleIdCheck} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id">ID Number</Label>
                <Input
                  id="id"
                  placeholder="Enter your ID number (e.g. 2266995)"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  disabled={isLoading}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Checking..." : "Continue"}
              </Button>
            </form>
          )}

          {step === "create-account" && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium mb-1">Password requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>At least 8 characters long</li>
                  <li>At least one uppercase letter</li>
                  <li>At least one lowercase letter</li>
                  <li>At least one number</li>
                  <li>At least one special character</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                <UserPlus className="h-4 w-4 mr-2" />
                {isLoading ? "Creating Account..." : "Create Account & Login"}
              </Button>
            </form>
          )}

          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id-display">ID Number</Label>
                <Input id="id-display" value={id} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                <Key className="h-4 w-4 mr-2" />
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-muted-foreground text-center">
            This login option is only for users who don't have or have lost their ID card.
            <br />
            If you have an ID card, please use the barcode scanner instead.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

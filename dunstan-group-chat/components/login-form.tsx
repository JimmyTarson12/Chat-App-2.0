"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Shield } from "lucide-react"
import BarcodeScanner from "./barcode-scanner"
import AdminPasswordModal from "./admin-password-modal"
import { useToast } from "@/components/ui/use-toast"

interface LoginFormProps {
  onLogin: (username: string) => void
  onAdminLogin: () => void
}

export default function LoginForm({ onLogin, onAdminLogin }: LoginFormProps) {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false)
  const { toast } = useToast()

  const handleBarcodeScan = (id: string) => {
    if (id) {
      onLogin(`ID-${id}`)
    }
  }

  const handleAdminButtonClick = () => {
    setIsAdminModalOpen(true)
  }

  const handleAdminPasswordSubmit = (password: string) => {
    if (password === "SigmaBoyA") {
      onAdminLogin()
      setIsAdminModalOpen(false)
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect admin password",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Group Chat</CardTitle>
          <CardDescription>Scan your ID card to join</CardDescription>
        </CardHeader>
        <CardContent>
          <BarcodeScanner onScan={handleBarcodeScan} />
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" size="sm" onClick={handleAdminButtonClick} className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Admin Login
          </Button>
        </CardFooter>
      </Card>

      <AdminPasswordModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSubmit={handleAdminPasswordSubmit}
      />
    </div>
  )
}

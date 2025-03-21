"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Shield, CreditCard, UserCircle } from "lucide-react"
import BarcodeScanner from "./barcode-scanner"
import AdminPasswordModal from "./admin-password-modal"
import ManualLoginForm from "./manual-login-form"
import { useToast } from "@/components/ui/use-toast"
import { fetchStudentData, findStudentById, type Student } from "@/utils/csv-parser"
import { Loader2 } from "lucide-react"

interface LoginFormProps {
  onLogin: (username: string) => void
  onAdminLogin: () => void
}

export default function LoginForm({ onLogin, onAdminLogin }: LoginFormProps) {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false)
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [showManualLogin, setShowManualLogin] = useState<boolean>(false)
  const { toast } = useToast()

  useEffect(() => {
    async function loadStudentData() {
      setIsLoading(true)
      try {
        const data = await fetchStudentData()
        setStudents(data)
        console.log(`Loaded ${data.length} student records`)
      } catch (error) {
        console.error("Failed to load student data:", error)
        toast({
          title: "Data Error",
          description: "Failed to load student database. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadStudentData()
  }, [toast])

  const handleBarcodeScan = (id: string) => {
    if (!id) return

    const student = findStudentById(students, id)

    if (student) {
      const fullName = `${student.firstName} ${student.lastName}`
      onLogin(fullName)
      toast({
        title: "Welcome!",
        description: `Logged in as ${fullName}`,
      })
    } else {
      toast({
        title: "ID Not Found",
        description: `ID ${id} not found in the student database.`,
        variant: "destructive",
      })
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

  if (showManualLogin) {
    return <ManualLoginForm onLogin={onLogin} onBack={() => setShowManualLogin(false)} />
  }

  return (
    <div className="flex h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Group Chat</CardTitle>
          <CardDescription>Scan your ID card to join</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Loading student database...</p>
            </div>
          ) : (
            <BarcodeScanner onScan={handleBarcodeScan} />
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="w-full flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManualLogin(true)}
              className="flex items-center gap-1"
            >
              <UserCircle className="h-4 w-4" />
              Login without ID Card
            </Button>
          </div>

          <div className="w-full flex justify-center">
            <Button variant="outline" size="sm" onClick={handleAdminButtonClick} className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Admin Login
            </Button>
          </div>

          <div className="text-center mt-2">
            <p className="text-xs text-muted-foreground">
              <CreditCard className="h-3 w-3 inline mr-1" />
              Lost your ID card? Use the "Login without ID Card" option above.
            </p>
          </div>
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

"use client"

import type React from "react"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmationDialogProps {
  title: string
  description: string
  confirmText: string
  cancelText?: string
  destructive?: boolean
  onConfirm: () => void
  trigger: React.ReactNode
  doubleConfirm?: boolean
  doubleConfirmText?: string
}

export function ConfirmationDialog({
  title,
  description,
  confirmText,
  cancelText = "Cancel",
  destructive = false,
  onConfirm,
  trigger,
  doubleConfirm = false,
  doubleConfirmText = "Type CONFIRM to proceed",
}: ConfirmationDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmationText, setConfirmationText] = useState("")
  const [showDoubleConfirm, setShowDoubleConfirm] = useState(false)

  const handleConfirmClick = () => {
    if (doubleConfirm && !showDoubleConfirm) {
      setShowDoubleConfirm(true)
      return
    }

    if (doubleConfirm && showDoubleConfirm) {
      if (confirmationText !== "CONFIRM") {
        return
      }
    }

    onConfirm()
    setOpen(false)
    setShowDoubleConfirm(false)
    setConfirmationText("")
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setShowDoubleConfirm(false)
      setConfirmationText("")
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
          {doubleConfirm && showDoubleConfirm && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">{doubleConfirmText}</p>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Type CONFIRM"
              />
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirmClick()
            }}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            disabled={doubleConfirm && showDoubleConfirm && confirmationText !== "CONFIRM"}
          >
            {showDoubleConfirm ? "Confirm Deletion" : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
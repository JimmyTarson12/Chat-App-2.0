"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Flame } from "lucide-react"

interface DemonMessageProps {
  message: string
  onClose: () => void
}

export default function DemonMessage({ message, onClose }: DemonMessageProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 500) // Allow exit animation to complete
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full"
        >
          <div className="bg-black border border-red-600 text-red-500 p-4 rounded-md shadow-lg flex items-start gap-3">
            <div className="flex-shrink-0">
              <Flame className="h-6 w-6 text-red-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-red-400 mb-1">The Demon Speaks:</p>
              <p className="text-red-300">{message}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

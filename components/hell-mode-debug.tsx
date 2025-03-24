"use client"

import { useState, useEffect } from "react"
import { subscribeToHellMode, type HellModeSettings } from "@/utils/hell-mode"

interface HellModeDebugProps {
  username: string
}

export default function HellModeDebug({ username }: HellModeDebugProps) {
  const [settings, setSettings] = useState<HellModeSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const unsubscribe = subscribeToHellMode(username, (newSettings) => {
        console.log("HellModeDebug received settings:", newSettings)
        setSettings(newSettings)
      })

      return () => {
        unsubscribe()
      }
    } catch (err) {
      console.error("Error in HellModeDebug:", err)
      setError(String(err))
    }
  }, [username])

  if (error) {
    return <div className="fixed bottom-0 right-0 bg-red-900 text-white p-2 text-xs z-50">Hell Mode Error: {error}</div>
  }

  if (!settings) {
    return null
  }

  return (
    <div className="fixed bottom-0 right-0 bg-black/80 text-red-500 p-2 text-xs z-50 max-w-xs overflow-auto">
      <div>Hell Mode Active: {String(settings.enabled)}</div>
      <div>Enabled By: {settings.enabledBy}</div>
      <div>Enabled At: {new Date(settings.enabledAt).toLocaleString()}</div>
      <div>Messages: {settings.demonMessages?.length || 0}</div>
    </div>
  )
}

"use client"

import { track } from "@vercel/analytics"

// Custom event types
export type AnalyticsEvent =
  | "login"
  | "message_sent"
  | "admin_login"
  | "manual_login"
  | "account_created"
  | "user_muted"
  | "user_unmuted"
  | "message_pinned"
  | "message_unpinned"
  | "chat_disabled"
  | "chat_enabled"
  | "id_added"
  | "id_removed"

// Track custom events with optional properties
export function trackEvent(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
  track(event, properties)
}

// Predefined event tracking functions
export const Analytics = {
  // User events
  trackLogin: (method: "id_card" | "manual") => {
    trackEvent("login", { method })
  },

  trackMessageSent: (isAdmin = false) => {
    trackEvent("message_sent", { isAdmin })
  },

  trackAccountCreated: () => {
    trackEvent("account_created")
  },

  // Admin events
  trackAdminLogin: () => {
    trackEvent("admin_login")
  },

  trackUserMuted: (username: string) => {
    trackEvent("user_muted", { username })
  },

  trackUserUnmuted: (username: string) => {
    trackEvent("user_unmuted", { username })
  },

  trackMessagePinned: () => {
    trackEvent("message_pinned")
  },

  trackMessageUnpinned: () => {
    trackEvent("message_unpinned")
  },

  trackChatDisabled: (reason?: string) => {
    trackEvent("chat_disabled", { reason: reason || "Not specified" })
  },

  trackChatEnabled: () => {
    trackEvent("chat_enabled")
  },

  trackIdAdded: () => {
    trackEvent("id_added")
  },

  trackIdRemoved: () => {
    trackEvent("id_removed")
  },
}

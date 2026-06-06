"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { fetchApi } from "@/lib/api"
import { Wrench, Timer, Clock } from "lucide-react"

type MaintenanceData = {
  active: boolean
  title?: string
  message?: string
  icon?: string
  scheduled_start_at?: string | null
  scheduled_end_at?: string | null
}

const POLL_INTERVAL = 60_000 // 1 minute

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [maintenance, setMaintenance] = React.useState<MaintenanceData | null>(null)
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const checkMaintenance = React.useCallback(async () => {
    try {
      const data = await fetchApi("/api/v1/maintenance/status") as MaintenanceData
      setMaintenance(data)
    } catch {
      // Silently fail — if API is down, don't block the user
      setMaintenance(null)
    }
  }, [])

  React.useEffect(() => {
    // Only check on dashboard routes
    if (!pathname?.startsWith("/dashboard")) return

    checkMaintenance()

    intervalRef.current = setInterval(checkMaintenance, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [pathname, checkMaintenance])

  // Don't show overlay on the maintenance config page itself, landing page, or when inactive
  const isDashboardRoute = pathname?.startsWith("/dashboard")
  const isMaintenancePage = pathname === "/dashboard/maintenance"
  const isActive = maintenance?.active === true

  if (!isDashboardRoute || isMaintenancePage || !isActive) {
    return <>{children}</>
  }

  // Schedule info
  const hasSchedule = maintenance.scheduled_end_at
  const endTime = hasSchedule
    ? new Date(maintenance.scheduled_end_at!).toLocaleString("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <div className="mx-auto max-w-md px-6 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Wrench className="h-10 w-10 animate-pulse text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {maintenance.title || "Maintenance en cours"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {maintenance.message || "Nous effectuons des ameliorations techniques. Revenez dans quelques instants."}
        </p>
        {endTime && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Retour prevu vers {endTime}
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useUser } from "@clerk/clerk-react"
import { fetchApi } from "@/lib/api"
import { Wrench, Construction, HardHat, Cog, AlertTriangle, Clock } from "lucide-react"

type MaintenanceData = {
  active: boolean
  title?: string
  message?: string
  icon?: string
  scheduled_start_at?: string | null
  scheduled_end_at?: string | null
}

const POLL_INTERVAL = 60_000
const ADMIN_BYPASS_EMAILS = ["maruise237@gmail.com"]

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wrench,
  ShieldOff: HardHat,
  Timer: Clock,
  Clock,
  AlertTriangle,
  Cog,
  Construction,
}

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number; expired: boolean }

function calcTimeLeft(endAt: string | null | undefined): TimeLeft | null {
  if (!endAt) return null
  const diff = new Date(endAt).getTime() - Date.now()
  if (Number.isNaN(diff)) return null
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1_000) % 60),
    expired: false,
  }
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="group flex min-w-0 flex-1 flex-col items-center gap-2 sm:gap-3">
      <div className="relative w-full">
        <div className="absolute inset-0 -z-10 rounded-2xl bg-primary/5 blur-md transition-all duration-700 group-hover:bg-primary/15" />
        <div className="rounded-2xl border border-border bg-card/80 px-2 py-4 backdrop-blur sm:px-3 sm:py-6">
          <span className="block text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {String(value).padStart(2, "0")}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
        {label}
      </span>
    </div>
  )
}

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isLoaded } = useUser()
  const [maintenance, setMaintenance] = React.useState<MaintenanceData | null>(null)
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const [tick, setTick] = React.useState(0)

  const checkMaintenance = React.useCallback(async () => {
    try {
      const data = await fetchApi("/api/v1/maintenance/status") as MaintenanceData
      setMaintenance(data)
    } catch {
      setMaintenance(null)
    }
  }, [])

  React.useEffect(() => {
    if (!pathname?.startsWith("/dashboard")) return
    checkMaintenance()
    intervalRef.current = setInterval(checkMaintenance, POLL_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [pathname, checkMaintenance])

  // Re-render the countdown every second
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const isDashboardRoute = pathname?.startsWith("/dashboard")
  const isMaintenancePage = pathname === "/dashboard/maintenance"
  const isActive = maintenance?.active === true

  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase().trim() || ""
  const isAdmin = isLoaded && (
    user?.publicMetadata?.role === "admin" ||
    ADMIN_BYPASS_EMAILS.includes(userEmail)
  )

  // ╔═══════════════════════════════════════════════════════╗
  // ║  BREAK GLASS: If scheduled end time has passed,      ║
  // ║  show the dashboard immediately. The cron will        ║
  // ║  update the DB later, but users don't wait for it.   ║
  // ╚═══════════════════════════════════════════════════════╝
  const timeLeft = calcTimeLeft(maintenance?.scheduled_end_at)
  const isExpired = timeLeft?.expired === true

  if (
    !isDashboardRoute ||
    isMaintenancePage ||
    !isActive ||
    isAdmin ||
    isExpired  // past end -> show dashboard even if DB still says active
  ) {
    return <>{children}</>
  }

  void tick // forces re-evaluation each second

  const Icon = (maintenance.icon && ICON_MAP[maintenance.icon]) || Wrench

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl animate-pulse [animation-delay:1.5s]" />

      <div className="relative mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
        {/* Animated icon */}
        <div className="relative mb-6 sm:mb-8">
          <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-2xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/10 sm:h-24 sm:w-24">
            <Icon className="h-10 w-10 animate-spin text-primary [animation-duration:8s] sm:h-12 sm:w-12" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-primary" />
            </span>
          </div>
        </div>

        {/* Title + message */}
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground backdrop-blur sm:text-xs">
          <Construction className="h-3 w-3" />
          En cours
        </span>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-foreground sm:text-5xl">
          {maintenance.title || "Maintenance en cours"}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
          {maintenance.message || "Nous effectuons des ameliorations techniques. Revenez dans quelques instants."}
        </p>

        {/* Countdown */}
        {timeLeft ? (
          <div className="mt-8 w-full sm:mt-10">
            {timeLeft.expired ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                La fenetre de maintenance est terminee, nous reactivons le service.
              </div>
            ) : (
              <>
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
                  Retour prevu dans
                </p>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  <CountdownUnit value={timeLeft.days} label="Jours" />
                  <CountdownUnit value={timeLeft.hours} label="Heures" />
                  <CountdownUnit value={timeLeft.minutes} label="Minutes" />
                  <CountdownUnit value={timeLeft.seconds} label="Secondes" />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
            <Clock className="h-3.5 w-3.5 animate-pulse" />
            Duree indeterminee
          </div>
        )}
      </div>
    </div>
  )
}

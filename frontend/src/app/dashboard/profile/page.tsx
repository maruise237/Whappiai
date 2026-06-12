"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import {
  CalendarClock,
  ChevronRight,
  CreditCard,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
  Volume2,
} from "lucide-react"
import { useAuth, useClerk, useUser } from "@clerk/clerk-react"
import { toast } from "sonner"
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getPlanCode, getPlanLabel, PlanBadge } from "@/components/dashboard/plan-badge"
import { api } from "@/lib/api"
import { emitWappyEvent } from "@/lib/wappy-events"
import { cn, ensureString, safeDate } from "@/lib/utils"
import { getManagedGroupUsage, getPlanGroupLimit, getPlanUsageMessage } from "@/lib/plan-usage"

const COMMON_TIMEZONES = [
  'Africa/Douala', 'Africa/Lagos', 'Africa/Abidjan', 'Africa/Nairobi',
  'Africa/Johannesburg', 'Africa/Cairo', 'Africa/Casablanca',
  'Europe/Paris', 'Europe/London', 'America/New_York',
  'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Asia/Dubai', 'Asia/Tokyo', 'Asia/Shanghai', 'UTC'
];

type DbUserProfile = {
  organization_name?: string | null
  timezone?: string | null
  sound_notifications?: number | boolean | null
  role?: string | null
  plan_id?: string | null
  plan_status?: string | null
  subscription_expiry?: string | null
  message_limit?: number | null
  message_used?: number | null
}

type SubscriptionProfile = {
  plan_id?: string | null
  plan_code?: string | null
  status?: string | null
  access_allowed?: boolean
  current_period_end?: string | null
  subscription_expiry?: string | null
  message_limit?: number | null
  message_used?: number | null
}

export default function ProfilePage() {
  const { t } = useTranslation('profile')
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const [dbUser, setDbUser] = React.useState<DbUserProfile | null>(null)
  const [subscription, setSubscription] = React.useState<SubscriptionProfile | null>(null)
  const [managedGroupsUsed, setManagedGroupsUsed] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [organisation, setOrganisation] = React.useState("")
  const [timezone, setTimezone] = React.useState("Africa/Douala")
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [savingTimezone, setSavingTimezone] = React.useState(false)

  const fetchProfile = React.useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const [profileResult, subscriptionResult] = await Promise.allSettled([
        api.users.getProfile(token || undefined),
        api.subscriptions.current(token || undefined),
      ])
      const profileData = profileResult.status === "fulfilled" ? profileResult.value : null
      const nextUser = profileData?.user || profileData
      const nextSubscription = subscriptionResult.status === "fulfilled" ? subscriptionResult.value : null
      setDbUser(nextUser)
      setSubscription(nextSubscription)
      setOrganisation(ensureString(nextUser?.organization_name))
      setTimezone(nextUser?.timezone || "Africa/Douala")
      setManagedGroupsUsed(await getManagedGroupUsage(token || undefined))
    } catch (error) {
      console.error(error)
      setManagedGroupsUsed(0)
      toast.error(t('toast_load_error'))
    } finally {
      setLoading(false)
    }
  }, [getToken, t])

  React.useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (!isLoaded) return null

  const userEmail = user?.primaryEmailAddress?.emailAddress || ""
  const displayName = user?.fullName || userEmail.split("@")[0] || t('default_display_name')
  const initials = getInitials(displayName)
  const isAdmin = userEmail === "maruise237@gmail.com" || user?.publicMetadata?.role === "admin"
  const planCode = getPlanCode(subscription?.plan_code || subscription?.plan_id || dbUser?.plan_id || "trial")
  const planStatus = ensureString(subscription?.status || dbUser?.plan_status || "active")
  const expiry = subscription?.current_period_end || subscription?.subscription_expiry || dbUser?.subscription_expiry || null
  const messageLimit = Number(subscription?.message_limit || dbUser?.message_limit || 0)
  const messageUsed = Number(subscription?.message_used || dbUser?.message_used || 0)
  const hasOrganisationChanges = organisation !== ensureString(dbUser?.organization_name)

  async function handleSaveProfile() {
    try {
      setSavingProfile(true)
      const token = await getToken()
      const updatedUser = await api.users.updateProfile({ organization_name: organisation, timezone }, token || undefined)
      const nextUser = updatedUser?.user || updatedUser
      setDbUser(nextUser)
      setOrganisation(ensureString(nextUser?.organization_name))
      setTimezone(nextUser?.timezone || "Africa/Douala")
      toast.success(t('toast_save_success'))
      emitWappyEvent({ type: "profile", action: "saved" })
    } catch (error) {
      console.error(error)
      toast.error(t('toast_save_error'))
      emitWappyEvent({ type: "system", action: "error", errorType: "profile-save-failed" })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSoundToggle(value: boolean) {
    try {
      const token = await getToken()
      const updatedUser = await api.users.updateProfile({ sound_notifications: value ? 1 : 0 }, token || undefined)
      const nextUser = updatedUser?.user || updatedUser
      setDbUser(nextUser)
      toast.success(t('toast_sound_success'))
      emitWappyEvent({ type: "profile", action: "preferences-saved" })
    } catch (error) {
      console.error(error)
      toast.error(t('toast_sound_error'))
      emitWappyEvent({ type: "system", action: "error", errorType: "profile-preferences-failed" })
    }
  }

  async function handleTimezoneChange(nextTimezone: string) {
    setTimezone(nextTimezone)

    if (nextTimezone === (dbUser?.timezone || "Africa/Douala")) {
      return
    }

    try {
      setSavingTimezone(true)
      const token = await getToken()
      const updatedUser = await api.users.updateProfile({ timezone: nextTimezone }, token || undefined)
      const nextUser = updatedUser?.user || updatedUser
      setDbUser(nextUser)
      setTimezone(nextUser?.timezone || nextTimezone || "Africa/Douala")
      toast.success(t('toast_save_success'))
      emitWappyEvent({ type: "profile", action: "saved" })
    } catch (error) {
      console.error(error)
      setTimezone(dbUser?.timezone || "Africa/Douala")
      toast.error(t('toast_save_error'))
      emitWappyEvent({ type: "system", action: "error", errorType: "profile-timezone-failed" })
    } finally {
      setSavingTimezone(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl pb-12 sm:pb-16">
      <section className="relative overflow-hidden rounded-[28px] border border-primary/10 bg-[radial-gradient(circle_at_top,#dcfce7_0%,#f7fee7_32%,#ffffff_74%)] px-4 py-5 shadow-sm sm:px-6 md:px-10 md:py-10 dark:bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18)_0%,rgba(20,83,45,0.12)_42%,rgba(15,23,42,0.4)_100%)]">
        <div className="mb-4 inline-flex rounded-full border border-primary/15 bg-white/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary shadow-sm backdrop-blur md:absolute md:right-8 md:top-8 md:mb-0">
          {t('page_title')}
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar className="size-20 rounded-full border-4 border-white bg-primary/10 shadow-lg shadow-primary/10 after:rounded-full sm:size-24" size="lg">
              {user?.imageUrl ? (
                <AvatarImage src={user.imageUrl} alt={displayName} className="rounded-full" />
              ) : (
                <AvatarFallback className="rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              )}
              <AvatarBadge className="size-7 rounded-full border-2 border-white bg-primary text-white">
                <ShieldCheck className="h-4 w-4" />
              </AvatarBadge>
            </Avatar>
          </div>

          <div className="mt-5 space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{displayName}</h1>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="break-all">{userEmail}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <PlanBadge plan={planCode} active className="rounded-full px-3 py-1" />
              <Badge className={cn("rounded-full border px-3 py-1 text-[10px] font-semibold", statusTone(planStatus))}>
                {statusLabel(planStatus, t)}
              </Badge>
              {isAdmin && (
                <Badge className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary">
                  {t('admin_badge')}
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-5 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            <ProfilePill icon={<CreditCard className="h-4 w-4" />} label={t('plan_label')} value={getPlanLabel(planCode)} />
            <ProfilePill icon={<CalendarClock className="h-4 w-4" />} label={t('expiry_label')} value={expiry ? safeDate(expiry, { day: "2-digit", month: "short" }) : t('expiry_trial')} />
            <ProfilePill icon={<ShieldCheck className="h-4 w-4" />} label={t('actions_label')} value={messageLimit > 0 ? `${messageUsed}/${messageLimit}` : t('actions_unlimited')} />
          </div>

          <div className="mt-4 w-full max-w-2xl rounded-2xl border border-primary/15 bg-background/80 px-4 py-4 text-left shadow-sm backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Groupes proteges</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {getPlanUsageMessage(planCode, managedGroupsUsed)}
                </p>
              </div>
              <div className="self-start rounded-xl border border-primary/10 bg-card px-3 py-2 text-center shadow-sm sm:self-auto">
                <p className="text-lg font-bold text-primary">{managedGroupsUsed}/{getPlanGroupLimit(planCode)}</p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">quota utilise</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <Button asChild className="h-11 w-full flex-1 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
              <Link href="/dashboard/billing">
                <CreditCard className="mr-2 h-4 w-4" /> {t('manage_plan')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full flex-1 rounded-full border-primary/30 text-primary hover:bg-primary/5">
              <Link href="/dashboard/moderation">
                <ShieldCheck className="mr-2 h-4 w-4" /> {t('my_groups')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px] lg:gap-6">
        <div className="space-y-5 md:space-y-6">
          <SettingsBlock title={t('identity_title')} description={t('identity_desc')}>
            <ReadOnlyRow
              icon={<UserRound className="h-4 w-4" />}
              label={t('public_name_label')}
              value={displayName}
              meta={t('public_name_meta')}
            />
            <ReadOnlyRow
              icon={<Mail className="h-4 w-4" />}
              label={t('email_label')}
              value={userEmail}
              meta={t('email_meta')}
            />
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <Label className="text-xs font-semibold text-muted-foreground">{t('organisation_label')}</Label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <Input
                  value={organisation}
                  onChange={event => setOrganisation(event.target.value)}
                  placeholder={t('organisation_placeholder')}
                  className="h-11 rounded-xl border-primary/15 bg-background text-sm focus-visible:ring-primary/30"
                  disabled={loading}
                />
                {hasOrganisationChanges && (
                  <Button onClick={handleSaveProfile} disabled={savingProfile} className="h-11 rounded-xl">
                    <Save className="mr-2 h-4 w-4" />
                    {savingProfile ? t('saving_button') : t('save_button')}
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('organisation_hint')}
              </p>
            </div>
          </SettingsBlock>

          <SettingsBlock title={t('preferences_title')} description={t('preferences_desc')}>
            <ToggleRow
              icon={<Volume2 className="h-4 w-4" />}
              label={t('sound_notifications_label')}
              text={t('sound_notifications_text')}
              checked={Boolean(dbUser?.sound_notifications)}
              onCheckedChange={handleSoundToggle}
            />
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <Label className="text-xs font-semibold text-muted-foreground">{t('timezone_label')}</Label>
              <div className="mt-2">
                <select
                  value={timezone}
                  onChange={e => handleTimezoneChange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-primary/15 bg-background px-3 text-sm focus-visible:ring-primary/30"
                  disabled={savingTimezone}
                >
                  {COMMON_TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('timezone_hint')}
              </p>
            </div>
          </SettingsBlock>
        </div>

        <aside className="space-y-5 md:space-y-6">
          <Card className="overflow-hidden rounded-3xl border-destructive/20 bg-destructive/5 shadow-none">
            <CardContent className="p-0">
              <button
                type="button"
                onClick={() => {
                  emitWappyEvent({ type: "profile", action: "signout" })
                  signOut({ redirectUrl: "/login" })
                }}
                className="flex w-full items-center gap-3 border-b border-destructive/10 px-4 py-3.5 text-left text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5 md:px-5 md:py-4"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
                  <LogOut className="h-4 w-4" />
                </span>
                <span className="flex-1">{t('sign_out')}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  )
}

function SettingsBlock({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-3xl border-border/70 bg-card shadow-sm shadow-primary/5">
      <CardContent className="p-0">
        <div className="border-b bg-muted/20 px-4 py-3.5 md:px-5 md:py-4">
          <h2 className="text-sm font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <div className="divide-y divide-border/70">{children}</div>
      </CardContent>
    </Card>
  )
}

function ProfilePill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-left shadow-sm shadow-primary/5 backdrop-blur dark:bg-background/70">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold">{value}</p>
      </div>
    </div>
  )
}

function ReadOnlyRow({ icon, label, value, meta }: { icon: React.ReactNode; label: string; value: string; meta: string }) {
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-3.5 sm:flex-row sm:items-center md:px-5 md:py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{value || "-"}</p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground sm:self-auto">
        <ShieldCheck className="h-3 w-3" /> {meta}
      </span>
    </div>
  )
}

function ToggleRow({
  icon,
  label,
  text,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode
  label: string
  text: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-3.5 sm:flex-row sm:items-center md:px-5 md:py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{text}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="sm:self-auto" />
    </div>
  )
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("") || "W"
}

function statusLabel(status: string, t: (key: string) => string) {
  if (status === "expired") return t('status_expired')
  if (status === "canceled" || status === "cancelled") return t('status_canceled')
  if (status === "trial") return t('status_trial')
  return t('status_active')
}

function statusTone(status: string) {
  if (status === "expired" || status === "canceled" || status === "cancelled") {
    return "border-destructive/25 bg-destructive/10 text-destructive"
  }
  if (status === "trial") {
    return "border-state-warning/30 bg-state-warning-light text-state-warning"
  }
  return "border-primary/20 bg-primary/10 text-primary"
}

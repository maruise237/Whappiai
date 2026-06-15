"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react"
import Link from "next/link"
import { useAuth, useUser } from "@clerk/clerk-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { cn, safeDate, safeRender } from "@/lib/utils"
import {
  formatPaymentStatus,
  formatSupportCategory,
  formatSupportStatus,
  paymentStatusClass,
  supportStatusClass,
} from "@/lib/support"
import { CircleDot, CreditCard, LifeBuoy, Loader2, MessagesSquare, RefreshCw, Send, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

const categories = [
  { value: "general", label: "Question generale" },
  { value: "payment", label: "Probleme de paiement" },
  { value: "billing", label: "Abonnement et quota" },
  { value: "technical", label: "Bug ou blocage technique" },
  { value: "feedback", label: "Retour produit" },
]

export default function SupportPage() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [threads, setThreads] = React.useState<any[]>([])
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(null)
  const [threadDetail, setThreadDetail] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [reply, setReply] = React.useState("")
  const [form, setForm] = React.useState({
    subject: "",
    category: "general",
    paymentOrderId: "",
    paymentReference: "",
    message: "",
  })

  const isAdmin = user?.primaryEmailAddress?.emailAddress === "maruise237@gmail.com" || user?.publicMetadata?.role === "admin"

  const fetchThreads = React.useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.support.listThreads(token || undefined)
      const safeData = Array.isArray(data) ? data : []
      setThreads(safeData)
      setSelectedThreadId(current => {
        if (current && safeData.some(item => item.id === current)) return current
        return safeData[0]?.id || null
      })
    } catch (error) {
      console.error(error)
      toast.error("Impossible de charger vos demandes support")
    } finally {
      setLoading(false)
    }
  }, [getToken])

  const fetchThreadDetail = React.useCallback(async (threadId: string) => {
    setDetailLoading(true)
    try {
      const token = await getToken()
      const data = await api.support.getThread(threadId, token || undefined)
      setThreadDetail(data)
    } catch (error) {
      console.error(error)
      toast.error("Impossible de charger la conversation")
    } finally {
      setDetailLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchThreads().catch(console.error)
  }, [fetchThreads])

  React.useEffect(() => {
    if (!selectedThreadId) {
      setThreadDetail(null)
      return
    }
    fetchThreadDetail(selectedThreadId).catch(console.error)
  }, [fetchThreadDetail, selectedThreadId])

  const handleCreateThread = async () => {
    if (form.subject.trim().length < 4) {
      toast.error("Ajoutez un sujet un peu plus clair")
      return
    }
    if (form.message.trim().length < 10) {
      toast.error("Expliquez un peu plus le probleme")
      return
    }

    setSubmitting(true)
    try {
      const token = await getToken()
      const created = await api.support.createThread(form, token || undefined)
      toast.success("Votre demande a bien ete envoyee")
      setForm({
        subject: "",
        category: "general",
        paymentOrderId: "",
        paymentReference: "",
        message: "",
      })
      await fetchThreads()
      if (created?.id) {
        setSelectedThreadId(created.id)
      }
    } catch (error: any) {
      toast.error(error.message || "Impossible d'envoyer votre message")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async () => {
    if (!selectedThreadId || reply.trim().length < 2) return

    setSubmitting(true)
    try {
      const token = await getToken()
      await api.support.addMessage(selectedThreadId, { message: reply }, token || undefined)
      setReply("")
      toast.success("Message envoye au support")
      await Promise.all([fetchThreads(), fetchThreadDetail(selectedThreadId)])
    } catch (error: any) {
      toast.error(error.message || "Impossible d'envoyer votre reponse")
    } finally {
      setSubmitting(false)
    }
  }

  const openCount = threads.filter(thread => thread.status === "open" || thread.status === "pending").length

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <LifeBuoy className="h-5 w-5 text-primary" /> Support
          </h1>
          <p className="text-sm text-muted-foreground">
            Envoyez une demande claire, suivez les reponses et gardez une trace de vos echanges avec l&apos;equipe.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Badge className="w-fit border-none bg-primary/10 text-primary hover:bg-primary/10">
            {threads.length} conversation{threads.length > 1 ? "s" : ""}
          </Badge>
          <Badge className="w-fit border-none bg-amber-500/10 text-amber-600 hover:bg-amber-500/10">
            {openCount} ouverte{openCount > 1 ? "s" : ""}
          </Badge>
          {isAdmin ? (
            <Link href="/dashboard/support-inbox">
              <Button variant="outline" size="sm" className="w-full rounded-full sm:w-auto">
                <ShieldAlert className="mr-2 h-3.5 w-3.5" /> Ouvrir la boite admin
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <Card className="bg-card shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nouvelle demande</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Categorie</Label>
                  <Select value={form.category} onValueChange={value => setForm(current => ({ ...current, category: value }))}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Sujet</Label>
                  <Input
                    className="h-10 text-xs"
                    value={form.subject}
                    onChange={event => setForm(current => ({ ...current, subject: event.target.value }))}
                    placeholder="Ex: Paiement reussi mais forfait non actif"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Order ID paiement (optionnel)</Label>
                  <Input
                    className="h-10 text-xs"
                    value={form.paymentOrderId}
                    onChange={event => setForm(current => ({ ...current, paymentOrderId: event.target.value }))}
                    placeholder="Ex: d5ef7a4e-fa68-4d07..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Reference GeniusPay (optionnel)</Label>
                  <Input
                    className="h-10 text-xs"
                    value={form.paymentReference}
                    onChange={event => setForm(current => ({ ...current, paymentReference: event.target.value }))}
                    placeholder="Ex: SANDBOX_XXXX"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold text-muted-foreground">Message</Label>
                <Textarea
                  value={form.message}
                  onChange={event => setForm(current => ({ ...current, message: event.target.value }))}
                  placeholder="Expliquez le probleme, ce que vous attendiez et ce que vous avez observe."
                  className="min-h-32 text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Texte simple uniquement. Les messages sont nettoyes et journalises cote serveur pour eviter les injections et les abus.
                </p>
              </div>

              <Button onClick={handleCreateThread} disabled={submitting} className="w-full sm:w-auto">
                {submitting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
                Envoyer au support
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-none">
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Mes conversations</CardTitle>
              <Button variant="outline" size="sm" className="w-full rounded-full sm:w-auto" onClick={() => fetchThreads()}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Actualiser
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)
              ) : threads.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                  Aucune conversation pour le moment.
                </div>
              ) : (
                threads.map(thread => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition-colors hover:bg-muted/30",
                      selectedThreadId === thread.id ? "border-primary/30 bg-primary/5" : "bg-background/50"
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold">{safeRender(thread.subject)}</p>
                          <Badge className={cn("border-none text-[10px]", supportStatusClass(thread.status))}>
                            {formatSupportStatus(thread.status)}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {formatSupportCategory(thread.category)}
                          </Badge>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{safeRender(thread.lastMessagePreview, "Aucun message.")}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="break-all">{thread.ticketCode}</span>
                          <span>{safeDate(thread.lastMessageAt)}</span>
                          {thread.userUnreadCount ? <span>{thread.userUnreadCount} {thread.userUnreadCount > 1 ? "nouveaux" : "nouveau"} message{thread.userUnreadCount > 1 ? "s" : ""}</span> : null}
                        </div>
                      </div>
                      {thread.paymentStatus ? (
                        <div className="flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px]">
                          <CreditCard className="h-3 w-3" />
                          <Badge className={cn("border-none px-0 text-[10px]", paymentStatusClass(thread.paymentStatus))}>
                            {formatPaymentStatus(thread.paymentStatus)}
                          </Badge>
                        </div>
                      ) : null}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedThreadId ? (
              <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-12 text-center text-sm text-muted-foreground">
                Choisissez une conversation pour voir l&apos;historique.
              </div>
            ) : detailLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
              </div>
            ) : !threadDetail?.thread ? (
              <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-12 text-center text-sm text-muted-foreground">
                Conversation indisponible.
              </div>
            ) : (
              <>
                <div className="rounded-2xl border bg-background/50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{safeRender(threadDetail.thread.subject)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge className={cn("border-none text-[10px]", supportStatusClass(threadDetail.thread.status))}>
                          {formatSupportStatus(threadDetail.thread.status)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {formatSupportCategory(threadDetail.thread.category)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {threadDetail.thread.ticketCode}
                        </Badge>
                      </div>
                    </div>
                    {threadDetail.thread.paymentStatus ? (
                      <Badge className={cn("border-none text-[10px]", paymentStatusClass(threadDetail.thread.paymentStatus))}>
                        Paiement: {formatPaymentStatus(threadDetail.thread.paymentStatus)}
                      </Badge>
                    ) : null}
                  </div>
                  {threadDetail.thread.paymentOrderId || threadDetail.thread.paymentReference ? (
                    <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
                      <div>
                        <p className="font-semibold text-foreground">Order ID</p>
                        <p className="break-all font-mono">{safeRender(threadDetail.thread.paymentOrderId, "Non fourni")}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Reference</p>
                        <p className="break-all font-mono">{safeRender(threadDetail.thread.paymentReference, "Non fournie")}</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {(threadDetail.messages || []).map((message: any) => {
                    const isUser = message.authorRole === "user"
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "rounded-2xl border px-4 py-3",
                          isUser ? "border-primary/20 bg-primary/5" : "bg-background/60"
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                          {isUser ? <CircleDot className="h-3 w-3 text-primary" /> : <MessagesSquare className="h-3 w-3 text-foreground" />}
                          <span className="font-semibold text-foreground">{isUser ? "Vous" : "Support Whappi"}</span>
                          <span>{safeDate(message.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-6">{safeRender(message.message)}</p>
                      </div>
                    )
                  })}
                </div>

                {threadDetail.thread.status !== "closed" ? (
                  <div className="space-y-3 rounded-2xl border bg-background/50 p-4">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Repondre</Label>
                    <Textarea
                      value={reply}
                      onChange={event => setReply(event.target.value)}
                      placeholder="Ajoutez un complement, une capture textuelle ou un retour apres le dernier test."
                      className="min-h-28 text-sm"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        Reponse liee a votre compte et protegee par les memes controles que le formulaire initial.
                      </p>
                      <Button onClick={handleReply} disabled={submitting || reply.trim().length < 2} className="w-full sm:w-auto">
                        {submitting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
                        Envoyer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                    Cette conversation est fermee. Creez une nouvelle demande si besoin.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

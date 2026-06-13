"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react"
import { useAuth, useUser } from "@clerk/clerk-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { cn, ensureString, safeDate, safeRender } from "@/lib/utils"
import {
  formatPaymentStatus,
  formatSupportCategory,
  formatSupportPriority,
  formatSupportStatus,
  paymentStatusClass,
  supportPriorityClass,
  supportStatusClass,
} from "@/lib/support"
import {
  CreditCard,
  Inbox,
  Loader2,
  MessageSquareReply,
  RefreshCw,
  Search,
  Shield,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

const threadStatuses = ["all", "open", "pending", "resolved", "closed"]
const priorities = ["low", "normal", "high", "urgent"]

export default function SupportInboxPage() {
  const { getToken } = useAuth()
  const { user: currentUser } = useUser()
  const [threads, setThreads] = React.useState<any[]>([])
  const [transactions, setTransactions] = React.useState<any[]>([])
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(null)
  const [threadDetail, setThreadDetail] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [transactionsLoading, setTransactionsLoading] = React.useState(true)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [reply, setReply] = React.useState("")
  const [statusValue, setStatusValue] = React.useState("open")
  const [priorityValue, setPriorityValue] = React.useState("normal")

  const isAdmin = currentUser?.primaryEmailAddress?.emailAddress === "maruise237@gmail.com" || currentUser?.publicMetadata?.role === "admin"

  const fetchThreads = React.useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.support.adminListThreads({
        q: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      }, token || undefined)
      const safeData = Array.isArray(data) ? data : []
      setThreads(safeData)
      setSelectedThreadId(current => {
        if (current && safeData.some(item => item.id === current)) return current
        return safeData[0]?.id || null
      })
    } catch (error) {
      console.error(error)
      toast.error("Impossible de charger la boite support")
    } finally {
      setLoading(false)
    }
  }, [getToken, search, statusFilter])

  const fetchTransactions = React.useCallback(async () => {
    setTransactionsLoading(true)
    try {
      const token = await getToken()
      const data = await api.support.adminListTransactions({}, token || undefined)
      setTransactions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      toast.error("Impossible de charger les transactions")
    } finally {
      setTransactionsLoading(false)
    }
  }, [getToken])

  const fetchThreadDetail = React.useCallback(async (threadId: string) => {
    setDetailLoading(true)
    try {
      const token = await getToken()
      const data = await api.support.getThread(threadId, token || undefined)
      setThreadDetail(data)
      setStatusValue(ensureString(data?.thread?.status || "open"))
      setPriorityValue(ensureString(data?.thread?.priority || "normal"))
    } catch (error) {
      console.error(error)
      toast.error("Impossible de charger cette conversation")
    } finally {
      setDetailLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    if (!isAdmin) return
    fetchThreads().catch(console.error)
    fetchTransactions().catch(console.error)
  }, [fetchThreads, fetchTransactions, isAdmin])

  React.useEffect(() => {
    if (!selectedThreadId || !isAdmin) {
      setThreadDetail(null)
      return
    }
    fetchThreadDetail(selectedThreadId).catch(console.error)
  }, [fetchThreadDetail, isAdmin, selectedThreadId])

  const handleReply = async () => {
    if (!selectedThreadId || reply.trim().length < 2) return

    setSubmitting(true)
    try {
      const token = await getToken()
      await api.support.addMessage(selectedThreadId, {
        message: reply,
        status: statusValue,
        priority: priorityValue,
      }, token || undefined)
      setReply("")
      toast.success("Reponse envoyee au client")
      await Promise.all([fetchThreads(), fetchThreadDetail(selectedThreadId)])
    } catch (error: any) {
      toast.error(error.message || "Impossible d'envoyer la reponse")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedThreadId) return

    setSubmitting(true)
    try {
      const token = await getToken()
      await api.support.updateStatus(selectedThreadId, {
        status: statusValue,
        priority: priorityValue,
      }, token || undefined)
      toast.success("Statut mis a jour")
      await Promise.all([fetchThreads(), fetchThreadDetail(selectedThreadId)])
    } catch (error: any) {
      toast.error(error.message || "Impossible de mettre a jour le statut")
    } finally {
      setSubmitting(false)
    }
  }

  const metrics = React.useMemo(() => {
    const open = threads.filter(item => item.status === "open").length
    const pending = threads.filter(item => item.status === "pending").length
    const unread = threads.reduce((sum, item) => sum + Number(item.adminUnreadCount || 0), 0)
    const completedPayments = transactions.filter(item => item.status === "completed").length
    return { open, pending, unread, completedPayments }
  }, [threads, transactions])

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Shield className="mb-4 h-12 w-12 text-muted-foreground/20" />
        <h2 className="text-lg font-bold">Acces restreint</h2>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">Seuls les administrateurs peuvent consulter la boite support.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Inbox className="h-5 w-5 text-primary" /> Support admin
          </h1>
          <p className="text-sm text-muted-foreground">
            Centralisez les messages clients, repondez depuis une zone dediee et surveillez les statuts de transaction.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => fetchThreads()}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Actualiser les messages
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => fetchTransactions()}>
            <Wallet className="mr-2 h-3.5 w-3.5" /> Actualiser les transactions
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ouvertes" value={metrics.open} detail="nouvelles demandes" />
        <MetricCard label="En cours" value={metrics.pending} detail="a relancer ou verifier" />
        <MetricCard label="Non lus" value={metrics.unread} detail="messages client a lire" />
        <MetricCard label="Paiements completes" value={metrics.completedPayments} detail="sur les transactions recentes" />
      </div>

      <Tabs defaultValue="threads" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="threads">Messages support</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="threads" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Email, sujet ou extrait..."
                className="h-9 pl-8 text-xs"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 min-w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {threadStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status === "all" ? "Tous les statuts" : formatSupportStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9" onClick={() => fetchThreads()}>
                Filtrer
              </Button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="bg-card shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Boite de reception</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)
                ) : threads.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                    Aucun message support.
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
                            <Badge className={cn("border-none text-[10px]", supportPriorityClass(thread.priority))}>
                              {formatSupportPriority(thread.priority)}
                            </Badge>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{safeRender(thread.userEmail)}</p>
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{safeRender(thread.lastMessagePreview)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          {thread.adminUnreadCount ? (
                            <Badge className="border-none bg-amber-500/10 text-[10px] text-amber-600 hover:bg-amber-500/10">
                              {thread.adminUnreadCount} non lu{thread.adminUnreadCount > 1 ? "s" : ""}
                            </Badge>
                          ) : null}
                          <span>{safeDate(thread.lastMessageAt)}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-card shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Zone de reponse admin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedThreadId ? (
                  <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-12 text-center text-sm text-muted-foreground">
                    Selectionnez une conversation pour la traiter.
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
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
                          <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
                            <div>
                              <p className="font-semibold text-foreground">Client</p>
                              <p>{safeRender(threadDetail.thread.userEmail)}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Derniere activite</p>
                              <p>{safeDate(threadDetail.thread.lastMessageAt)}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Order ID</p>
                              <p className="font-mono">{safeRender(threadDetail.thread.paymentOrderId, "Aucun")}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Reference paiement</p>
                              <p className="font-mono">{safeRender(threadDetail.thread.paymentReference, "Aucune")}</p>
                            </div>
                          </div>
                        </div>
                        {threadDetail.thread.paymentStatus ? (
                          <Badge className={cn("border-none text-[10px]", paymentStatusClass(threadDetail.thread.paymentStatus))}>
                            Paiement: {formatPaymentStatus(threadDetail.thread.paymentStatus)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Statut</Label>
                        <Select value={statusValue} onValueChange={setStatusValue}>
                          <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {threadStatuses.filter(item => item !== "all").map(status => (
                              <SelectItem key={status} value={status}>{formatSupportStatus(status)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Priorite</Label>
                        <Select value={priorityValue} onValueChange={setPriorityValue}>
                          <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {priorities.map(priority => (
                              <SelectItem key={priority} value={priority}>{formatSupportPriority(priority)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button variant="outline" className="h-10 w-full" onClick={handleStatusUpdate} disabled={submitting}>
                          Mettre a jour
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(threadDetail.messages || []).map((message: any) => {
                        const isAdminMessage = message.authorRole === "admin"
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "rounded-2xl border px-4 py-3",
                              isAdminMessage ? "border-primary/20 bg-primary/5" : "bg-background/60"
                            )}
                          >
                            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="font-semibold text-foreground">{isAdminMessage ? "Admin" : safeRender(message.authorEmail, "Client")}</span>
                              <span>{safeDate(message.createdAt)}</span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-6">{safeRender(message.message)}</p>
                          </div>
                        )
                      })}
                    </div>

                    <div className="space-y-3 rounded-2xl border bg-background/50 p-4">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Reponse admin</Label>
                      <Textarea
                        value={reply}
                        onChange={event => setReply(event.target.value)}
                        placeholder="Redigez une reponse claire. Elle sera visible par le client dans son espace support."
                        className="min-h-28 text-sm"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11px] text-muted-foreground">
                          Cette zone est reservee aux admins. Les messages passent en texte nettoye et journalise.
                        </p>
                        <Button onClick={handleReply} disabled={submitting || reply.trim().length < 2}>
                          {submitting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <MessageSquareReply className="mr-2 h-3.5 w-3.5" />}
                          Envoyer au client
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card className="overflow-hidden bg-card shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-primary" /> Statuts de transaction
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-semibold text-muted-foreground">Client</TableHead>
                      <TableHead className="text-[10px] font-semibold text-muted-foreground">Forfait</TableHead>
                      <TableHead className="text-[10px] font-semibold text-muted-foreground">Montant</TableHead>
                      <TableHead className="text-[10px] font-semibold text-muted-foreground">Statut</TableHead>
                      <TableHead className="text-[10px] font-semibold text-muted-foreground">Reference</TableHead>
                      <TableHead className="text-[10px] font-semibold text-muted-foreground">Mise a jour</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsLoading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={6}><Skeleton className="h-10 w-full rounded-xl" /></TableCell>
                        </TableRow>
                      ))
                    ) : transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                          Aucune transaction a afficher.
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map(transaction => (
                        <TableRow key={transaction.id}>
                          <TableCell className="min-w-48">
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-xs font-semibold">{safeRender(transaction.userEmail, "Utilisateur inconnu")}</span>
                              <span className="truncate font-mono text-[10px] text-muted-foreground">{safeRender(transaction.id)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{safeRender(transaction.planName || transaction.planCode, "-")}</TableCell>
                          <TableCell className="text-xs">{Number(transaction.amount || 0).toLocaleString("fr-FR")} {safeRender(transaction.currency, "XOF")}</TableCell>
                          <TableCell>
                            <Badge className={cn("border-none text-[10px]", paymentStatusClass(transaction.status))}>
                              {formatPaymentStatus(transaction.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-44 truncate font-mono text-[10px] text-muted-foreground">{safeRender(transaction.reference, "-")}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{safeDate(transaction.updatedAt)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <Card className="bg-card shadow-none">
      <CardContent className="p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

"use client"

import * as React from "react"
import { useUser, useAuth } from "@clerk/nextjs"
import { 
  Zap, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  BarChart3,
  LayoutDashboard,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function CreditsPage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  
  const [balance, setBalance] = React.useState<number>(0)
  const [history, setHistory] = React.useState<any[]>([])
  const [stats, setStats] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchData = React.useCallback(async () => {
    try {
      const token = await getToken()
      const [balanceRes, historyRes, statsRes] = await Promise.all([
        api.get("/api/v1/credits/balance", token || undefined),
        api.get("/api/v1/credits/history", token || undefined),
        api.get("/api/v1/credits/stats?days=7", token || undefined)
      ])
      setBalance(balanceRes.balance || 0)
      setHistory(historyRes.history || [])
      setStats(statsRes.stats || [])
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [getToken])

  React.useEffect(() => { fetchData() }, [fetchData])

  if (isLoading) return <div className="p-8 text-center">Loading credits...</div>

  const usageLast7Days = stats.reduce((acc, curr) => acc + (curr.usage || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <LayoutDashboard className="h-3 w-3" />
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-foreground">Credits</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Credits & Usage</h1>
          <Badge variant="secondary">Pro Plan</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Current Balance" value={balance} sub="credits available" />
        <StatCard label="Usage (7d)" value={usageLast7Days} sub="credits consumed" />
        <StatCard label="Messages Sent" value={balance} sub="remaining capacity" />
        <StatCard label="Account Status" value="Active" sub="verified" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Consumption Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="usage" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Transaction History</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium">Date</TableHead>
                    <TableHead className="text-xs font-medium">Description</TableHead>
                    <TableHead className="text-xs font-medium text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground">No transactions found.</TableCell></TableRow>
                  ) : (
                    history.map(item => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{item.description}</TableCell>
                        <TableCell className={cn("text-xs font-bold text-right", item.type === 'add' ? "text-green-600" : "text-foreground")}>
                          {item.type === 'add' ? "+" : "-"}{Math.abs(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader><CardTitle className="text-sm font-medium">Claim Credits</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Reclaim your welcome credits if you haven't already.</p>
              <Button className="w-full h-9" onClick={async () => {
                const t = toast.loading("Claiming...");
                try {
                  const token = await getToken();
                  await api.post("/api/v1/credits/claim-welcome", {}, token || undefined);
                  toast.success("60 credits added!", { id: t });
                  fetchData();
                } catch (e) { toast.error("Already claimed", { id: t }); }
              }}>Claim 60 Credits 🎁</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Information</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• 1 message = 1 credit.</p>
              <p>• Incoming messages are free.</p>
              <p>• History kept for 30 days.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; subText?: string, sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}

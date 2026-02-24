"use client"

import * as React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { Loader2, TrendingUp, Zap, CreditCard } from "lucide-react"

export function AnalyticsCharts() {
  const { getToken } = useAuth()
  const [data, setData] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [days, setDays] = React.useState(7)

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const response = await api.activities.analytics(days, token || undefined)
      setData(response || [])
    } catch (error) {
      console.error("Failed to fetch analytics", error)
    } finally {
      setIsLoading(false)
    }
  }, [getToken, days])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div id="performance-charts" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Performance
        </h2>
        <div className="flex bg-muted rounded-md p-1">
          <button
            onClick={() => setDays(7)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${days === 7 ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            7 jours
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${days === 30 ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            30 jours
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages Volume */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" /> Volume Messages
            </CardTitle>
            <CardDescription className="text-[10px]">Messages envoyés par jour</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                  }}
                />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="messages" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Success Rate */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" /> Taux Réussite IA
            </CardTitle>
            <CardDescription className="text-[10px]">% de réponses sans erreur</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                  }}
                />
                <YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="aiRate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#10b981", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Credits Consumption */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-500" /> Consommation Crédits
            </CardTitle>
            <CardDescription className="text-[10px]">Crédits débités quotidiennement</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                  }}
                />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="credits"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorCredits)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

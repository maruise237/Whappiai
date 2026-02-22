'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { 
  Zap, 
  History, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard,
  AlertCircle,
  ChevronRight,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import confetti from 'canvas-confetti'

export default function CreditsPage() {
  const { getToken } = useAuth()
  const [credits, setCredits] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const [creditsRes, historyRes, statsRes] = await Promise.all([
        fetch('/api/v1/credits/balance', { headers: { 'Authorization': `Bearer \` } }).then(res => res.json()),
        fetch('/api/v1/credits/history', { headers: { 'Authorization': `Bearer \` } }).then(res => res.json()),
        fetch('/api/v1/credits/stats', { headers: { 'Authorization': `Bearer \` } }).then(res => res.json())
      ])

      if (creditsRes.status === 'success') setCredits(creditsRes.data)
      if (historyRes.status === 'success') setHistory(historyRes.data)
      if (statsRes.status === 'success') setStats(statsRes.data)
    } catch (error) {
      console.error('Error fetching credit data:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const usagePercentage = credits ? (credits.used / credits.limit) * 100 : 0
  const isLowCredits = credits && credits.balance < (credits.limit * 0.1)

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Credits & Usage</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">
            Gérez votre consommation et vos recharges en temps réel
          </p>
        </div>
        <Button className="rounded-full h-12 px-6 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-transform hover:scale-105">
          <Plus className="w-4 h-4 mr-2" />
          Acheter des crédits
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Wallet Card */}
        <Card className="lg:col-span-2 border-2 shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-primary/10" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="uppercase font-bold tracking-widest text-[10px]">Solde Disponible</CardDescription>
              <Zap className={w-5 h-5 \} />
            </div>
            <CardTitle className="text-6xl font-black tracking-tighter flex items-baseline gap-2">
              {credits?.balance}
              <span className="text-xl text-muted-foreground uppercase tracking-widest font-bold">Credits</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-muted-foreground">Utilisation ce mois</span>
                <span className={isLowCredits ? 'text-destructive' : 'text-primary'}>{Math.round(usagePercentage)}%</span>
              </div>
              <Progress value={usagePercentage} className="h-3 rounded-full bg-secondary" />
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                <span>{credits?.used} utilisés</span>
                <span>{credits?.limit} limite forfait</span>
              </div>
            </div>

            {isLowCredits && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20 animate-pulse">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <p className="text-[10px] font-black uppercase tracking-tight text-destructive">
                  Attention : Votre solde est bas. Vos automatisations risquent de s'arrêter bientôt.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card className="border-2 shadow-xl bg-secondary/30">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Tendance 7 jours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-background/50 border border-border">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Moyenne/Jour</span>
                <span className="text-xl font-black">{stats.length > 0 ? Math.round(stats.reduce((acc, s) => acc + s.used, 0) / 7) : 0}</span>
              </div>
              <div className="p-4 rounded-xl bg-background/50 border border-border">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Total Semaine</span>
                <span className="text-xl font-black">{stats.reduce((acc, s) => acc + s.used, 0)}</span>
              </div>
            </div>
            
            <div className="pt-2">
              <div className="h-24 w-full flex items-end gap-1">
                {Array.from({ length: 7 }).map((_, i) => {
                  const dayStat = stats[i] || { used: 0 }
                  const maxUsed = Math.max(...stats.map(s => s.used)) || 1
                  const height = Math.max(10, (dayStat.used / maxUsed) * 100)
                  return (
                    <div 
                      key={i} 
                      className="flex-1 bg-primary/20 rounded-t-sm transition-all hover:bg-primary"
                      style={{ height: \% }}
                      title={\ crédits}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between text-[8px] font-bold text-muted-foreground uppercase mt-2">
                <span>Lun</span>
                <span>Dim</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card className="border-2 shadow-2xl overflow-hidden">
        <CardHeader className="border-b bg-secondary/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Historique des transactions
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest">
                Détails complets de vos recharges et consommations
              </CardDescription>
            </div>
            <Button variant="ghost" className="rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary/5">
              Exporter CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/10 border-b">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.length > 0 ? (
                  history.map((tx) => (
                    <tr key={tx.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold block opacity-60">
                          {format(new Date(tx.created_at), 'dd MMM yyyy', { locale: fr })}
                        </span>
                        <span className="text-[8px] font-black uppercase opacity-40">
                          {format(new Date(tx.created_at), 'HH:mm')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={p-1.5 rounded-lg \}>
                            {tx.type === 'debit' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          </div>
                          <span className="text-xs font-black uppercase tracking-tight group-hover:translate-x-1 transition-transform inline-block">
                            {tx.description}
                          </span>
                        </div>
                      </td>
                      <td className={px-6 py-4 text-right font-black \}>
                        {tx.type === 'debit' ? '-' : '+'}{tx.amount}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground uppercase text-[10px] font-black tracking-widest">
                      Aucune transaction trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Footer / CTA Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <Card className="border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer group">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <CreditCard className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h4 className="font-black uppercase tracking-tighter text-sm">Passer au forfait Pro</h4>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Obtenez 10,000 crédits par mois</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </CardContent>
        </Card>

        <Card className="border border-border bg-card hover:border-primary/50 transition-all cursor-pointer group">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-black uppercase tracking-tighter text-sm">Analyse d'automatisation</h4>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Optimisez votre consommation d'IA</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

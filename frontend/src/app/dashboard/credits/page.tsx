"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Coins,
    History,
    ArrowUpRight,
    ArrowDownLeft,
    Search,
    Filter,
    Download,
    Calendar,
    Sparkles
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export default function CreditsHistoryPage() {
    const { getToken } = useAuth()
    const [data, setData] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)
    const [searchTerm, setSearchTerm] = React.useState("")

    const fetchCredits = async () => {
        setLoading(true)
        try {
            const token = await getToken()
            const response = await api.credits.get(token || undefined)
            if (response && response.data) {
                setData(response.data)
            }
        } catch (error) {
            console.error("Failed to fetch credits:", error)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchCredits()
    }, [])

    const filteredHistory = data?.history?.filter((item: any) =>
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

    return (
        <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-10 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                            <History className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight uppercase">Historique des Crédits</h1>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium italic opacity-70">
                        Consultez toutes vos transactions et utilisations de l'assistant IA.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="h-9 px-4 font-black text-xs uppercase tracking-widest bg-primary/5 text-primary border-primary/20">
                        SOLDE : {data?.balance || 0} CRÉDITS
                    </Badge>
                    <Button variant="outline" className="h-9 gap-2 text-xs font-bold uppercase tracking-widest border-2">
                        <Download className="w-4 h-4" />
                        Exporter
                    </Button>
                </div>
            </div>

            <Card className="border-2 border-primary/5 shadow-xl bg-white/50 dark:bg-card/50 backdrop-blur-xl">
                <CardHeader className="border-b border-primary/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
                            <Input
                                placeholder="Rechercher une transaction..."
                                className="pl-10 h-10 border-2 bg-white/50 dark:bg-background/20 font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-10 gap-2 font-bold uppercase tracking-widest text-[10px] opacity-60 hover:opacity-100">
                                <Filter className="w-3.5 h-3.5" />
                                Filtrer
                            </Button>
                            <Button variant="ghost" size="sm" className="h-10 gap-2 font-bold uppercase tracking-widest text-[10px] opacity-60 hover:opacity-100">
                                <Calendar className="w-3.5 h-3.5" />
                                Derniers 30 jours
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-12 w-full rounded-lg" />
                            ))}
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="p-4 bg-slate-100 dark:bg-primary/10 rounded-full opacity-20">
                                <History className="w-12 h-12" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black uppercase tracking-widest">Aucune transaction trouvée</p>
                                <p className="text-xs text-muted-foreground opacity-60">Votre historique apparaîtra ici dès vos premières actions.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50 dark:bg-primary/5">
                                    <TableRow className="hover:bg-transparent border-primary/5">
                                        <TableHead className="w-[150px] font-black uppercase tracking-widest text-[10px] py-6">Date</TableHead>
                                        <TableHead className="font-black uppercase tracking-widest text-[10px]">Description</TableHead>
                                        <TableHead className="w-[100px] font-black uppercase tracking-widest text-[10px]">Type</TableHead>
                                        <TableHead className="w-[120px] text-right font-black uppercase tracking-widest text-[10px]">Montant</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredHistory.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-primary/[0.02] border-primary/5 transition-colors">
                                            <TableCell className="text-[10px] font-bold text-muted-foreground uppercase opacity-80 py-4">
                                                {new Date(item.created_at).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                                                <br />
                                                <span className="text-[9px] opacity-40 italic">
                                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "p-2 rounded-lg border",
                                                        item.type === 'debit' ? "bg-rose-500/5 border-rose-500/10 text-rose-500" : "bg-emerald-500/5 border-emerald-500/10 text-emerald-500"
                                                    )}>
                                                        {item.type === 'debit' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-tight truncate max-w-[300px]">{item.description}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Badge variant="outline" className={cn(
                                                    "font-black text-[9px] uppercase tracking-widest px-2",
                                                    item.type === 'debit' ? "text-rose-500 border-rose-500/20 bg-rose-500/5" : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                                                )}>
                                                    {item.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={cn(
                                                "text-right font-black text-sm py-4 tabular-nums",
                                                item.type === 'debit' ? "text-rose-500" : "text-emerald-500"
                                            )}>
                                                {item.type === 'debit' ? '-' : '+'}{item.amount}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Coins, History, ArrowUpRight, ArrowDownLeft, Zap, Sparkles } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface CreditCardUIProps {
    credits: {
        balance: number
        used: number
        plan: string
        history: any[]
    } | null
    userRole: string | null
}

export function CreditCardUI({ credits, userRole }: CreditCardUIProps) {
    // Hide for admins as they have unlimited access and don't need the wallet UI
    if (!credits || userRole === 'admin') return null;

    const total = (credits?.balance || 0) + (credits?.used || 0);
    const usagePercentage = total > 0 ? Math.round((credits?.used || 0) / total * 100) : 0;

    // Format history for display
    const recentHistory = credits?.history?.slice(0, 3) || [];

    return (
        <Card className="overflow-hidden border-2 border-primary/10 shadow-2xl bg-white/50 dark:bg-card/50 backdrop-blur-xl group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />

            <CardHeader className="pb-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 group-hover:rotate-12 transition-transform">
                            <Coins className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-black uppercase tracking-widest">Mon Wallet</CardTitle>
                            <CardDescription className="text-[9px] font-bold uppercase opacity-60">Crédits AI Whappi</CardDescription>
                        </div>
                    </div>
                    <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest bg-primary/5 text-primary border-primary/20">
                        {credits?.plan || (userRole === 'admin' ? 'UNLIMITED' : 'TRIAL')}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10">
                <div className="flex flex-col items-center justify-center py-4 bg-slate-900/5 dark:bg-primary/10 rounded-2xl border border-slate-200 dark:border-primary/5 shadow-inner">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-1">Solde Actuel</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tighter text-primary">
                            {userRole === 'admin' ? '∞' : (credits?.balance || 0)}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground uppercase">Crédits</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                        <span className="text-muted-foreground">Utilisation</span>
                        <span className={cn(usagePercentage > 80 ? "text-rose-500" : "text-primary")}>
                            {userRole === 'admin' ? '0%' : `${usagePercentage}%`}
                        </span>
                    </div>
                    <Progress value={userRole === 'admin' ? 0 : usagePercentage} className="h-2 bg-slate-100 dark:bg-white/5" />
                    <p className="text-[9px] font-medium text-muted-foreground/60 text-center italic">
                        Les crédits sont déduits à chaque génération IA (1 message = 1 crédit).
                    </p>
                </div>

                {recentHistory.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                                <History className="w-3 h-3" />
                                Activités Récentes
                            </h4>
                            <Link href="/dashboard/credits" className="text-[9px] font-bold text-primary hover:underline uppercase tracking-widest">
                                Voir tout
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {recentHistory.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/30 dark:bg-white/5 border border-slate-100 dark:border-primary/5">
                                    <div className="flex items-center gap-2 text-[9px]">
                                        {item.type === 'debit' ? (
                                            <ArrowDownLeft className="w-3 h-3 text-rose-500" />
                                        ) : (
                                            <Sparkles className="w-3 h-3 text-emerald-500" />
                                        )}
                                        <span className="font-bold truncate max-w-[120px]">{item.description}</span>
                                    </div>
                                    <span className={cn(
                                        "font-black",
                                        item.type === 'debit' ? "text-rose-500" : "text-emerald-500"
                                    )}>
                                        {item.type === 'debit' ? '-' : '+'}{item.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Button variant="outline" asChild className="w-full h-11 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] border-2 border-primary/10 hover:bg-primary/5 hover:border-primary/20 transition-all gap-2 group/btn">
                    <Link href="/dashboard/billing">
                        <Zap className="w-4 h-4 group-hover/btn:animate-pulse" />
                        Gérer mon Plan
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}

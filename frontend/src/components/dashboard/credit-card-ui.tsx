"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Coins, History, ArrowUpRight, ArrowDownLeft, Zap } from "lucide-react"
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
  if (!credits || userRole === 'admin') return null;

  const total = (credits.balance || 0) + (credits.used || 0);
  const usagePercentage = total > 0 ? Math.round((credits.used || 0) / total * 100) : 0;
  const recentHistory = credits.history?.slice(0, 3) || [];

  return (
    <Card className="border-border bg-card">
      <CardHeader className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Coins className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Portefeuille</p>
              <p className="text-xs text-muted-foreground">Crédits IA</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs uppercase">
            {credits.plan}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        <div className="text-center py-4 bg-muted/30 rounded-lg border">
          <p className="text-xs text-muted-foreground font-medium">Solde actuel</p>
          <div className="flex items-baseline justify-center gap-1 mt-1">
            <span className="text-3xl font-bold text-primary">{credits.balance}</span>
            <span className="text-xs text-muted-foreground">crédits</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Utilisation</span>
            <span className={usagePercentage > 80 ? "text-destructive" : "text-primary"}>
              {usagePercentage}%
            </span>
          </div>
          <Progress value={usagePercentage} className="h-1.5" />
        </div>

        {recentHistory.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <History className="h-3.5 w-3.5" />
                Activité récente
              </p>
              <Link href="/dashboard/credits" className="text-xs font-medium text-primary hover:underline">
                Voir tout
              </Link>
            </div>
            <div className="space-y-2">
              {recentHistory.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                  <div className="flex items-center gap-2 text-xs">
                    {item.type === 'debit' ? (
                      <ArrowDownLeft className="h-3 w-3 text-destructive" />
                    ) : (
                      <ArrowUpRight className="h-3 w-3 text-green-600" />
                    )}
                    <span className="truncate max-w-[120px]">{item.description}</span>
                  </div>
                  <span className={cn(
                    "font-semibold",
                    item.type === 'debit' ? "text-destructive" : "text-green-600"
                  )}>
                    {item.type === 'debit' ? '-' : '+'}{item.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button asChild className="w-full h-9 gap-2" size="sm">
          <Link href="/dashboard/billing">
            <Zap className="h-3.5 w-3.5" />
            Améliorer le forfait
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

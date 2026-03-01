"use client";

import * as React from "react";
import {
  Zap,
  History,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import Link from "next/link";

const CREDIT_STATS = [
  { label: "Balance Actuelle", key: "balance", sub: "crédits dispos", icon: Zap },
  { label: "Utilisé (30j)", val: "42", sub: "messages IA", icon: TrendingUp },
  { label: "Économisé", val: "12€", sub: "vs assistant humain", icon: ShieldCheck },
  { label: "Validité", val: "Illimitée", sub: "pas d&apos;expiration", icon: History }
];

export default function CreditsPage() {
  const { getToken } = useAuth();
  const [credits, setCredits] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await api.credits.get(token || undefined);
      setCredits(data?.data || data);
    } catch (e) {
      console.error(e);
      toast.error("Erreur de chargement des crédits");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
         <Link href="/dashboard" className="hover:text-foreground transition-colors">Tableau de Bord</Link>
         <ChevronRight className="h-3 w-3" />
         <span className="text-foreground font-medium">Consommation & Crédits</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Vos Crédits Whappi
          </h1>
          <p className="text-sm text-muted-foreground">Suivi de votre consommation d&apos;IA.</p>
        </div>

        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-1.5
          h-auto text-[10px] font-semibold tracking-widest rounded-full">
           Plan : Free Trial
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {CREDIT_STATS.map((stat, i) => (
           <Card key={i} className="border-none shadow-none bg-muted/20">
             <CardContent className="p-4">
                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest mb-2">
                  {stat.label}
                </p>
                <div className="text-2xl font-bold">
                  {stat.key === "balance" ? (credits?.balance || 0) : stat.val}
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-1">{stat.sub}</p>
             </CardContent>
           </Card>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
         <div className="space-y-6">
            <Card className="border-none bg-muted/10 shadow-none">
               <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-semibold tracking-tight">Historique</CardTitle>
               </CardHeader>
               <CardContent className="pt-6">
                  <div className="h-[300px] flex items-center justify-center border border-dashed
                    rounded-lg bg-background/50 text-muted-foreground text-xs italic">
                     Graphique de consommation (Bientôt disponible)
                  </div>

                  <div className="overflow-x-auto">
                    <Table className="mt-8">
                       <TableHeader>
                          <TableRow className="border-muted/30">
                             <TableHead className="text-[10px] font-semibold">Date</TableHead>
                             <TableHead className="text-[10px] font-semibold">Action</TableHead>
                             <TableHead className="text-[10px] font-semibold text-right">Crédits</TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          <TableRow className="border-muted/20">
                             <TableCell colSpan={3} className="text-center py-10 text-xs text-muted-foreground opacity-40">
                                Aucune transaction récente.
                             </TableCell>
                          </TableRow>
                       </TableBody>
                    </Table>
                  </div>
               </CardContent>
            </Card>
         </div>

         <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5 shadow-sm">
               <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                     <Plus className="h-4 w-4 text-primary" /> Recharger
                  </CardTitle>
                  <CardDescription className="text-xs">Ajoutez des crédits instantanément.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="p-4 bg-background rounded border text-center space-y-2">
                     <div className="text-2xl font-bold">9.99€</div>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase">Pack 500 Crédits</p>
                     <Button size="sm" className="w-full h-8 rounded-full text-xs" asChild>
                        <Link href="/dashboard/billing">Acheter</Link>
                     </Button>
                  </div>
               </CardContent>
            </Card>

            <Card className="border-none bg-muted/20 shadow-none">
               <CardHeader>
                  <CardTitle className="text-sm font-bold">Fonctionnement</CardTitle>
               </CardHeader>
               <CardContent className="text-[11px] text-muted-foreground leading-relaxed space-y-3">
                  <p>• 1 message IA = 1 crédit.</p>
                  <p>• Mots-clés gratuits.</p>
                  <p>• Modération gratuite.</p>
               </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
}

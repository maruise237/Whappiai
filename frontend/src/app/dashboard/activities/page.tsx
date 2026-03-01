"use client";

import * as React from "react";
import {
  Activity,
  RefreshCcw,
  Search,
  History,
  Clock,
  MessageSquare,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACTIVITIES_PAGE_SIZE = 50;

export default function ActivitiesPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [activities, setActivities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [userFilter, setUserFilter] = React.useState("all");

  const isAdmin = user?.primaryEmailAddress?.emailAddress === "maruise237@gmail.com" ||
                  user?.publicMetadata?.role === "admin";

  const fetchActivities = React.useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await api.activities.list(ACTIVITIES_PAGE_SIZE, 0, token || undefined);
      setActivities(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Erreur de chargement du journal");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  React.useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filtered = activities.filter(a => {
    const action = a.action || "";
    const details = typeof a.details === "string" ? a.details : (a.details ? JSON.stringify(a.details) : "");
    const matchesSearch = action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.resource_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.user_email || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUser = userFilter === "all" || a.user_email === userFilter;

    return matchesSearch && matchesUser;
  });

  const uniqueUsers = Array.from(new Set(activities.map(a => a.user_email))).filter(Boolean);

  const getActionIcon = (action: string) => {
    const act = action || "";
    if (act.includes("send")) return <MessageSquare className="h-3 w-3" />;
    if (act.includes("moderation") || act.includes("block")) return <ShieldCheck className="h-3 w-3" />;
    if (act.includes("error")) return <AlertCircle className="h-3 w-3 text-destructive" />;
    return <Activity className="h-3 w-3" />;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Journal Activités
          </h1>
          <p className="text-sm text-muted-foreground">Historique complet des actions du système.</p>
        </div>

        <Button size="sm" variant="outline" onClick={fetchActivities} disabled={loading} className="rounded-full h-8">
          <RefreshCcw className={cn("h-3 w-3 mr-2", loading && "animate-spin")} /> Rafraîchir
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher une action, ressource ou utilisateur..."
            className="pl-8 h-9 text-xs bg-muted/20 border-none"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        {isAdmin && (
            <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs bg-muted/20 border-none">
                    <SelectValue placeholder="Filtrer par utilisateur" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tous les utilisateurs</SelectItem>
                    {uniqueUsers.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">Live Tracking</span>
        </div>
      </div>

      <Card className="border-none shadow-none bg-muted/10 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-muted/30">
                <TableHead className="text-[10px] font-semibold text-muted-foreground w-[160px]">Date & Heure</TableHead>
                {isAdmin && <TableHead className="text-[10px] font-semibold text-muted-foreground hidden sm:table-cell">Utilisateur</TableHead>}
                <TableHead className="text-[10px] font-semibold text-muted-foreground">Action</TableHead>
                <TableHead className="text-[10px] font-semibold text-muted-foreground hidden lg:table-cell">Ressource</TableHead>
                <TableHead className="text-[10px] font-semibold text-muted-foreground hidden md:table-cell">Détails</TableHead>
                <TableHead className="text-[10px] font-semibold text-muted-foreground text-right">Statut</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse border-muted/20">
                  <TableCell colSpan={5} className="h-12 bg-muted/5"></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs italic">
                  Aucune activité trouvée.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((activity) => (
                <TableRow key={activity.id} className="border-muted/20 hover:bg-muted/30 transition-colors group">
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 opacity-40" />
                      {(() => {
                        const date = new Date(activity.created_at || activity.timestamp);
                        return isNaN(date.getTime()) ? "Date invalide" : date.toLocaleString("fr-FR", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                        });
                      })()}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="hidden sm:table-cell">
                        <p className="text-[10px] font-semibold text-muted-foreground truncate max-w-[120px]">{activity.user_email || "System"}</p>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">

                      <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        {getActionIcon(activity.action || "")}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0">
                        <span className="text-xs font-semibold capitalize truncate">{(activity.action || "action").replace(/_/g, " ")}</span>
                        <Badge variant="outline" className="text-[8px] sm:hidden w-fit px-1 h-3.5 opacity-60">
                           {activity.resource_id || "sys"}
                        </Badge>
                      </div>

                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className="text-[10px] font-mono border-muted/50 text-muted-foreground group-hover:border-primary/30 group-hover:text-primary transition-colors">
                      {activity.resource_id || "system"}
                    </Badge>
                  </TableCell>

                  <TableCell className="max-w-[300px] hidden md:table-cell">

                    <p className="text-[11px] text-muted-foreground truncate">
                        {typeof activity.details === "string" ? activity.details : (activity.details ? JSON.stringify(activity.details) : "-")}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={cn(
                      "text-[9px] font-semibold border-none",
                      activity.success === 1 || activity.success === true
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : "bg-red-500/10 text-red-700 dark:text-red-400"
                    )}>
                      {activity.success === 1 || activity.success === true ? "Success" : "Error"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  );
}

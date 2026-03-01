"use client";

import * as React from "react";
import { Terminal, RefreshCcw, Trash2, Search, Filter, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function LogViewer() {
  const { getToken } = useAuth();
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await api.activities.list(100, 0, token || undefined);
      setLogs(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error(error);
      toast.error("Erreur de chargement des logs");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === "all" ||
      (filter === "error" ? log.success === 0 : log.success === 1);
    const detailsStr = typeof log.details === "string" ? log.details : JSON.stringify(log.details);
    const matchesSearch = log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      detailsStr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource_id?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleClearLogs = () => {
    setLogs([]);
    toast.success("Affichage réinitialisé localement");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <Card className="border-none shadow-none bg-muted/10">
      <CardHeader className="p-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" /> Console Système
            </CardTitle>
            <CardDescription className="text-[10px]">
              Surveillance en temps réel des actions API.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-full" onClick={fetchLogs}>
              <RefreshCcw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} /> Rafraîchir
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] rounded-full text-destructive"
              onClick={handleClearLogs}>
              <Trash2 className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-3 border-b flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Filtrer les logs..."
              className="pl-7 h-8 text-[11px] bg-background/50 border-none shadow-sm"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[120px] h-8 text-[11px] bg-background/50 border-none shadow-sm">
               <div className="flex items-center gap-2">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <SelectValue />
               </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[11px]">Tous</SelectItem>
              <SelectItem value="success" className="text-[11px]">Succès</SelectItem>
              <SelectItem value="error" className="text-[11px]">Erreurs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[400px] w-full bg-zinc-950/90 backdrop-blur-sm">
          <div className="p-4 font-mono text-[10px] space-y-1.5">
            {loading && logs.length === 0 ? (
               <div className="flex items-center justify-center py-20 text-zinc-500 italic">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Initialisation...
               </div>
            ) : filteredLogs.length === 0 ? (
               <div className="text-zinc-600 italic py-10 text-center">Aucun log correspondant.</div>
            ) : (
              filteredLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <span className="text-zinc-600 shrink-0 select-none">
                    [{new Date(log.timestamp || log.created_at).toLocaleTimeString()}]
                  </span>
                  <Badge variant="outline" className={cn(
                    "h-4 px-1 text-[8px] font-bold uppercase tracking-tighter shrink-0 border-none",
                    log.success ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {log.action?.substring(0, 15)}
                  </Badge>
                  <span className="text-zinc-300 break-all opacity-80 group-hover:opacity-100
                    transition-opacity">
                    {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

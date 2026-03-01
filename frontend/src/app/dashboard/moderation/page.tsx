"use client";

import * as React from "react";
import {
  Shield,
  MessageSquare,
  Users,
  Settings2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ModerationPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchSessions = React.useCallback(async () => {
    try {
      const token = await getToken();
      const data = await api.sessions.list(token || undefined);
      setSessions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  React.useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Hub de Modération
        </h1>
        <p className="text-sm text-muted-foreground">Gérez vos groupes et la sécurité de vos communautés.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ModerationFeatureCard
          title="Sécurité & Filtres"
          description="Anti-liens, mots proscrits et système d&apos;avertissements automatique."
          icon={<ShieldCheck className="h-5 w-5 text-primary" />}
          href="/dashboard/moderation/groups/moderation"
          sessions={sessions}
        />
        <ModerationFeatureCard
          title="Engagement IA"
          description="Générez des messages stratégiques et programmez des campagnes de groupe."
          icon={<Zap className="h-5 w-5 text-amber-500" />}
          href="/dashboard/moderation/groups/engagement"
          sessions={sessions}
        />
        <ModerationFeatureCard
          title="Vision 360 Groupes"
          description="Analysez l&apos;activité et gérez les membres de vos communautés."
          icon={<Users className="h-5 w-5 text-blue-500" />}
          href="/dashboard/moderation/groups/moderation"
          sessions={sessions}
        />
      </div>

      <div className="pt-8 border-t border-dashed">
         <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Documentation Rapide
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-muted/10 border-none shadow-none">
               <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-background rounded-lg border">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                     <p className="text-xs font-bold">Bot en mode Administrateur</p>
                     <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                        Pour que la modération fonctionne (suppression, bannissement), Whappi doit être
                        nommé administrateur du groupe WhatsApp.
                     </p>
                  </div>
               </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
}

function ModerationFeatureCard({ title, description, icon, href, sessions }: any) {
  const router = useRouter();

  const handleNavigate = (sessionId: string) => {
    router.push(`${href}?sessionId=${sessionId}`);
  };

  return (
    <Card className="group hover:border-primary/50 transition-all flex flex-col h-full shadow-sm">
      <CardHeader className="p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
            {icon}
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0 mt-auto">
        <div className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Choisir une session
          </p>
          <div className="space-y-1">
            {sessions.map((s: any) => (
              <button
                key={s.sessionId}
                onClick={() => handleNavigate(s.sessionId)}
                className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium
                  hover:bg-primary/5 hover:text-primary transition-all border border-transparent
                  hover:border-primary/20 bg-muted/30 group/btn"
              >
                <div className="flex items-center gap-2">
                   <div className={cn("w-1.5 h-1.5 rounded-full", s.isConnected ? "bg-green-500" : "bg-muted-foreground/30")} />
                   <span>{s.sessionId}</span>
                </div>
                <ChevronRight className="h-3 w-3 opacity-0 group-hover/btn:opacity-100
                  group-hover/btn:translate-x-1 transition-all" />
              </button>
            ))}
            {sessions.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic p-2 text-center border-2
                border-dashed rounded-lg">
                Aucune session active.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

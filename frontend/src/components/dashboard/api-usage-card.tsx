"use client";

import * as React from "react";
import { Code, Copy, Check, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";

interface ApiUsageCardProps {
  activeTab: string;
  sessionId: string;
  token: string;
}

export function ApiUsageCard({ activeTab, sessionId, token }: ApiUsageCardProps) {
  const [copied, setCopied] = React.useState(false);

  const getCurlSnippet = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://api.whappi.io";

    if (activeTab === "send") {
      return `curl -X POST ${baseUrl}/api/v1/sessions/${sessionId}/messages/send \
  -H "Authorization: Bearer ${token}" \
  -H "Content-Type: application/json" \
  -d "{
    "to": "2250102030405",
    "message": "Bonjour de Whappi API !"
  }"`;
    }

    return `curl -X GET ${baseUrl}/api/v1/sessions/${sessionId}/groups \
  -H "Authorization: Bearer ${token}"`;
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(getCurlSnippet());
    if (success) {
      setCopied(true);
      toast.success("Snippet copié !");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="border-none shadow-none bg-zinc-900 text-zinc-100 overflow-hidden">
      <CardHeader className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" /> API Quickstart
            </CardTitle>
            <CardDescription className="text-zinc-500 text-[10px]">
              Intégrez Whappi dans vos outils en quelques secondes.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 font-mono text-[11px] bg-black/50 leading-relaxed overflow-x-auto">
          <pre className="text-emerald-400">
            {getCurlSnippet()}
          </pre>
        </div>
        <div className="p-3 bg-white/5 flex items-center justify-between">
           <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">
            Compatible Node.js, Python, PHP
           </span>
           <Button variant="link" size="sm" className="h-auto p-0 text-[10px] text-primary font-bold">
            Full Docs →
           </Button>
        </div>
      </CardContent>
    </Card>
  );
}

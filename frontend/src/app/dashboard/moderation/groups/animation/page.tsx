"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Users, Search, Save, Calendar, Plus, Trash2, Clock, Zap, Pencil, ShieldCheck, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useAuth } from "@clerk/nextjs"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function AnimationPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session');
  const { getToken } = useAuth();

  const [groups, setGroups] = React.useState<any[]>([]);
  const [filteredGroups, setFilteredGroups] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedGroup, setSelectedGroup] = React.useState<any>(null);

  const [profileData, setProfileData] = React.useState({ mission: "", objectives: "", rules: "", theme: "" });
  const [productLinks, setProductLinks] = React.useState<any[]>([]);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [history, setHistory] = React.useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

  const [aiConfig, setAiConfig] = React.useState({ objective: "annonce", additionalInfo: "", includeLinks: true });
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [taskForm, setTaskForm] = React.useState({ message_content: "", media_url: "", media_type: "text" as any, scheduled_at: "", recurrence: "none" as any });

  const fetchGroups = async () => {
    if (!sessionId) return;
    try {
      setIsLoading(true);
      const token = await getToken();
      const data = await api.sessions.getGroups(sessionId, token || undefined);
      const groupsArray = Array.isArray(data) ? data : [];
      setGroups(groupsArray);
      setFilteredGroups(groupsArray);
      if (groupsArray.length > 0) {
        handleSelectGroup(groupsArray[0]);
      } else {
        setSelectedGroup(null);
      }
    } catch (error) {
      toast.error("Échec du chargement des groupes");
    } finally { setIsLoading(false); }
  };

  React.useEffect(() => { fetchGroups(); }, [sessionId]);

  React.useEffect(() => {
    const lower = searchQuery.toLowerCase();
    const groupsList = Array.isArray(groups) ? groups : [];
    setFilteredGroups(groupsList.filter(g => (g?.subject || g?.name || '').toLowerCase().includes(lower)));
  }, [searchQuery, groups]);

  const handleSelectGroup = async (group: any) => {
    if (!group?.id) return;
    setSelectedGroup(group);
    try {
      const token = await getToken();
      const [tasksRes, profileRes, linksRes] = await Promise.all([
        api.sessions.getAnimatorTasks(sessionId!, group.id, token || undefined),
        api.sessions.getGroupProfile(sessionId!, group.id, token || undefined),
        api.sessions.getGroupLinks(sessionId!, group.id, token || undefined)
      ]);

      // Defensive handling of API responses (fetchApi unwraps data.data if it exists)
      setTasks(Array.isArray(tasksRes) ? tasksRes : (tasksRes?.data || []));
      setProfileData(profileRes?.data || profileRes || { mission: "", objectives: "", rules: group.desc || "", theme: "" });
      setProductLinks(Array.isArray(linksRes) ? linksRes : (linksRes?.data || []));

      fetchHistory(group.id);
    } catch (e) {
      console.error("Error loading group data:", e);
      toast.error("Échec du chargement des détails du groupe");
    }
  };

  const fetchHistory = async (groupId: string) => {
    if (!sessionId || !groupId) return;
    setIsLoadingHistory(true);
    try {
      const token = await getToken();
      const res = await api.sessions.getAnimatorHistory(sessionId, groupId, {}, token || undefined);
      setHistory(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Failed to fetch history", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedGroup || !sessionId) return;
    setIsSaving(true);
    try {
      const token = await getToken();
      await api.sessions.updateGroupProfile(sessionId, selectedGroup.id, profileData, token || undefined);
      toast.success("Profil mis à jour");
    } catch (e) { toast.error("Erreur lors de l'enregistrement du profil"); } finally { setIsSaving(false); }
  };

  const handleSaveLinks = async () => {
    if (!selectedGroup || !sessionId) return;
    setIsSaving(true);
    try {
      const token = await getToken();
      await api.sessions.updateGroupLinks(sessionId, selectedGroup.id, productLinks, token || undefined);
      toast.success("Liens mis à jour");
    } catch (e) { toast.error("Erreur lors de l'enregistrement des liens"); } finally { setIsSaving(false); }
  };

  const handleGenerateAI = async () => {
    if (!selectedGroup || !sessionId) return;
    setIsGenerating(true);
    try {
      const token = await getToken();
      const res = await api.sessions.generateGroupMessage(sessionId, selectedGroup.id, aiConfig, token || undefined);
      const msg = res.data?.message || res.message || (typeof res === 'string' ? res : "");
      setTaskForm(prev => ({ ...prev, message_content: msg }));
      toast.success("Message généré");
    } catch (e) { toast.error("Erreur IA"); } finally { setIsGenerating(false); }
  };

  const handleSchedule = async () => {
    if (!selectedGroup || !sessionId || !taskForm.message_content) return;
    try {
      const token = await getToken();
      await api.sessions.addAnimatorTask(sessionId, selectedGroup.id, taskForm, token || undefined);
      toast.success("Tâche planifiée");
      setTaskForm({ message_content: "", media_url: "", media_type: "text", scheduled_at: "", recurrence: "none" });
      const response = await api.sessions.getAnimatorTasks(sessionId, selectedGroup.id, token || undefined);
      setTasks(response.data || []);
    } catch (e) { toast.error("Erreur lors de la planification"); }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      const token = await getToken();
      await api.sessions.deleteAnimatorTask(id, token || undefined);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success("Tâche supprimée");
    } catch (e) { toast.error("Erreur lors de la suppression"); }
  };

  if (isLoading) return <div className="p-8 text-center">Chargement des groupes...</div>;
  if (!sessionId) return <div className="p-8 text-center">Session non spécifiée.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Animation</h1>
            <Badge variant="secondary">{sessionId}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des groupes..."
              className="pl-8 h-9 text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Card>
            <ScrollArea className="h-[500px]">
              <div className="p-2 space-y-1">
                {filteredGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => handleSelectGroup(g)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 text-sm rounded-md transition-colors text-left",
                      selectedGroup?.id === g.id ? "bg-muted font-medium" : "hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <span className="truncate flex-1">{g.subject || g.name || 'Sans titre'}</span>
                    <ChevronRight className="h-3 w-3 opacity-50" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        <div className="space-y-8">
          {!selectedGroup ? (
            <div className="p-12 text-center border-dashed border-2 rounded-lg">
              <p className="text-sm text-muted-foreground">Sélectionnez un groupe à configurer</p>
            </div>
          ) : (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="profile">Profil</TabsTrigger>
                <TabsTrigger value="links">Liens</TabsTrigger>
                <TabsTrigger value="animation">Animation</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm font-medium">Profil du groupe</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Thématique</Label>
                      <Input value={profileData.theme} onChange={e => setProfileData({...profileData, theme: e.target.value})} className="h-9" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Mission</Label>
                      <Textarea value={profileData.mission} onChange={e => setProfileData({...profileData, mission: e.target.value})} className="min-h-[80px]" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Objectifs</Label>
                      <Textarea value={profileData.objectives} onChange={e => setProfileData({...profileData, objectives: e.target.value})} className="min-h-[80px]" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Règles</Label>
                      <Textarea value={profileData.rules} onChange={e => setProfileData({...profileData, rules: e.target.value})} className="min-h-[80px]" />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t p-4 flex justify-end">
                    <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>Enregistrer le profil</Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="links" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Liens produits</h3>
                  <Button size="sm" variant="outline" onClick={() => setProductLinks([...productLinks, { title: "", url: "", cta: "En savoir plus" }])}>
                    <Plus className="h-4 w-4 mr-2" /> Ajouter un lien
                  </Button>
                </div>
                <Accordion type="multiple" className="space-y-2">
                  {productLinks.map((link, i) => (
                    <AccordionItem key={i} value={`item-${i}`} className="border rounded-md px-4 bg-card">
                      <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                        {link.title || `Lien #${i + 1}`}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pb-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Titre</Label>
                          <Input value={link.title} onChange={e => { const nl = [...productLinks]; nl[i].title = e.target.value; setProductLinks(nl); }} className="h-9" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">URL</Label>
                          <Input value={link.url} onChange={e => { const nl = [...productLinks]; nl[i].url = e.target.value; setProductLinks(nl); }} className="h-9" />
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive h-8 px-0 hover:bg-transparent" onClick={() => setProductLinks(productLinks.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer le lien
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                <div className="flex justify-end pt-4 border-t">
                  <Button size="sm" onClick={handleSaveLinks} disabled={isSaving}>Enregistrer les liens</Button>
                </div>
              </TabsContent>

              <TabsContent value="animation" className="space-y-8">
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader><CardTitle className="text-sm font-medium">Génération IA</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Objectif</Label>
                        <Select value={aiConfig.objective} onValueChange={v => setAiConfig({...aiConfig, objective: v})}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="annonce">Annonce</SelectItem>
                            <SelectItem value="promotion">Promotion</SelectItem>
                            <SelectItem value="engagement">Engagement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button className="w-full h-9" onClick={handleGenerateAI} disabled={isGenerating}>
                          {isGenerating ? "Génération..." : "Générer avec l'IA"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Planifier un message</h3>
                  <div className="space-y-4">
                    <Textarea value={taskForm.message_content} onChange={e => setTaskForm({...taskForm, message_content: e.target.value})} className="min-h-[120px]" placeholder="Saisissez ou générez un message..." />
                    <div className="grid grid-cols-2 gap-4">
                      <Input type="datetime-local" value={taskForm.scheduled_at} onChange={e => setTaskForm({...taskForm, scheduled_at: e.target.value})} className="h-9" />
                      <Select value={taskForm.recurrence} onValueChange={v => setTaskForm({...taskForm, recurrence: v})}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Une fois</SelectItem>
                          <SelectItem value="daily">Quotidien</SelectItem>
                          <SelectItem value="weekly">Hebdomadaire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={handleSchedule} disabled={!taskForm.message_content}>
                      Planifier la tâche
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> File d&apos;attente ({tasks.length})
                  </h3>
                  <div className="divide-y border rounded-md">
                    {!Array.isArray(tasks) || tasks.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">Aucune tâche en attente</div>
                    ) : (
                      tasks.map(t => (
                        <div key={t?.id || Math.random()} className="p-4 flex items-center justify-between bg-card hover:bg-muted/30 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm truncate max-w-md">{t?.message_content || 'Sans contenu'}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {t?.scheduled_at ? new Date(t.scheduled_at).toLocaleString() : 'Non planifié'}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => t?.id && handleDeleteTask(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <History className="h-3.5 w-3.5" /> Historique des envois
                  </h3>
                  <div className="divide-y border rounded-md">
                    {isLoadingHistory ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">Chargement de l&apos;historique...</div>
                    ) : (!Array.isArray(history) || history.length === 0) ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">Aucun message envoyé précédemment</div>
                    ) : (
                      history.map(h => (
                        <div key={h?.id || Math.random()} className="p-4 flex items-center justify-between bg-muted/10">
                          <div className="min-w-0">
                            <p className="text-sm truncate max-w-md">{h?.message_content || 'Message vide'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] text-muted-foreground">
                                {(h?.updated_at || h?.scheduled_at) ? new Date(h.updated_at || h.scheduled_at).toLocaleString() : 'Date inconnue'}
                              </p>
                              <Badge variant={h?.status === 'completed' ? 'default' : 'destructive'} className="text-[8px] px-1 h-3.5">
                                {h?.status === 'completed' ? 'Succès' : 'Échec'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnimationPage() {
  return <React.Suspense fallback={<div className="p-8 text-center">Chargement...</div>}><AnimationPageContent /></React.Suspense>;
}

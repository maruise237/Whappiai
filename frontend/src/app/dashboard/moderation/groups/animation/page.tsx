"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Users, Search, Save, Calendar, Plus, Trash2, Clock, Zap, MessageSquare,
  Image as ImageIcon, Video, Music, Type, Pencil, ShieldCheck, ShieldAlert, ChevronRight, Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@clerk/nextjs"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface AnimatorTask {
  id: number; group_id: string; session_id: string; message_content: string;
  media_url?: string; media_type: 'text' | 'image' | 'video' | 'audio';
  scheduled_at: string; recurrence: 'none' | 'daily' | 'weekly';
  status: 'pending' | 'completed' | 'failed';
}

interface ProductLink { id?: number; title: string; description: string; url: string; cta: string; }

interface GroupProfile { mission: string; objectives: string; rules: string; theme: string; }

interface Group { id: string; subject: string; creation: number; desc?: string; participantsCount: number; settings?: any; }

function AnimationPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session');
  const { getToken } = useAuth();

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = React.useState<Group[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedGroup, setSelectedGroup] = React.useState<Group | null>(null);
  const [activeTab, setActiveTab] = React.useState("profile");

  const [profileFormData, setProfileFormData] = React.useState<GroupProfile>({ mission: "", objectives: "", rules: "", theme: "" });
  const [productLinks, setProductLinks] = React.useState<ProductLink[]>([]);
  const [animatorTasks, setAnimatorTasks] = React.useState<AnimatorTask[]>([]);
  const [aiObjective, setAiObjective] = React.useState("annonce");
  const [aiAdditionalInfo, setAiAdditionalInfo] = React.useState("");
  const [aiIncludeLinks, setAiIncludeLinks] = React.useState(true);
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false);
  const [editingTaskId, setEditingTaskId] = React.useState<number | null>(null);
  const [taskFormData, setTaskFormData] = React.useState({
    message_content: "", media_url: "", media_type: "text" as any, scheduled_at: "", recurrence: "none" as any
  });

  const fetchGroups = async () => {
    if (!sessionId) return;
    try {
      setIsLoading(true);
      const token = await getToken();
      const data = await api.sessions.getGroups(sessionId, token || undefined);
      setGroups(data || []);
      setFilteredGroups(data || []);
      if (data?.length > 0 && !selectedGroup) handleSelectGroup(data[0]);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message || "Chargement impossible"}`);
    } finally { setIsLoading(false); }
  };

  React.useEffect(() => { fetchGroups(); }, [sessionId]);

  React.useEffect(() => {
    const lower = searchQuery.toLowerCase();
    setFilteredGroups(groups.filter(g => g.subject.toLowerCase().includes(lower)));
  }, [searchQuery, groups]);

  const handleSelectGroup = async (group: Group) => {
    setSelectedGroup(group);
    try {
      const token = await getToken();
      const [tasksRes, profileRes, linksRes] = await Promise.all([
        api.sessions.getAnimatorTasks(sessionId!, group.id, token || undefined),
        api.sessions.getGroupProfile(sessionId!, group.id, token || undefined),
        api.sessions.getGroupLinks(sessionId!, group.id, token || undefined)
      ]);
      setAnimatorTasks(tasksRes.data || []);
      setProfileFormData(profileRes.data || { mission: "", objectives: "", rules: group.desc || "", theme: "" });
      setProductLinks(linksRes.data || []);
    } catch (e) { console.error(e); }
  };

  const handleSaveProfile = async () => {
    if (!selectedGroup || !sessionId) return;
    try {
      const token = await getToken();
      await api.sessions.updateGroupProfile(sessionId, selectedGroup.id, profileFormData, token || undefined);
      toast.success("Profil mis à jour");
    } catch (e) { toast.error("Erreur profile"); }
  };

  const handleSaveLinks = async () => {
    if (!selectedGroup || !sessionId) return;
    try {
      const token = await getToken();
      await api.sessions.updateGroupLinks(sessionId, selectedGroup.id, productLinks, token || undefined);
      toast.success("Liens mis à jour");
    } catch (e) { toast.error("Erreur liens"); }
  };

  const handleGenerateAiMessage = async () => {
    if (!selectedGroup || !sessionId) return;
    try {
      setIsGeneratingAi(true);
      const token = await getToken();
      const res = await api.sessions.generateGroupMessage(sessionId, selectedGroup.id, {
        objective: aiObjective, additionalInfo: aiAdditionalInfo, includeLinks: aiIncludeLinks
      }, token || undefined);
      const message = res.data?.message || res.message || (typeof res === 'string' ? res : "");
      if (!message) return toast.error("L'IA n'a pas retourné de message");
      setTaskFormData(prev => ({ ...prev, message_content: message }));
      toast.success("Message généré");
      setActiveTab("animator");
    } catch (e) { toast.error("Erreur IA"); } finally { setIsGeneratingAi(false); }
  };

  const handleAddTask = async () => {
    if (!selectedGroup || !sessionId || (!taskFormData.message_content && !taskFormData.media_url)) return;
    try {
      const token = await getToken();
      if (editingTaskId) {
        await api.sessions.updateAnimatorTask(editingTaskId, taskFormData, token || undefined);
        toast.success("Tâche mise à jour");
        setEditingTaskId(null);
      } else {
        await api.sessions.addAnimatorTask(sessionId, selectedGroup.id, taskFormData, token || undefined);
        toast.success("Tâche ajoutée");
      }
      setTaskFormData({ message_content: "", media_url: "", media_type: "text", scheduled_at: "", recurrence: "none" });
      const response = await api.sessions.getAnimatorTasks(sessionId, selectedGroup.id, token || undefined);
      setAnimatorTasks(response.data || []);
    } catch (e) { toast.error("Erreur tâche"); }
  };

  const handleEditTask = (task: AnimatorTask) => {
    setEditingTaskId(task.id);
    setTaskFormData({
      message_content: task.message_content, media_url: task.media_url || "",
      media_type: task.media_type, scheduled_at: task.scheduled_at, recurrence: task.recurrence
    });
    setActiveTab("animator");
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      const token = await getToken();
      await api.sessions.deleteAnimatorTask(taskId, token || undefined);
      setAnimatorTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success("Supprimé");
    } catch (e) { toast.error("Erreur suppression"); }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-12 h-12 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-lg" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chargement...</p>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto pb-20 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 py-8 border-b border-border mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-lg"><ArrowLeft className="w-5 h-5" /></Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight uppercase">Animation <span className="text-primary">Groupes</span></h1>
            <p className="text-xs font-medium text-muted-foreground opacity-60">Gérez l'engagement et l'IA de vos groupes WhatsApp</p>
          </div>
        </div>
        <Button onClick={() => { if (activeTab === 'profile') handleSaveProfile(); else if (activeTab === 'links') handleSaveLinks(); else handleAddTask(); }}
          className="shadow-lg h-11 px-8 font-black uppercase tracking-widest text-[10px] rounded-md gap-2">
          <Save className="w-4 h-4" /> Enregistrer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-12 items-start">
        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input placeholder="RECHERCHER..." className="pl-11 h-12 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Card className="border-border/50 bg-card/50 overflow-hidden">
            <ScrollArea className="h-[600px] p-2">
              {filteredGroups.map(g => (
                <button key={g.id} onClick={() => handleSelectGroup(g)} className={cn("w-full flex items-center gap-4 p-4 rounded-xl transition-all mb-1", selectedGroup?.id === g.id ? "bg-primary text-white shadow-lg" : "hover:bg-secondary/80 text-muted-foreground")}>
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", selectedGroup?.id === g.id ? "bg-white/20" : "bg-primary/10 text-primary")}><Users className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0"><div className="text-[11px] font-black uppercase truncate">{g.subject}</div></div>
                  <ChevronRight className="w-4 h-4 opacity-20" />
                </button>
              ))}
            </ScrollArea>
          </Card>
        </div>

        {/* Content */}
        <div className="space-y-12">
          {!selectedGroup ? <div className="py-40 text-center uppercase font-black opacity-20">Sélectionnez un groupe</div> : (
            <div className="animate-in slide-in-from-right-4 duration-500 space-y-12">
              {/* Group Info */}
              <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 flex items-center gap-8 relative overflow-hidden">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl"><ShieldCheck className="w-8 h-8" /></div>
                <div className="flex-1"><h2 className="text-xl font-black uppercase">{selectedGroup.subject}</h2><Badge variant="outline" className="text-[8px]">{selectedGroup.participantsCount} MEMBRES</Badge></div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl max-w-md">
                {['profile', 'links', 'animator'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} className={cn("flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all", activeTab === t ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:bg-card/50")}>
                    {t}
                  </button>
                ))}
              </div>

              {activeTab === 'profile' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Thématique</Label>
                    <Input value={profileFormData.theme} onChange={e => setProfileFormData({ ...profileFormData, theme: e.target.value })} className="h-12 rounded-xl" />
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Mission</Label>
                    <Textarea value={profileFormData.mission} onChange={e => setProfileFormData({ ...profileFormData, mission: e.target.value })} className="min-h-[100px] rounded-xl" />
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Règles</Label>
                    <Textarea value={profileFormData.rules} onChange={e => setProfileFormData({ ...profileFormData, rules: e.target.value })} className="min-h-[120px] rounded-xl" />
                  </div>
                  <Button onClick={handleSaveProfile} className="w-full h-14 font-black uppercase text-[10px]">Enregistrer Profil</Button>
                </div>
              )}

              {activeTab === 'links' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black uppercase opacity-40">Liens Produits</span>
                    <Button size="sm" onClick={() => setProductLinks([...productLinks, { title: "", description: "", url: "", cta: "En savoir plus" }])} className="text-[8px] uppercase">Ajouter</Button>
                  </div>
                  <div className="space-y-4">
                    {productLinks.map((link, i) => (
                      <Card key={i} className="p-6 space-y-4 border-border/50">
                        <Input value={link.title} onChange={e => { const nl = [...productLinks]; nl[i].title = e.target.value; setProductLinks(nl); }} placeholder="Titre" className="h-10 text-[10px] font-black" />
                        <Input value={link.url} onChange={e => { const nl = [...productLinks]; nl[i].url = e.target.value; setProductLinks(nl); }} placeholder="URL" className="h-10 text-[10px]" />
                        <Button variant="ghost" className="text-destructive text-[8px] font-black uppercase" onClick={() => setProductLinks(productLinks.filter((_, idx) => idx !== i))}>Supprimer</Button>
                      </Card>
                    ))}
                  </div>
                  <Button onClick={handleSaveLinks} className="w-full h-14 font-black uppercase text-[10px]">Enregistrer Liens</Button>
                </div>
              )}

              {activeTab === 'animator' && (
                <div className="space-y-8 animate-in fade-in">
                  {/* AI Generator */}
                  <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 space-y-6">
                    <h3 className="text-sm font-black uppercase">IA Animation</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Select value={aiObjective} onValueChange={setAiObjective}>
                        <SelectTrigger className="h-12 rounded-xl text-[10px] uppercase font-black"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['annonce', 'promotion', 'engagement'].map(o => <SelectItem key={o} value={o} className="text-[10px] uppercase">{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleGenerateAiMessage} disabled={isGeneratingAi} className="h-12 rounded-xl uppercase font-black text-[10px] gap-2">
                        {isGeneratingAi ? <div className="w-4 h-4 animate-spin border-2 border-t-transparent rounded-full" /> : <Zap className="w-4 h-4" />} Générer
                      </Button>
                    </div>
                  </div>

                  {/* Task Form */}
                  <div className="space-y-6 pt-12 border-t border-border">
                    <h3 className="text-sm font-black uppercase">Programmer un message</h3>
                    <Textarea value={taskFormData.message_content} onChange={e => setTaskFormData({ ...taskFormData, message_content: e.target.value })} className="min-h-[150px] rounded-2xl p-6" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input type="datetime-local" value={taskFormData.scheduled_at} onChange={e => setTaskFormData({ ...taskFormData, scheduled_at: e.target.value })} className="h-12 rounded-xl" />
                      <Select value={taskFormData.recurrence} onValueChange={v => setTaskFormData({ ...taskFormData, recurrence: v })}>
                        <SelectTrigger className="h-12 rounded-xl text-[10px] uppercase font-black"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['none', 'daily', 'weekly'].map(r => <SelectItem key={r} value={r} className="text-[10px] uppercase">{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddTask} className="w-full h-14 font-black uppercase text-[10px]">Programmer</Button>
                  </div>

                  {/* Queue */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase opacity-40 flex items-center gap-2"><Clock className="w-4 h-4" /> File d'attente ({animatorTasks.length})</h3>
                    <div className="space-y-3">
                      {animatorTasks.map(t => (
                        <div key={t.id} className="p-6 rounded-2xl border border-border bg-card flex items-center justify-between group">
                          <div className="space-y-1">
                            <p className="text-[11px] font-black uppercase truncate max-w-[300px]">{t.message_content}</p>
                            <Badge variant="outline" className="text-[8px]">{new Date(t.scheduled_at).toLocaleString()}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditTask(t)}><Pencil className="w-4 h-4 text-primary" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnimationPage() {
  return <React.Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}><AnimationPageContent /></React.Suspense>;
}

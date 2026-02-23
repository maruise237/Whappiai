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

  const [aiConfig, setAiConfig] = React.useState({ objective: "annonce", additionalInfo: "", includeLinks: true });
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [taskForm, setTaskForm] = React.useState({ message_content: "", media_url: "", media_type: "text" as any, scheduled_at: "", recurrence: "none" as any });

  const fetchGroups = async () => {
    if (!sessionId) return;
    try {
      setIsLoading(true);
      const token = await getToken();
      const data = await api.sessions.getGroups(sessionId, token || undefined);
      setGroups(data || []);
      setFilteredGroups(data || []);
      if (data?.length > 0) handleSelectGroup(data[0]);
    } catch (error) {
      toast.error("Failed to load groups");
    } finally { setIsLoading(false); }
  };

  React.useEffect(() => { fetchGroups(); }, [sessionId]);

  React.useEffect(() => {
    const lower = searchQuery.toLowerCase();
    setFilteredGroups(groups.filter(g => g.subject.toLowerCase().includes(lower)));
  }, [searchQuery, groups]);

  const handleSelectGroup = async (group: any) => {
    setSelectedGroup(group);
    try {
      const token = await getToken();
      const [tasksRes, profileRes, linksRes] = await Promise.all([
        api.sessions.getAnimatorTasks(sessionId!, group.id, token || undefined),
        api.sessions.getGroupProfile(sessionId!, group.id, token || undefined),
        api.sessions.getGroupLinks(sessionId!, group.id, token || undefined)
      ]);
      setTasks(tasksRes.data || []);
      setProfileData(profileRes.data || { mission: "", objectives: "", rules: group.desc || "", theme: "" });
      setProductLinks(linksRes.data || []);
    } catch (e) { console.error(e); }
  };

  const handleSaveProfile = async () => {
    if (!selectedGroup || !sessionId) return;
    setIsSaving(true);
    try {
      const token = await getToken();
      await api.sessions.updateGroupProfile(sessionId, selectedGroup.id, profileData, token || undefined);
      toast.success("Profile updated");
    } catch (e) { toast.error("Error saving profile"); } finally { setIsSaving(false); }
  };

  const handleSaveLinks = async () => {
    if (!selectedGroup || !sessionId) return;
    setIsSaving(true);
    try {
      const token = await getToken();
      await api.sessions.updateGroupLinks(sessionId, selectedGroup.id, productLinks, token || undefined);
      toast.success("Links updated");
    } catch (e) { toast.error("Error saving links"); } finally { setIsSaving(false); }
  };

  const handleGenerateAI = async () => {
    if (!selectedGroup || !sessionId) return;
    setIsGenerating(true);
    try {
      const token = await getToken();
      const res = await api.sessions.generateGroupMessage(sessionId, selectedGroup.id, aiConfig, token || undefined);
      const msg = res.data?.message || res.message || (typeof res === 'string' ? res : "");
      setTaskForm(prev => ({ ...prev, message_content: msg }));
      toast.success("Message generated");
    } catch (e) { toast.error("AI error"); } finally { setIsGenerating(false); }
  };

  const handleSchedule = async () => {
    if (!selectedGroup || !sessionId || !taskForm.message_content) return;
    try {
      const token = await getToken();
      await api.sessions.addAnimatorTask(sessionId, selectedGroup.id, taskForm, token || undefined);
      toast.success("Task scheduled");
      setTaskForm({ message_content: "", media_url: "", media_type: "text", scheduled_at: "", recurrence: "none" });
      const response = await api.sessions.getAnimatorTasks(sessionId, selectedGroup.id, token || undefined);
      setTasks(response.data || []);
    } catch (e) { toast.error("Error scheduling task"); }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      const token = await getToken();
      await api.sessions.deleteAnimatorTask(id, token || undefined);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success("Task deleted");
    } catch (e) { toast.error("Error deleting task"); }
  };

  if (isLoading) return <div className="p-8 text-center">Loading groups...</div>;
  if (!sessionId) return <div className="p-8 text-center">No session specified.</div>;

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
              placeholder="Search groups..."
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
                    <span className="truncate flex-1">{g.subject}</span>
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
              <p className="text-sm text-muted-foreground">Select a group to configure</p>
            </div>
          ) : (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="links">Links</TabsTrigger>
                <TabsTrigger value="animation">Animation</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm font-medium">Group Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Theme</Label>
                      <Input value={profileData.theme} onChange={e => setProfileData({...profileData, theme: e.target.value})} className="h-9" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Mission</Label>
                      <Textarea value={profileData.mission} onChange={e => setProfileData({...profileData, mission: e.target.value})} className="min-h-[80px]" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Rules</Label>
                      <Textarea value={profileData.rules} onChange={e => setProfileData({...profileData, rules: e.target.value})} className="min-h-[80px]" />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t p-4 flex justify-end">
                    <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>Save Profile</Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="links" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Product Links</h3>
                  <Button size="sm" variant="outline" onClick={() => setProductLinks([...productLinks, { title: "", url: "", cta: "Learn more" }])}>
                    <Plus className="h-4 w-4 mr-2" /> Add Link
                  </Button>
                </div>
                <Accordion type="multiple" className="space-y-2">
                  {productLinks.map((link, i) => (
                    <AccordionItem key={i} value={`item-${i}`} className="border rounded-md px-4 bg-card">
                      <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                        {link.title || `Link #${i + 1}`}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pb-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Title</Label>
                          <Input value={link.title} onChange={e => { const nl = [...productLinks]; nl[i].title = e.target.value; setProductLinks(nl); }} className="h-9" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">URL</Label>
                          <Input value={link.url} onChange={e => { const nl = [...productLinks]; nl[i].url = e.target.value; setProductLinks(nl); }} className="h-9" />
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive h-8 px-0 hover:bg-transparent" onClick={() => setProductLinks(productLinks.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove Link
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                <div className="flex justify-end pt-4 border-t">
                  <Button size="sm" onClick={handleSaveLinks} disabled={isSaving}>Save Links</Button>
                </div>
              </TabsContent>

              <TabsContent value="animation" className="space-y-8">
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader><CardTitle className="text-sm font-medium">AI Generation</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Objective</Label>
                        <Select value={aiConfig.objective} onValueChange={v => setAiConfig({...aiConfig, objective: v})}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="annonce">Announcement</SelectItem>
                            <SelectItem value="promotion">Promotion</SelectItem>
                            <SelectItem value="engagement">Engagement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button className="w-full h-9" onClick={handleGenerateAI} disabled={isGenerating}>
                          {isGenerating ? "Generating..." : "Generate with AI"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Schedule Message</h3>
                  <div className="space-y-4">
                    <Textarea value={taskForm.message_content} onChange={e => setTaskForm({...taskForm, message_content: e.target.value})} className="min-h-[120px]" placeholder="Type or generate message..." />
                    <div className="grid grid-cols-2 gap-4">
                      <Input type="datetime-local" value={taskForm.scheduled_at} onChange={e => setTaskForm({...taskForm, scheduled_at: e.target.value})} className="h-9" />
                      <Select value={taskForm.recurrence} onValueChange={v => setTaskForm({...taskForm, recurrence: v})}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Once</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={handleSchedule} disabled={!taskForm.message_content}>
                      Schedule Task
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Queue ({tasks.length})
                  </h3>
                  <div className="divide-y border rounded-md">
                    {tasks.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">No pending tasks</div>
                    ) : (
                      tasks.map(t => (
                        <div key={t.id} className="p-4 flex items-center justify-between bg-card hover:bg-muted/30 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm truncate max-w-md">{t.message_content}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(t.scheduled_at).toLocaleString()}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTask(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
  return <React.Suspense fallback={<div className="p-8 text-center">Loading...</div>}><AnimationPageContent /></React.Suspense>;
}

"use client"

import * as React from "react"
import { Plus, Search, Trash2, MoreHorizontal, FileSpreadsheet, UserPlus, ArrowLeft } from "lucide-react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { showConfirm } from "@/lib/swal"

export default function RecipientListsPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [lists, setLists] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isAddRecipientOpen, setIsAddRecipientOpen] = React.useState(false)
  const [isImportOpen, setIsImportOpen] = React.useState(false)

  const [selectedListId, setSelectedListId] = React.useState<string | null>(null)
  const [newListName, setNewListName] = React.useState("")
  const [newRecipient, setNewRecipient] = React.useState({ number: "", name: "" })

  const fetchLists = async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const data = await api.recipientLists.list(token || undefined)
      setLists(data || [])
    } catch (error) {
      toast.error("Failed to load lists")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => { fetchLists() }, [])

  const handleCreateList = async () => {
    if (!newListName) return
    try {
      const token = await getToken()
      await api.recipientLists.create({ name: newListName, recipients: [] }, token || undefined)
      toast.success("List created")
      setIsCreateOpen(false)
      setNewListName("")
      fetchLists()
    } catch (error) {
      toast.error("Failed to create list")
    }
  }

  const handleAddRecipient = async () => {
    if (!selectedListId || !newRecipient.number) return
    try {
      const token = await getToken()
      await api.recipientLists.addRecipient(selectedListId, newRecipient, token || undefined)
      toast.success("Recipient added")
      setIsAddRecipientOpen(false)
      setNewRecipient({ number: "", name: "" })
      fetchLists()
    } catch (error) {
      toast.error("Failed to add recipient")
    }
  }

  const handleDeleteList = async (id: string) => {
    const res = await showConfirm("Delete list?", "This action cannot be undone.", "warning")
    if (!res.isConfirmed) return
    try {
      const token = await getToken()
      await api.recipientLists.delete(id, token || undefined)
      toast.success("List deleted")
      fetchLists()
    } catch (error) {
      toast.error("Failed to delete list")
    }
  }

  const filteredLists = lists.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Recipient Lists</h1>
          <p className="text-sm text-muted-foreground">Manage your contact groups for campaigns.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search lists..." className="pl-8 h-9 text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New List
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-medium text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Recipients</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Created</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center text-xs">Loading lists...</TableCell></TableRow>
            ) : filteredLists.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center text-xs text-muted-foreground">No lists found.</TableCell></TableRow>
            ) : (
              filteredLists.map((list) => (
                <TableRow key={list.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{list.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{list.count} contacts</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(list.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedListId(list.id); setIsAddRecipientOpen(true); }}>
                          <UserPlus className="h-4 w-4 mr-2" /> Add Contact
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteList(list.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Recipient List</DialogTitle>
            <DialogDescription>Create a group to organize your contacts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase">List Name</Label>
              <Input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="e.g. Newsletter Subscribers" className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateList}>Create List</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddRecipientOpen} onOpenChange={setIsAddRecipientOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Add a single recipient to this list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase">Phone Number</Label>
              <Input value={newRecipient.number} onChange={e => setNewRecipient({...newRecipient, number: e.target.value})} placeholder="237..." className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase">Name (Optional)</Label>
              <Input value={newRecipient.name} onChange={e => setNewRecipient({...newRecipient, name: e.target.value})} placeholder="John Doe" className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddRecipientOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRecipient}>Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

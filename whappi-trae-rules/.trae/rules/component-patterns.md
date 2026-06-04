# Patterns de Composants - Whappi

Ce fichier contient des exemples concrets et réutilisables de composants pour Whappi.

## 📋 Table des Matières
1. [Navigation & Layout](#navigation--layout)
2. [Formulaires WhatsApp](#formulaires-whatsapp)
3. [Affichage de Messages](#affichage-de-messages)
4. [Gestion des Contacts](#gestion-des-contacts)
5. [Dashboard & Statistiques](#dashboard--statistiques)

---

## 1. Navigation & Layout

### Sidebar Navigation
```tsx
// components/layouts/whappi-sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  MessageSquare, 
  Users, 
  BarChart3, 
  Settings,
  LogOut 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Messages', href: '/dashboard', icon: MessageSquare },
  { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
  { name: 'Statistiques', href: '/dashboard/stats', icon: BarChart3 },
  { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
]

export function WhappiSidebar() {
  const pathname = usePathname()
  
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold text-primary">Whappi</h2>
        <p className="text-xs text-muted-foreground">WhatsApp Business API</p>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  isActive && 'bg-primary text-primary-foreground'
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Button>
            </Link>
          )
        })}
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start text-destructive">
          <LogOut className="w-5 h-5 mr-3" />
          Déconnexion
        </Button>
      </div>
    </div>
  )
}
```

### Mobile Header avec Menu
```tsx
// components/layouts/mobile-header.tsx
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { WhappiSidebar } from './whappi-sidebar'

export function MobileHeader({ title }: { title: string }) {
  return (
    <header className="lg:hidden border-b p-4 flex items-center gap-4">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <WhappiSidebar />
        </SheetContent>
      </Sheet>
      
      <h1 className="text-xl font-bold">{title}</h1>
    </header>
  )
}
```

---

## 2. Formulaires WhatsApp

### Formulaire d'Envoi de Message
```tsx
// components/whappi/send-message-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const messageSchema = z.object({
  phone: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Numéro invalide (ex: +33612345678)'),
  message: z.string()
    .min(1, 'Le message ne peut pas être vide')
    .max(4096, 'Message trop long (max 4096 caractères)'),
})

type MessageFormData = z.infer<typeof messageSchema>

export function SendMessageForm({ onSuccess }: { onSuccess?: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
  })
  
  const onSubmit = async (data: MessageFormData) => {
    try {
      // Appel API
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulé
      toast.success('Message envoyé avec succès')
      reset()
      onSuccess?.()
    } catch (error) {
      toast.error('Erreur lors de l\'envoi')
    }
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Numéro de téléphone</Label>
        <Input
          id="phone"
          placeholder="+33 6 12 34 56 78"
          {...register('phone')}
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Tapez votre message ici..."
          rows={4}
          {...register('message')}
        />
        {errors.message && (
          <p className="text-sm text-destructive">{errors.message.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          4096 caractères maximum
        </p>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => reset()}
        >
          Réinitialiser
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Send className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Envoi...' : 'Envoyer'}
        </Button>
      </div>
    </form>
  )
}
```

### Dialog Envoi Rapide
```tsx
// components/whappi/quick-send-dialog.tsx
'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { SendMessageForm } from './send-message-form'

export function QuickSendDialog() {
  const [open, setOpen] = useState(false)
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send className="w-4 h-4 mr-2" />
          Nouveau message
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Envoyer un message WhatsApp</DialogTitle>
          <DialogDescription>
            Envoyez un message à un numéro de téléphone
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <SendMessageForm onSuccess={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 3. Affichage de Messages

### Message Item (Liste)
```tsx
// components/whappi/message-item.tsx
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MessageSquare, Check, CheckCheck, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'

type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

interface Message {
  id: string
  from: string
  to: string
  content: string
  timestamp: Date
  status: MessageStatus
}

const statusConfig = {
  pending: { icon: Clock, label: 'En attente', variant: 'secondary' },
  sent: { icon: Check, label: 'Envoyé', variant: 'default' },
  delivered: { icon: CheckCheck, label: 'Délivré', variant: 'default' },
  read: { icon: CheckCheck, label: 'Lu', variant: 'default' },
  failed: { icon: MessageSquare, label: 'Échec', variant: 'destructive' },
} as const

export function MessageItem({ message }: { message: Message }) {
  const StatusIcon = statusConfig[message.status].icon
  
  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
      <div className="flex items-start gap-3 flex-1">
        <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
        
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{message.from}</p>
            <Badge variant={statusConfig[message.status].variant as any}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig[message.status].label}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {message.content}
          </p>
          
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(message.timestamp, { 
              addSuffix: true, 
              locale: fr 
            })}
          </p>
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Voir détails</DropdownMenuItem>
          <DropdownMenuItem>Répondre</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

### Messages List avec Empty State
```tsx
// components/whappi/messages-list.tsx
import { MessageItem } from './message-item'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Message {
  id: string
  from: string
  to: string
  content: string
  timestamp: Date
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
}

export function MessagesList({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucun message</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Vous n'avez pas encore envoyé de messages
        </p>
        <Button>
          <MessageSquare className="w-4 h-4 mr-2" />
          Envoyer un message
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  )
}
```

---

## 4. Gestion des Contacts

### Contact Card
```tsx
// components/whappi/contact-card.tsx
import { Phone, Send, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Contact {
  id: string
  name: string
  phone: string
  lastMessage?: string
  lastMessageDate?: Date
}

export function ContactCard({ contact }: { contact: Contact }) {
  const initials = contact.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{contact.name}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {contact.phone}
            </p>
            {contact.lastMessage && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                {contact.lastMessage}
              </p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Modifier</DropdownMenuItem>
              <DropdownMenuItem>Voir l'historique</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button className="w-full">
          <Send className="w-4 h-4 mr-2" />
          Envoyer un message
        </Button>
      </CardFooter>
    </Card>
  )
}
```

### Contacts Grid
```tsx
// components/whappi/contacts-grid.tsx
import { ContactCard } from './contact-card'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Contact {
  id: string
  name: string
  phone: string
  lastMessage?: string
  lastMessageDate?: Date
}

export function ContactsGrid({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Users className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucun contact</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ajoutez votre premier contact pour commencer
        </p>
        <Button>
          <Users className="w-4 h-4 mr-2" />
          Ajouter un contact
        </Button>
      </div>
    )
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contacts.map((contact) => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </div>
  )
}
```

---

## 5. Dashboard & Statistiques

### Stat Card
```tsx
// components/whappi/stat-card.tsx
import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  className 
}: StatCardProps) {
  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {trend && (
              <p className={cn(
                'text-sm font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </p>
            )}
          </div>
          
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Dashboard Stats Grid
```tsx
// components/whappi/dashboard-stats.tsx
import { MessageSquare, Send, CheckCheck, AlertCircle } from 'lucide-react'
import { StatCard } from './stat-card'

interface DashboardStatsProps {
  totalMessages: number
  sentToday: number
  delivered: number
  failed: number
}

export function DashboardStats({ 
  totalMessages, 
  sentToday, 
  delivered, 
  failed 
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Messages totaux"
        value={totalMessages}
        icon={MessageSquare}
        trend={{ value: 12, isPositive: true }}
      />
      
      <StatCard
        title="Envoyés aujourd'hui"
        value={sentToday}
        icon={Send}
        trend={{ value: 8, isPositive: true }}
      />
      
      <StatCard
        title="Délivrés"
        value={delivered}
        icon={CheckCheck}
        trend={{ value: 3, isPositive: true }}
      />
      
      <StatCard
        title="Échecs"
        value={failed}
        icon={AlertCircle}
        trend={{ value: 2, isPositive: false }}
      />
    </div>
  )
}
```

---

## 🎯 Utilisation avec Trae

### Exemple de Prompt
```
En respectant #project_rules et en utilisant le pattern ContactCard 
de #component-patterns, crée une page de gestion des contacts avec :

- Grille responsive de ContactCard
- Bouton "Ajouter contact" en haut à droite
- Empty state si aucun contact
- Dialog pour ajouter un nouveau contact
```

---

**Version** : 1.0  
**Dernière mise à jour** : 2025-02-03

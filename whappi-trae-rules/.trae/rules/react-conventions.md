# Conventions React & Next.js - Whappi

Guide des bonnes pratiques pour le développement React/Next.js dans Whappi.

## 📂 Structure de Fichiers

### Organisation des Composants
```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Groupe de routes authentification
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Groupe de routes dashboard
│   │   ├── messages/
│   │   │   └── page.tsx
│   │   ├── contacts/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/                      # API Routes
│   │   └── messages/
│   │       └── route.ts
│   ├── layout.tsx                # Root Layout
│   └── page.tsx                  # Homepage
│
├── components/
│   ├── ui/                       # shadcn/ui (NE PAS MODIFIER)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── whappi/                   # Composants métier
│   │   ├── message-item.tsx
│   │   ├── contact-card.tsx
│   │   └── send-message-form.tsx
│   └── layouts/                  # Layouts réutilisables
│       ├── whappi-sidebar.tsx
│       └── mobile-header.tsx
│
├── hooks/                        # Custom hooks
│   ├── use-messages.ts
│   ├── use-contacts.ts
│   └── use-auth.ts
│
├── lib/
│   ├── api/                      # Clients API
│   │   ├── client.ts             # Instance Axios configurée
│   │   └── endpoints/
│   │       ├── messages.ts
│   │       └── contacts.ts
│   ├── utils/                    # Utilitaires
│   │   ├── cn.ts                 # Classnames utility
│   │   ├── formatters.ts
│   │   └── validators.ts
│   └── validations/              # Schémas Zod
│       ├── message.ts
│       └── contact.ts
│
└── types/                        # Types TypeScript
    ├── message.ts
    ├── contact.ts
    └── api.ts
```

---

## 🎯 Conventions de Nommage

### Fichiers
```
Composants        → kebab-case.tsx       (message-item.tsx)
Pages (App Router) → page.tsx, layout.tsx
API Routes        → route.ts
Hooks             → use-*.ts              (use-messages.ts)
Utils             → kebab-case.ts         (format-date.ts)
Types             → kebab-case.ts         (api-response.ts)
```

### Variables et Fonctions
```typescript
// Variables : camelCase
const phoneNumber = '+33612345678'
const isLoading = true
const messagesList = []

// Fonctions : camelCase
function sendMessage() {}
const formatPhoneNumber = () => {}

// Constantes : UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.whappi.com'
const MAX_MESSAGE_LENGTH = 4096

// Types/Interfaces : PascalCase
interface Message {}
type ApiResponse<T> = {}

// Composants : PascalCase
export function MessageItem() {}
export default function ContactsPage() {}
```

### Props Interfaces
```typescript
// Suffixe Props pour les interfaces de props
interface MessageItemProps {
  message: Message
  onDelete?: (id: string) => void
}

export function MessageItem({ message, onDelete }: MessageItemProps) {
  // ...
}
```

---

## 🧩 Structure de Composants

### Composant Client Standard
```tsx
// components/whappi/message-item.tsx
'use client'

import { useState } from 'react'
import { MessageSquare, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/formatters'
import type { Message } from '@/types/message'

interface MessageItemProps {
  message: Message
  onDelete?: (id: string) => void
}

export function MessageItem({ message, onDelete }: MessageItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete?.(message.id)
    } finally {
      setIsDeleting(false)
    }
  }
  
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      {/* JSX */}
    </div>
  )
}
```

### Composant Server (par défaut)
```tsx
// app/(dashboard)/messages/page.tsx
import { MessagesList } from '@/components/whappi/messages-list'
import { getMessages } from '@/lib/api/endpoints/messages'

export default async function MessagesPage() {
  const messages = await getMessages()
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      <MessagesList messages={messages} />
    </div>
  )
}
```

---

## 🪝 Custom Hooks

### Structure d'un Hook
```typescript
// hooks/use-messages.ts
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { messagesApi } from '@/lib/api/endpoints/messages'
import type { Message } from '@/types/message'

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    loadMessages()
  }, [])
  
  const loadMessages = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await messagesApi.getAll()
      setMessages(data)
    } catch (err) {
      const error = err as Error
      setError(error)
      toast.error('Erreur lors du chargement des messages')
    } finally {
      setIsLoading(false)
    }
  }
  
  const sendMessage = async (phone: string, content: string) => {
    try {
      const newMessage = await messagesApi.send({ phone, content })
      setMessages(prev => [newMessage, ...prev])
      toast.success('Message envoyé')
      return newMessage
    } catch (err) {
      toast.error('Erreur lors de l\'envoi')
      throw err
    }
  }
  
  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refresh: loadMessages,
  }
}
```

### Utilisation du Hook
```tsx
'use client'

import { useMessages } from '@/hooks/use-messages'

export function MessagesDashboard() {
  const { messages, isLoading, sendMessage } = useMessages()
  
  if (isLoading) return <div>Chargement...</div>
  
  return (
    <div>
      {messages.map(msg => (
        <MessageItem key={msg.id} message={msg} />
      ))}
    </div>
  )
}
```

---

## 🔌 API Client (Axios)

### Configuration Client
```typescript
// lib/api/client.ts
import axios from 'axios'

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercepteur pour les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Rediriger vers login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### Endpoints API
```typescript
// lib/api/endpoints/messages.ts
import { apiClient } from '../client'
import type { Message, SendMessageInput } from '@/types/message'

export const messagesApi = {
  getAll: async (): Promise<Message[]> => {
    const { data } = await apiClient.get<Message[]>('/messages')
    return data
  },
  
  getById: async (id: string): Promise<Message> => {
    const { data } = await apiClient.get<Message>(`/messages/${id}`)
    return data
  },
  
  send: async (input: SendMessageInput): Promise<Message> => {
    const { data } = await apiClient.post<Message>('/messages', input)
    return data
  },
  
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/messages/${id}`)
  },
}
```

---

## 📝 Formulaires (React Hook Form + Zod)

### Schéma de Validation
```typescript
// lib/validations/message.ts
import { z } from 'zod'

export const sendMessageSchema = z.object({
  phone: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Numéro invalide (format E.164)'),
  message: z.string()
    .min(1, 'Le message ne peut pas être vide')
    .max(4096, 'Message trop long (max 4096 caractères)'),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
```

### Composant Formulaire
```tsx
// components/whappi/send-message-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { sendMessageSchema, type SendMessageInput } from '@/lib/validations/message'

export function SendMessageForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SendMessageInput>({
    resolver: zodResolver(sendMessageSchema),
  })
  
  const onSubmit = async (data: SendMessageInput) => {
    try {
      // Appel API
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Message envoyé')
      reset()
    } catch (error) {
      toast.error('Erreur lors de l\'envoi')
    }
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Numéro</Label>
        <Input
          id="phone"
          placeholder="+33612345678"
          {...register('phone')}
        />
        {errors.phone && (
          <p className="text-sm text-destructive">
            {errors.phone.message}
          </p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          rows={4}
          {...register('message')}
        />
        {errors.message && (
          <p className="text-sm text-destructive">
            {errors.message.message}
          </p>
        )}
      </div>
      
      <Button type="submit" disabled={isSubmitting}>
        <Send className="w-4 h-4 mr-2" />
        {isSubmitting ? 'Envoi...' : 'Envoyer'}
      </Button>
    </form>
  )
}
```

---

## 🎨 Gestion de l'État

### useState (État Local Simple)
```tsx
'use client'

import { useState } from 'react'

export function MessageDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* ... */}
    </Dialog>
  )
}
```

### React Context (État Partagé)
```typescript
// contexts/auth-context.tsx
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
}

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  
  const login = async (email: string, password: string) => {
    // Logique de connexion
    const userData = { id: '1', name: 'User', email }
    setUser(userData)
  }
  
  const logout = () => {
    setUser(null)
  }
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

---

## 🎯 Layouts Next.js

### Root Layout
```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Whappi - WhatsApp Business API',
  description: 'Gérez vos messages WhatsApp Business',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
```

### Dashboard Layout
```tsx
// app/(dashboard)/layout.tsx
import { WhappiSidebar } from '@/components/layouts/whappi-sidebar'
import { MobileHeader } from '@/components/layouts/mobile-header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r">
        <WhappiSidebar />
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <MobileHeader title="Dashboard" />
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
```

---

## 🛡️ TypeScript Best Practices

### Types vs Interfaces
```typescript
// ✅ Utiliser type pour les unions/intersections
type Status = 'pending' | 'sent' | 'delivered' | 'failed'
type MessageWithContact = Message & { contact: Contact }

// ✅ Utiliser interface pour les objets
interface Message {
  id: string
  content: string
  status: Status
}

// ✅ Utiliser interface pour les props de composants
interface MessageItemProps {
  message: Message
  onDelete?: (id: string) => void
}
```

### Éviter `any`
```typescript
// ❌ Mauvais
const data: any = await fetchData()

// ✅ Bon
interface ApiResponse<T> {
  data: T
  message: string
}

const response: ApiResponse<Message[]> = await fetchData()

// ✅ Ou utiliser unknown si vraiment nécessaire
const data: unknown = await fetchData()
if (isMessage(data)) {
  // Type guard
  console.log(data.content)
}
```

### Typage des Props Enfants
```typescript
// ✅ Pour un seul enfant
interface CardProps {
  children: React.ReactNode
}

// ✅ Pour plusieurs enfants spécifiques
interface LayoutProps {
  header: React.ReactNode
  sidebar: React.ReactNode
  children: React.ReactNode
}
```

---

## ✅ Checklist Avant Commit

- [ ] **Imports** : Ordre correct (React → UI → Custom → Types)
- [ ] **TypeScript** : Pas de `any`, types explicites sur props
- [ ] **Hooks** : Règles des hooks respectées (ordre, conditions)
- [ ] **Forms** : Validation Zod + React Hook Form
- [ ] **API** : Gestion des erreurs avec try/catch
- [ ] **Composants** : 'use client' uniquement si nécessaire
- [ ] **Nommage** : Respect des conventions (camelCase, PascalCase)
- [ ] **Performance** : Mémoïsation si nécessaire (useMemo, useCallback)

---

## 🎯 Exemples de Prompts pour Trae

### Bon Prompt ✅
```
En suivant #react-conventions, crée un hook useContacts qui :
- Utilise useState pour stocker les contacts
- Fait appel à contactsApi.getAll()
- Gère les états loading/error
- Expose une fonction addContact
- Utilise toast pour les notifications
```

### Mauvais Prompt ❌
```
Crée un hook pour gérer les contacts
```
→ Trop vague, ne spécifie pas l'approche

---

**Version** : 1.0  
**Dernière mise à jour** : 2025-02-03

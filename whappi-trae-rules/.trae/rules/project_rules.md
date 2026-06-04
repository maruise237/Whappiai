# Règles du Projet - Whappi (WhatsApp API Dashboard)

## 🎯 Objectif du Projet
Développer une interface web moderne et légère pour gérer l'API WhatsApp Business, permettant l'envoi de messages, la gestion de contacts, et le monitoring des conversations.

## 🚫 Règles Critiques (NON NÉGOCIABLES)

### UI/UX
- **INTERDIT** : Créer des composants UI custom si shadcn/ui propose une alternative
- **INTERDIT** : Utiliser des fichiers CSS personnalisés (sauf globals.css)
- **INTERDIT** : Mixer des bibliothèques UI (pas de Material-UI, Ant Design, etc.)
- **OBLIGATOIRE** : Utiliser uniquement les composants shadcn/ui (basés sur Radix UI)
- **OBLIGATOIRE** : Design Mobile-First avec breakpoints Tailwind
- **OBLIGATOIRE** : Respecter le thème Green + Neutral de shadcn/ui

### Stack Technique
- **Framework** : Next.js 14+ (App Router UNIQUEMENT)
- **Langage** : TypeScript strict (pas de `any`, sauf cas exceptionnel documenté)
- **Styling** : Tailwind CSS exclusivement
- **API Client** : Axios avec configuration `withCredentials: true`
- **État Global** : React Context API ou Zustand (si nécessaire)
- **Formulaires** : React Hook Form + Zod pour validation
- **Notifications** : Sonner (toasts shadcn/ui)

### Architecture Fichiers
```
src/
├── app/
│   ├── (auth)/          # Routes authentification
│   ├── (dashboard)/     # Routes dashboard
│   └── layout.tsx       # Layout racine
├── components/
│   ├── ui/              # Composants shadcn/ui (NE PAS MODIFIER)
│   ├── whappi/          # Composants métier Whappi
│   └── layouts/         # Layouts réutilisables
├── lib/
│   ├── api/             # Clients API
│   ├── utils/           # Utilitaires
│   └── validations/     # Schémas Zod
└── types/               # Types TypeScript
```

## 🎨 Design System - Thème Whappi

### Couleurs
```css
/* Variables CSS shadcn/ui (Green Theme) */
--primary: 142 76% 36%        /* Vert WhatsApp */
--primary-foreground: 0 0% 100%
--background: 0 0% 100%
--foreground: 240 10% 3.9%
--muted: 240 4.8% 95.9%
--muted-foreground: 240 3.8% 46.1%
--accent: 142 76% 36%         /* Accent vert */
--destructive: 0 84.2% 60.2%  /* Rouge erreurs */
```

### Typographie
- **Police** : Inter (sans-serif) - chargée via next/font
- **Échelle** :
  - `text-3xl font-bold tracking-tight` → Titres de page
  - `text-2xl font-semibold` → Titres de section
  - `text-lg font-medium` → Titres de card
  - `text-base` → Corps de texte
  - `text-sm text-muted-foreground` → Métadonnées, captions

### Icônes
- **Bibliothèque** : Lucide React v0.563.0
- **Tailles** :
  - Boutons : `w-4 h-4` (16px)
  - Liste items : `w-5 h-5` (20px)
  - Headers : `w-6 h-6` (24px)
- **Couleur par défaut** : `text-muted-foreground`

## 📐 Espacements Standards (À RESPECTER STRICTEMENT)

| Contexte                          | Classe Tailwind      | Valeur  |
|-----------------------------------|----------------------|---------|
| Entre sections de page            | `space-y-8`          | 32px    |
| Entre éléments de formulaire      | `space-y-4`          | 16px    |
| Entre champs d'un même groupe     | `space-y-2`          | 8px     |
| Padding containers principaux     | `p-6` (mobile)       | 24px    |
|                                   | `md:p-8` (desktop)   | 32px    |
| Padding Cards                     | `p-4` (contenu)      | 16px    |
|                                   | `p-6` (avec header)  | 24px    |
| Gaps entre items de liste         | `gap-4`              | 16px    |
| Gaps grilles (cards, dashboard)   | `gap-6`              | 24px    |
| Marges internes Dialog/Modal      | `py-4`               | 16px    |

## 🧱 Patterns de Composants Whappi

### 1. Page Layout Standard
```tsx
// app/(dashboard)/contacts/page.tsx
export default function ContactsPage() {
  return (
    <div className="flex h-screen">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r bg-background hidden lg:block">
        <WhappiSidebar />
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header avec actions */}
        <header className="border-b p-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
            <p className="text-sm text-muted-foreground">
              Gérez vos contacts WhatsApp
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau contact
          </Button>
        </header>
        
        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Contenu ici */}
          </div>
        </div>
      </main>
    </div>
  )
}
```

### 2. Card Standard Whappi
```tsx
<Card>
  <CardHeader>
    <CardTitle>Titre de la card</CardTitle>
    <CardDescription>Description optionnelle</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Contenu principal */}
  </CardContent>
  <CardFooter className="flex justify-end gap-2">
    <Button variant="outline">Annuler</Button>
    <Button>Confirmer</Button>
  </CardFooter>
</Card>
```

### 3. Form Section avec Validation
```tsx
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
      placeholder="Votre message..."
      rows={4}
      {...register('message')}
    />
  </div>
  
  <div className="flex justify-end gap-2">
    <Button type="button" variant="outline">
      Annuler
    </Button>
    <Button type="submit">
      <Send className="w-4 h-4 mr-2" />
      Envoyer
    </Button>
  </div>
</form>
```

### 4. Modal/Dialog Standard
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Envoyer un message</DialogTitle>
      <DialogDescription>
        Envoyez un message WhatsApp à ce contact
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      {/* Formulaire ici */}
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Annuler
      </Button>
      <Button onClick={handleSend}>
        <Send className="w-4 h-4 mr-2" />
        Envoyer
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 5. Liste d'Items (Messages, Contacts)
```tsx
// components/whappi/message-item.tsx
export function MessageItem({ message }: { message: Message }) {
  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
      <div className="flex items-start gap-3">
        <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{message.from}</p>
            <Badge variant={message.status === 'sent' ? 'default' : 'secondary'}>
              {message.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {message.content}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(message.timestamp)}
          </p>
        </div>
      </div>
      
      <Button variant="ghost" size="icon">
        <MoreVertical className="w-4 h-4" />
      </Button>
    </div>
  )
}
```

### 6. DataTable avec Pagination
```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Téléphone</TableHead>
            <TableHead>Dernier message</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell className="font-medium">{contact.name}</TableCell>
              <TableCell>{contact.phone}</TableCell>
              <TableCell className="text-muted-foreground">
                {contact.lastMessage}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm">
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

## 🎭 Variants de Boutons Whappi

| Variant       | Utilisation                                    | Exemple                          |
|---------------|------------------------------------------------|----------------------------------|
| `default`     | Actions principales (CTA)                      | Envoyer, Créer, Sauvegarder      |
| `outline`     | Actions secondaires                            | Annuler, Retour                  |
| `ghost`       | Actions tertiaires, icônes seules              | Menu (...), Éditer               |
| `destructive` | Actions de suppression/danger                  | Supprimer, Déconnecter           |
| `secondary`   | Actions alternatives                           | Exporter, Importer               |
| `link`        | Liens textuels                                 | En savoir plus                   |

**Tailles** : `default`, `sm`, `lg`, `icon`

## 📱 Responsive Design (Mobile-First)

### Breakpoints Tailwind
```tsx
// Mobile : Base (< 640px)
className="p-4 text-sm"

// Tablet : sm (≥ 640px)
className="p-4 sm:p-6 text-sm sm:text-base"

// Desktop : md (≥ 768px)
className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2"

// Large : lg (≥ 1024px)
className="lg:grid-cols-3"

// XLarge : xl (≥ 1280px)
className="xl:grid-cols-4"
```

### Pattern Sidebar Responsive
```tsx
{/* Mobile : Hidden, toggle avec bouton */}
<aside className="hidden lg:block w-64 border-r">
  <WhappiSidebar />
</aside>

{/* Mobile : Sheet (slide-over) */}
<Sheet>
  <SheetTrigger asChild className="lg:hidden">
    <Button variant="ghost" size="icon">
      <Menu className="w-5 h-5" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left">
    <WhappiSidebar />
  </SheetContent>
</Sheet>
```

### Grilles Adaptatives
```tsx
{/* 1 col mobile, 2 cols tablet, 3 cols desktop */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item) => (
    <Card key={item.id}>...</Card>
  ))}
</div>
```

## 🔐 Sécurité & Bonnes Pratiques

### Validation de Données
```tsx
// lib/validations/message.ts
import { z } from 'zod'

export const sendMessageSchema = z.object({
  phone: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Numéro invalide (format E.164)'),
  message: z.string()
    .min(1, 'Le message est requis')
    .max(4096, 'Message trop long (max 4096 caractères)'),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
```

### Gestion des Erreurs API
```tsx
try {
  const response = await axios.post('/api/messages', data)
  toast.success('Message envoyé avec succès')
} catch (error) {
  if (axios.isAxiosError(error)) {
    toast.error(error.response?.data?.message || 'Erreur réseau')
  } else {
    toast.error('Une erreur inattendue est survenue')
  }
}
```

### Protection des Routes
```tsx
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')
  
  if (!token && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

## 📝 Conventions de Code

### Nommage
- **Composants** : PascalCase (`MessageCard`, `ContactList`)
- **Fichiers composants** : kebab-case (`message-card.tsx`)
- **Hooks custom** : camelCase avec `use` (`useWhatsAppStatus`)
- **Types/Interfaces** : PascalCase (`Message`, `ApiResponse`)
- **Variables/Fonctions** : camelCase (`phoneNumber`, `sendMessage`)
- **Constantes** : UPPER_SNAKE_CASE (`API_BASE_URL`)

### Structure d'Imports
```tsx
// 1. React/Next.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. Composants shadcn/ui
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// 3. Composants Whappi
import { MessageItem } from '@/components/whappi/message-item'

// 4. Icônes Lucide
import { Send, Phone, MessageSquare } from 'lucide-react'

// 5. Hooks/Utils/API
import { useMessages } from '@/hooks/use-messages'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'

// 6. Types
import type { Message } from '@/types/message'
```

### Gestion de l'État
```tsx
// ✅ Bon : useState pour état local simple
const [isOpen, setIsOpen] = useState(false)

// ✅ Bon : React Hook Form pour formulaires
const { register, handleSubmit } = useForm<FormData>()

// ✅ Bon : Context pour état partagé simple
const { user, logout } = useAuth()

// ⚠️ Éviter : Props drilling sur +3 niveaux
// → Utiliser Context ou Zustand
```

## ✅ Checklist Avant Commit

Avant de valider du code, vérifie :

- [ ] **Composants shadcn/ui** : Aucun composant UI custom créé
- [ ] **TypeScript** : Pas de `any`, types correctement définis
- [ ] **Espacements** : Respect des `space-y-*`, `p-*`, `gap-*` définis
- [ ] **Responsive** : Fonctionne sur mobile (test avec DevTools)
- [ ] **Accessibilité** : Labels sur inputs, aria-labels sur icônes seules
- [ ] **Performance** : Images optimisées (next/image), lazy loading si nécessaire
- [ ] **Sécurité** : Validation Zod, sanitisation des inputs
- [ ] **Cohérence** : Suit les patterns définis dans ce fichier

## 📚 Références Officielles

- **shadcn/ui** : https://ui.shadcn.com
- **Radix UI** : https://www.radix-ui.com
- **Tailwind CSS** : https://tailwindcss.com
- **Next.js Docs** : https://nextjs.org/docs
- **React Hook Form** : https://react-hook-form.com
- **Zod** : https://zod.dev

## 🎯 Exemples de Prompts pour Trae

### Bon Prompt ✅
```
En respectant #project_rules, crée un composant ContactCard qui :
- Affiche nom, téléphone, dernier message
- Bouton "Envoyer message" (ouvre Dialog)
- Bouton menu (MoreVertical) avec actions
- Suit le pattern "Liste d'Items"
- Hover effect avec bg-accent
```

### Mauvais Prompt ❌
```
Crée un joli composant pour les contacts avec des animations cool
```
→ Trop vague, ne référence pas les règles

---

**Version** : 1.0  
**Dernière mise à jour** : 2025-02-03  
**Maintenu par** : Équipe Whappi

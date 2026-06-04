# Espacements & Typographie - Whappi

Guide de référence pour les espacements, tailles de police et hiérarchie visuelle.

## 📏 Système d'Espacement

### Échelle Tailwind (Référence)
```
1 = 0.25rem = 4px
2 = 0.5rem  = 8px
3 = 0.75rem = 12px
4 = 1rem    = 16px
6 = 1.5rem  = 24px
8 = 2rem    = 32px
12 = 3rem   = 48px
16 = 4rem   = 64px
```

---

## 🎯 Règles d'Espacement par Contexte

### 1. Espacements Verticaux (space-y-*)

#### Entre Sections Principales
```tsx
<div className="space-y-8">
  {/* Sections de page (Dashboard, Stats, etc.) */}
</div>
```
**Valeur** : `space-y-8` (32px)  
**Usage** : Entre blocs majeurs d'une page

#### Entre Éléments de Formulaire
```tsx
<form className="space-y-4">
  <div className="space-y-2">
    <Label>Nom</Label>
    <Input />
  </div>
  <div className="space-y-2">
    <Label>Email</Label>
    <Input />
  </div>
</form>
```
**Valeur** : `space-y-4` (16px) entre champs  
**Valeur** : `space-y-2` (8px) entre label et input  
**Usage** : Formulaires, groupes de champs

#### Entre Items de Liste
```tsx
<div className="space-y-4">
  {messages.map(msg => <MessageItem key={msg.id} />)}
</div>
```
**Valeur** : `space-y-4` (16px)  
**Usage** : Listes de messages, contacts, etc.

#### Entre Paragraphes de Texte
```tsx
<div className="space-y-3">
  <p>Premier paragraphe...</p>
  <p>Deuxième paragraphe...</p>
</div>
```
**Valeur** : `space-y-3` (12px)  
**Usage** : Contenu textuel, descriptions longues

---

### 2. Padding de Conteneurs

#### Containers de Page Principaux
```tsx
{/* Mobile */}
<main className="p-6">
  {/* Contenu */}
</main>

{/* Desktop */}
<main className="p-6 md:p-8">
  {/* Contenu */}
</main>
```
**Mobile** : `p-6` (24px)  
**Desktop** : `p-8` (32px)

#### Cards Standard
```tsx
{/* Card simple */}
<Card>
  <CardContent className="p-4">
    {/* Contenu */}
  </CardContent>
</Card>

{/* Card avec header */}
<Card>
  <CardHeader className="p-6">
    <CardTitle>Titre</CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    {/* Contenu */}
  </CardContent>
</Card>
```
**Contenu simple** : `p-4` (16px)  
**Avec header/footer** : `p-6` (24px)

#### Dialogs/Modals
```tsx
<DialogContent>
  <DialogHeader>
    {/* Pas de padding custom, géré par le composant */}
  </DialogHeader>
  <div className="py-4">
    {/* Formulaire */}
  </div>
</DialogContent>
```
**Contenu** : `py-4` (16px vertical)

#### Headers de Page
```tsx
<header className="p-6 border-b">
  <h1>Titre</h1>
</header>
```
**Valeur** : `p-6` (24px)

---

### 3. Gaps (Flexbox/Grid)

#### Gaps pour Listes Horizontales
```tsx
<div className="flex gap-4">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</div>
```
**Valeur** : `gap-4` (16px)  
**Usage** : Boutons, badges, tags

#### Gaps pour Grilles de Cards
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => <Card key={item.id} />)}
</div>
```
**Valeur** : `gap-6` (24px)  
**Usage** : Grilles de composants (contacts, stats)

#### Gaps pour Petits Éléments
```tsx
<div className="flex items-center gap-2">
  <Icon className="w-4 h-4" />
  <span>Texte</span>
</div>
```
**Valeur** : `gap-2` (8px)  
**Usage** : Icône + texte, petits groupes

#### Gaps pour Navigation
```tsx
<nav className="flex gap-3">
  <Link>Accueil</Link>
  <Link>Contacts</Link>
</nav>
```
**Valeur** : `gap-3` (12px)  
**Usage** : Menus, navigation horizontale

---

## 🔤 Hiérarchie Typographique

### Tailles de Police

#### Page Title (H1)
```tsx
<h1 className="text-3xl font-bold tracking-tight">
  Dashboard Whappi
</h1>
```
**Taille** : `text-3xl` (1.875rem / 30px)  
**Poids** : `font-bold`  
**Espacement lettres** : `tracking-tight`  
**Usage** : Titre principal de page

#### Section Title (H2)
```tsx
<h2 className="text-2xl font-semibold">
  Messages récents
</h2>
```
**Taille** : `text-2xl` (1.5rem / 24px)  
**Poids** : `font-semibold`  
**Usage** : Titres de sections dans une page

#### Card Title (H3)
```tsx
<CardTitle className="text-lg font-medium">
  Détails du contact
</CardTitle>
```
**Taille** : `text-lg` (1.125rem / 18px)  
**Poids** : `font-medium`  
**Usage** : Titres de cards, sous-sections

#### Body Text (Paragraphe)
```tsx
<p className="text-base">
  Contenu principal du texte...
</p>
```
**Taille** : `text-base` (1rem / 16px)  
**Poids** : `font-normal` (par défaut)  
**Usage** : Texte courant, descriptions

#### Small Text (Caption/Meta)
```tsx
<p className="text-sm text-muted-foreground">
  Il y a 2 heures
</p>
```
**Taille** : `text-sm` (0.875rem / 14px)  
**Couleur** : `text-muted-foreground`  
**Usage** : Métadonnées, timestamps, légendes

#### Extra Small (Labels, Hints)
```tsx
<span className="text-xs text-muted-foreground">
  4096 caractères maximum
</span>
```
**Taille** : `text-xs` (0.75rem / 12px)  
**Couleur** : `text-muted-foreground`  
**Usage** : Hints de formulaire, labels secondaires

---

## 🎨 Poids de Police

```tsx
font-normal      → 400 (défaut)
font-medium      → 500 (titres de card, labels importants)
font-semibold    → 600 (titres de section)
font-bold        → 700 (titres de page, emphase forte)
```

### Règles d'Utilisation
- **H1** → `font-bold`
- **H2** → `font-semibold`
- **H3/CardTitle** → `font-medium`
- **Body** → `font-normal`
- **Labels** → `font-medium`

---

## 📐 Line Height (Hauteur de ligne)

Tailwind gère automatiquement le line-height selon la taille :

```tsx
text-xs     → leading-4   (1rem / 16px)
text-sm     → leading-5   (1.25rem / 20px)
text-base   → leading-6   (1.5rem / 24px)
text-lg     → leading-7   (1.75rem / 28px)
text-xl     → leading-7   (1.75rem / 28px)
text-2xl    → leading-8   (2rem / 32px)
text-3xl    → leading-9   (2.25rem / 36px)
```

**Modification manuelle** (rarement nécessaire) :
```tsx
<p className="text-base leading-relaxed">  {/* 1.625 */}
<p className="text-base leading-loose">    {/* 2 */}
```

---

## 🎯 Patterns Complets par Composant

### Card Standard
```tsx
<Card>
  <CardHeader className="p-6">
    <CardTitle className="text-lg font-medium">
      Titre de la Card
    </CardTitle>
    <CardDescription className="text-sm text-muted-foreground">
      Description optionnelle
    </CardDescription>
  </CardHeader>
  
  <CardContent className="p-6 pt-0 space-y-4">
    {/* Contenu avec espacement vertical */}
  </CardContent>
  
  <CardFooter className="p-6 pt-0 flex gap-2 justify-end">
    <Button variant="outline">Annuler</Button>
    <Button>Confirmer</Button>
  </CardFooter>
</Card>
```

### Form Group
```tsx
<div className="space-y-2">
  <Label htmlFor="email" className="text-sm font-medium">
    Email
  </Label>
  <Input 
    id="email" 
    type="email" 
    className="text-base"
  />
  <p className="text-xs text-muted-foreground">
    Nous ne partagerons jamais votre email
  </p>
</div>
```

### Page Header
```tsx
<header className="border-b p-6 flex items-center justify-between">
  <div className="space-y-1">
    <h1 className="text-3xl font-bold tracking-tight">
      Messages
    </h1>
    <p className="text-sm text-muted-foreground">
      Gérez vos messages WhatsApp
    </p>
  </div>
  
  <Button>
    <Plus className="w-4 h-4 mr-2" />
    Nouveau
  </Button>
</header>
```

### List Item
```tsx
<div className="flex items-start gap-3 p-4 border rounded-lg">
  <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
  
  <div className="flex-1 space-y-1">
    <p className="font-medium text-base">
      Nom du contact
    </p>
    <p className="text-sm text-muted-foreground">
      +33 6 12 34 56 78
    </p>
    <p className="text-xs text-muted-foreground">
      Il y a 2 heures
    </p>
  </div>
</div>
```

### Stats Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <Card>
    <CardContent className="p-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Messages totaux
        </p>
        <p className="text-3xl font-bold">
          1,234
        </p>
        <p className="text-sm font-medium text-green-600">
          +12%
        </p>
      </div>
    </CardContent>
  </Card>
</div>
```

---

## 📱 Responsive Typography

### Adaptation Mobile → Desktop
```tsx
{/* Titre adaptatif */}
<h1 className="text-2xl md:text-3xl font-bold">
  Dashboard
</h1>

{/* Padding adaptatif */}
<div className="p-4 md:p-6 lg:p-8">
  {/* Contenu */}
</div>

{/* Espacement adaptatif */}
<div className="space-y-4 md:space-y-6">
  {/* Sections */}
</div>
```

---

## ✅ Checklist de Cohérence

Avant de valider un composant, vérifie :

- [ ] **Titres** : H1 = text-3xl, H2 = text-2xl, H3 = text-lg
- [ ] **Espacements verticaux** : space-y-8 (sections), space-y-4 (éléments)
- [ ] **Padding cards** : p-4 (simple) ou p-6 (avec header)
- [ ] **Gaps grilles** : gap-6 pour cards, gap-4 pour listes
- [ ] **Texte secondaire** : text-muted-foreground + text-sm
- [ ] **Mobile-first** : p-4 md:p-6, text-xl md:text-2xl

---

## 🎯 Exemples de Prompts pour Trae

### Bon Prompt ✅
```
En suivant #spacing-typography, crée un composant ProfileCard avec :
- Titre : text-lg font-medium
- Description : text-sm text-muted-foreground
- Padding : p-6
- Espacement interne : space-y-2
```

### Mauvais Prompt ❌
```
Crée une card avec un joli titre
```
→ Trop vague, ne spécifie pas les classes

---

**Version** : 1.0  
**Dernière mise à jour** : 2025-02-03

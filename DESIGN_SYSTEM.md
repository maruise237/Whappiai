# Design System - Super Light Web WhatsApp API

## 🎨 Charte Graphique

### Couleurs
Le projet utilise le thème **Green + Neutral** de shadcn/ui.
- **Primary**: Green (Variables CSS `--primary`, `--primary-foreground`)
- **Base**: Neutral (Variables CSS `--background`, `--foreground`, `--muted`, etc.)
- **Accent**: Utilisé pour les états de survol et les sélections.

### Typographie
- **Police**: Inter (sans-serif)
- **Tailles**: Standardisées via Tailwind CSS (text-sm, text-base, text-lg, etc.)

### Icônes
- **Bibliothèque**: Lucide React (v0.563.0)
- **Style**: Outline, 20px par défaut pour les boutons, 16px pour les listes.

## 🏗️ Architecture des Composants

### Principes de Base
- ** shadcn/ui UNIQUEMENT**: Aucun composant UI custom si une version shadcn existe.
- **Mobile-First**: Design conçu d'abord pour mobile, puis adapté pour desktop via les breakpoints Tailwind (`sm`, `md`, `lg`, `xl`).
- **Tailwind CSS**: Utilisation exclusive des classes utilitaires. Pas de fichiers CSS custom (sauf `globals.css`).
- **Accessibilité**: Navigation au clavier (Tab, Enter, Esc) et attributs ARIA gérés par Radix UI.

### Composants Utilisés
- **Layout**: Sidebar, Navbar, Main Content.
- **Forms**: Input, Label, Button, Select, Switch, Calendar (shadcn/ui), Popover.
- **Feedback**: Toast (Sonner), Alert, Badge.
- **Navigation**: Tabs, Breadcrumbs.
- **Data Display**: Table, Card, Dialog (Modal).

## 📱 Responsive Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

## 🛠️ Stack Technique
- **Framework**: Next.js (App Router)
- **Langage**: TypeScript
- **UI Base**: Radix UI
- **Styling**: Tailwind CSS
- **API Client**: Axios (configuré avec `withCredentials: true`)

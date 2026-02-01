# Design System - Super Light Web WhatsApp API Server

## 🎯 Vision
Une interface moderne, propre et responsive pour la gestion de l'API WhatsApp, construite exclusivement avec **shadcn/ui** et **Tailwind CSS**.

## 🎨 Palette de Couleurs
Le thème utilise une combinaison de **Green** (Primaire) et **Neutral** (Base).

- **Primary (Green)**: `#10b981` (emerald-500)
  - Utilisé pour les actions principales, les indicateurs de succès et les éléments actifs.
- **Background**: `#ffffff` (Fond clair standard)
- **Foreground**: `#0f172a` (Texte principal)
- **Muted**: `#f1f5f9` (Fonds secondaires)
- **Destructive**: `#ef4444` (Actions critiques/erreurs)

## ✍️ Typographie
- **Police**: Inter (Sans-serif)
- **H1**: `text-4xl font-bold tracking-tight`
- **H2**: `text-3xl font-semibold`
- **Body**: `text-base`
- **Small**: `text-sm`

## 🧩 Composants shadcn/ui Utilisés
### Variantes de Boutons
- **Default**: `variant="default"` (Green primary) - Utilisé pour les actions de validation et création.
- **Outline**: `variant="outline"` (Bordure neutre) - Utilisé pour les actions secondaires et le toggle de thème.
- **Ghost**: `variant="ghost"` (Pas de fond, idéal pour navigation) - Utilisé pour les menus et la navigation latérale.
- **Destructive**: `variant="destructive"` (Rouge pour actions critiques) - Utilisé pour la suppression et la déconnexion.

### États et Badges
- **Sessions**:
  - **CONNECTED**: Badge vert (emerald) - Session active et prête.
  - **DISCONNECTED**: Badge rouge (destructive) - Session inactive.
  - **INITIALIZING**: Badge jaune (amber) - En cours de connexion.
- **Campagnes**:
  - **RUNNING**: Badge bleu (blue) - Envoi en cours.
  - **PAUSED**: Badge jaune (amber) - Envoi suspendu.
  - **COMPLETED**: Badge vert (emerald) - Envoi terminé avec succès.
  - **FAILED**: Badge rouge (destructive) - Erreur lors de l'envoi.

### Wizard de Campagne (Steppers)
1. **Basic Info**: Nom de la campagne, session et planification.
2. **Recipients**: Sélection des listes de contacts.
3. **Message**: Composition du message (Texte ou Media).
4. **Review**: Récapitulatif avant lancement.

## 🚀 Style "Vega" & Configuration
Le style "Vega" se caractérise par :
- **Bordures**: Rayons prononcés (`rounded-xl` ou `rounded-2xl`) sur les cartes et les inputs.
- **Élévation**: Ombres portées (`shadow-lg` ou `shadow-xl`) sur les éléments flottants et les cartes principales.
- **Espace**: `gap-6` ou `gap-8` entre les sections pour une meilleure lisibilité.
- **Flou**: Utilisation de `backdrop-blur-sm` sur les modales et les overlays.

## 📱 Responsive Strategy (Mobile-First)
- **Mobile (< 768px)**: 
  - Sidebar masquée, accessible via un bouton menu (Sheet/Drawer).
  - Tableaux avec `overflow-x-auto` ou transformation en listes de cartes.
  - Padding réduit (`p-4`).
- **Desktop (>= 768px)**: 
  - Sidebar fixe à gauche (`w-64`).
  - Layouts en grille (Grid) multi-colonnes.
  - Padding généreux (`p-8`).

## ♿ Accessibilité (A11y)
- **Navigation Clavier**:
  - `Tab`: Navigation entre les éléments interactifs (boutons, liens, inputs).
  - `Enter` / `Space`: Activation des boutons et liens.
  - `Esc`: Fermeture des modales, menus déroulants et feuilles (Sheet).
  - `Arrows`: Navigation à l'intérieur des onglets (Tabs) et menus.
- **Sémantique**:
  - Utilisation des balises HTML5 (`main`, `nav`, `section`, `header`).
  - Attributs `aria-*` gérés automatiquement par Radix UI.
  - Rôles `alert` pour les notifications critiques.
- **Contrastes**:
  - Texte principal: `#0f172a` sur fond blanc (Ratio > 7:1).
  - Texte secondaire: `#64748b` (Ratio > 4.5:1).
  - Boutons primaires: Texte blanc sur fond `#10b981`.

## 📱 Grille Responsive & Breakpoints
Le design suit une approche **Mobile-First**.

| Breakpoint | Taille | Description |
| :--- | :--- | :--- |
| `base` | < 640px | Mobile (Portrait) - Sidebar masquée, layout 1 colonne. |
| `sm` | 640px | Mobile (Paysage) / Tablettes. |
| `md` | 768px | Tablettes (Portrait) - Sidebar fixe, layout multi-colonnes possible. |
| `lg` | 1024px | Tablettes (Paysage) / Desktops. |
| `xl` | 1280px | Grands écrans. |

### Comportement des Composants
- **Sidebar**: Mobile (Sheet rétractable) vs Desktop (Fixe à gauche).
- **Cartes**: Largeur pleine sur mobile, grille sur desktop.
- **Tableaux**: Scroll horizontal activé (`overflow-x-auto`) sur petits écrans.
- **Dialogues**: S'adaptent à la largeur de l'écran avec un padding de sécurité.

## 🛠️ Outils & Bibliothèques
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (basé sur Radix UI)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)
- **Date Handling**: [date-fns](https://date-fns.org/)
- **Validation**: [React Hook Form](https://react-hook-form.com/) (prévu pour les formulaires complexes)

## 📋 Règles de Code UI
1. **Pas de CSS custom**: Utiliser exclusivement les classes Tailwind.
2. **Variables CSS**: Utiliser `var(--primary)`, `var(--background)`, etc.
3. **Composants réutilisables**: Toujours extraire les patterns récurrents dans `src/components/ui`.
4. **Hydratation**: Utiliser `"use client"` uniquement lorsque nécessaire pour l'interactivité.


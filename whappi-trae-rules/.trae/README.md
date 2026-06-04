# 📖 Guide d'Utilisation des Règles Trae - Whappi

Ce dossier contient l'ensemble des règles et patterns pour garantir la cohérence du projet **Whappi** lors de l'utilisation de **Trae AI**.

## 📂 Structure des Fichiers

```
.trae/rules/
├── project_rules.md          # ⭐ RÈGLES PRINCIPALES (LIRE EN PREMIER)
├── component-patterns.md     # Patterns de composants réutilisables
├── spacing-typography.md     # Espacements et typographie
└── react-conventions.md      # Conventions React/Next.js

design.md                     # Votre fichier existant (référence)
```

---

## 🚀 Comment Utiliser avec Trae

### 1. **Activation Automatique**

Trae détecte automatiquement les fichiers `.md` dans `.trae/rules/` et les charge au démarrage.

### 2. **Référencer une Règle Spécifique**

Dans vos conversations avec Trae, utilisez le hashtag `#nom-du-fichier` pour référencer une règle :

```
En respectant #project_rules, crée un composant MessageCard
```

```
En suivant #component-patterns et #spacing-typography, 
crée une page de gestion des contacts
```

### 3. **Combinaison de Règles**

Vous pouvez combiner plusieurs règles dans un même prompt :

```
En utilisant #project_rules et #react-conventions, 
crée un hook useMessages qui gère l'envoi et la récupération 
de messages depuis l'API
```

---

## 🎯 Templates de Prompts Optimisés

### Pour Créer un Composant UI
```
En respectant STRICTEMENT #project_rules et #component-patterns :

Crée un composant [NomComposant] qui :
- Utilise shadcn/ui uniquement (pas de custom UI)
- Suit le pattern [Card/Form/Modal/ListItem] 
- Respecte les espacements de #spacing-typography
- Est responsive (mobile-first)

Fonctionnalités :
- [Liste des features]

Référence de style : [Si applicable, coller un composant similaire]
```

### Pour Créer un Hook Custom
```
En suivant #react-conventions :

Crée un hook use[Nom] qui :
- Gère l'état local avec useState
- Appelle l'API via [endpoint]Api
- Gère loading/error states
- Expose les méthodes [liste]
- Utilise toast pour les notifications
```

### Pour Créer une Page Complète
```
En respectant #project_rules, #component-patterns et #spacing-typography :

Crée une page [Nom]Page dans app/(dashboard)/[nom]/page.tsx qui :
- Utilise le layout Dashboard existant
- Header avec titre + bouton d'action
- Grille responsive de [composant]
- Empty state si aucune donnée
- Dialog pour [action]

Structure :
- Header : border-b p-6
- Content : p-6 avec space-y-6
- Grid : gap-6, responsive (1/2/3 cols)
```

### Pour Créer un Formulaire
```
En suivant #react-conventions et #component-patterns :

Crée un formulaire [Nom]Form avec :
- React Hook Form + Zod validation
- Schéma dans lib/validations/[nom].ts
- Champs : [liste]
- Boutons : Annuler (outline) + Soumettre (primary)
- Toast sur succès/erreur
- Espacement : space-y-4
```

---

## 📋 Checklist Avant Génération

Avant de demander à Trae de générer du code, assurez-vous :

### ✅ Contexte Fourni
- [ ] J'ai référencé les bonnes règles (#project_rules, etc.)
- [ ] J'ai spécifié le type de composant (Card, Form, Modal, etc.)
- [ ] J'ai indiqué si c'est responsive ou non

### ✅ Détails Techniques
- [ ] Nom du composant/fichier
- [ ] Emplacement dans l'arborescence
- [ ] Liste des fonctionnalités
- [ ] Dépendances (hooks, API, etc.)

### ✅ Design & Style
- [ ] Pattern de composant référencé
- [ ] Espacements spécifiés
- [ ] Icônes nécessaires (Lucide React)
- [ ] Variants de boutons

---

## 🛠️ Maintenance des Règles

### Quand Modifier les Règles ?

1. **Nouveau Pattern Récurrent**  
   Si vous créez un pattern qui sera réutilisé partout, ajoutez-le dans `component-patterns.md`

2. **Changement de Stack**  
   Si vous changez de bibliothèque ou d'outil, mettez à jour `project_rules.md`

3. **Nouvelles Conventions**  
   Si l'équipe adopte de nouvelles pratiques, documentez-les dans `react-conventions.md`

### Comment Modifier ?

1. Éditez le fichier `.md` concerné
2. Commitez les changements dans Git
3. Trae chargera automatiquement la nouvelle version

---

## 📚 Hiérarchie des Règles

En cas de conflit entre règles, voici l'ordre de priorité :

1. **project_rules.md** → Règles absolues, non négociables
2. **component-patterns.md** → Patterns recommandés
3. **spacing-typography.md** → Guidelines visuelles
4. **react-conventions.md** → Bonnes pratiques code

---

## 🎓 Exemples Concrets

### Exemple 1 : Créer un Composant Contact Card

**Prompt** :
```
En respectant #project_rules et en utilisant le pattern ContactCard 
de #component-patterns :

Crée un composant ContactCard qui affiche :
- Avatar avec initiales
- Nom + téléphone
- Dernier message (optionnel)
- Bouton "Envoyer message"
- Menu contextuel (modifier, supprimer)

Utilise :
- shadcn Card, Avatar, Button, DropdownMenu
- Icônes : Phone, Send, MoreVertical
- Hover effect : hover:shadow-md
```

**Résultat attendu** :
- Composant TypeScript dans `components/whappi/contact-card.tsx`
- Respect des espacements (p-4, gap-3, space-y-1)
- Mobile-responsive
- Accessibilité (aria-labels)

---

### Exemple 2 : Créer une Page Messages

**Prompt** :
```
En suivant #project_rules, #component-patterns et #spacing-typography :

Crée la page MessagesPage dans app/(dashboard)/messages/page.tsx avec :

Structure :
- Header (border-b p-6) : titre "Messages" + bouton "Nouveau message"
- Content area (p-6) : liste de MessageItem avec space-y-4
- Empty state si aucun message
- QuickSendDialog pour envoyer

Utilise :
- MessageItem de component-patterns
- QuickSendDialog existant
- Responsive : grid sur desktop, liste sur mobile
```

**Résultat attendu** :
- Page Next.js Server Component
- Import des composants depuis `@/components/whappi`
- Layout responsive avec breakpoints Tailwind
- Gestion de l'état vide

---

### Exemple 3 : Créer un Hook Custom

**Prompt** :
```
En respectant #react-conventions :

Crée un hook useContacts dans hooks/use-contacts.ts qui :

État :
- contacts: Contact[]
- isLoading: boolean
- error: Error | null

Méthodes :
- addContact(data: CreateContactInput)
- updateContact(id: string, data: UpdateContactInput)
- deleteContact(id: string)
- refresh()

API :
- Utilise contactsApi de lib/api/endpoints/contacts.ts
- Toast sur succès/erreur (sonner)
- Gestion erreurs avec try/catch
```

**Résultat attendu** :
- Hook TypeScript typé
- Utilisation de useState, useEffect
- Gestion propre des erreurs
- Export des types d'input

---

## 🔍 Debugging : Trae ne Respecte Pas les Règles ?

### Solutions :

1. **Référencez explicitement les règles**
   ```
   En respectant STRICTEMENT #project_rules...
   ```

2. **Soyez plus précis**
   ```
   Utilise shadcn/ui Card (pas de custom component)
   Espacement : space-y-4 entre items
   Padding : p-6 dans la card
   ```

3. **Donnez un exemple**
   ```
   Comme le composant MessageItem de #component-patterns, 
   mais pour les contacts
   ```

4. **Vérifiez que le fichier existe**
   ```bash
   ls .trae/rules/
   ```

---

## 🎯 Résumé Rapide

| Fichier                  | Quand l'utiliser ?                              |
|--------------------------|-------------------------------------------------|
| `#project_rules`         | Toujours (règles de base)                       |
| `#component-patterns`    | Création de composants UI                       |
| `#spacing-typography`    | Questions d'espacement ou typo                  |
| `#react-conventions`     | Hooks, API, formulaires, structure code         |

---

## 💡 Conseils d'Utilisation

1. **Commencez simple** : Utilisez d'abord `#project_rules` seul
2. **Ajoutez progressivement** : Combinez avec d'autres règles si besoin
3. **Soyez explicite** : Plus votre prompt est détaillé, meilleur sera le résultat
4. **Itérez** : Si le résultat n'est pas parfait, affinez le prompt en référençant plus de règles

---

## 🤝 Contribution

Si vous identifiez un nouveau pattern ou une amélioration :

1. Ouvrez le fichier concerné dans `.trae/rules/`
2. Ajoutez votre pattern avec un exemple clair
3. Commitez et partagez avec l'équipe

---

**Projet** : Whappi - WhatsApp Business API Dashboard  
**Stack** : Next.js 14 + TypeScript + shadcn/ui + Tailwind CSS  
**Version** : 1.0  
**Dernière mise à jour** : 2025-02-03

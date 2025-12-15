# Design: Conversion Liste → Tableau

**Date:** 2024-12-15  
**Status:** En cours d'implémentation

## Overview

Fonctionnalité permettant aux utilisateurs de transformer des listes en tableaux stylisés via un menu contextuel, avec prévisualisation IA avant insertion.

## Décisions de design

| Aspect | Décision |
|--------|----------|
| Détection du format | IA automatique (Gemini analyse la structure) |
| Modèle IA | `gemini-3-pro-preview` |
| Où s'applique | Éditeur TipTap + Export LaTeX |
| Déclenchement | Menu contextuel (clic droit sur liste) |
| Marquage pour export | Vrai élément `<table>` HTML |
| Flux utilisateur | Preview avec accept/refuser |
| Style visuel | WYSIWYG (identique au LaTeX) |
| Fallback si IA échoue | Templates manuels (2, 3, 4 colonnes) |

## User Flow

```
[Sélection liste dans TipTap] 
       ↓
[Clic droit] → [Menu contextuel apparaît]
       ↓
[Clic "Convertir en tableau"]
       ↓
[Modal de chargement - "Analyse en cours..."]
       ↓
[Modal Preview avec tableau proposé]
       ↓
  ┌────┴────┐
  ↓         ↓
[Accepter] [Refuser]
  ↓         ↓
[Table insérée] [Retour éditeur, liste inchangée]
  ↓
[Export LaTeX → tableau stylisé automatique]
```

### Error Flow (IA échoue)

```
[Appel Gemini échoue]
       ↓
[Modal fallback : "Choisissez un format"]
       ↓
[Templates : 2 cols | 3 cols | 4 cols]
       ↓
[Sélection] → [Tableau généré par heuristique]
```

## Wireframes

### Menu Contextuel

```
┌─────────────────────────────┐
│  Couper            Ctrl+X   │
│  Copier            Ctrl+C   │
│  Coller            Ctrl+V   │
├─────────────────────────────┤
│  ◉ Convertir en tableau     │
└─────────────────────────────┘
```

### Modal Preview (succès)

```
┌──────────────────────────────────────────────────────────────┐
│  Aperçu du tableau                                        ✕  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ VITAMINE      │ RÔLE & BIENFAITS        │ SOURCES      │  │
│  ├───────────────┼─────────────────────────┼──────────────┤  │
│  │ Vitamine B1   │ Essentielle au...       │ Céréales...  │  │
│  │ Vitamine B2   │ Participe au...         │ Produits...  │  │
│  └───────────────┴─────────────────────────┴──────────────┘  │
│                                                              │
│  ℹ️ 3 colonnes détectées • 9 lignes                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                        [Annuler]  [✓ Insérer le tableau]     │
└──────────────────────────────────────────────────────────────┘
```

### Modal Fallback (échec IA)

```
┌──────────────────────────────────────────────────────────────┐
│  Choisir un format                                        ✕  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  L'analyse automatique a échoué.                             │
│  Choisissez un format de tableau :                           │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│  │ 2 cols  │  │ 3 cols  │  │ 4 cols  │                      │
│  │ ━━━━━━  │  │ ━━━━━━  │  │ ━━━━━━  │                      │
│  │ A │ B   │  │ A│B│C   │  │A│B│C│D  │                      │
│  └─────────┘  └─────────┘  └─────────┘                      │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                   [Annuler]  [Utiliser ce format]            │
└──────────────────────────────────────────────────────────────┘
```

## Design Tokens

### Couleurs du tableau (charte Oum Soumayya)

```css
/* Header */
--table-header-bg: #9CAF88;      /* Vert sauge */
--table-header-text: #FDFBF7;    /* Blanc cassé */

/* Lignes alternées */
--table-row-odd: #FDFBF7;        /* Blanc cassé */
--table-row-even: #F5F0E8;       /* Beige lin */

/* Bordures */
--table-border: #C9A962;         /* Or accent */

/* Texte */
--table-text-primary: #2D4A3E;   /* Vert bouteille */
--table-text-muted: #6B7280;     /* Gris */
```

## Data Structures

```typescript
interface TableData {
  headers: string[];
  rows: TableRow[];
}

interface TableRow {
  cells: TableCell[];
}

interface TableCell {
  content: string;
  subtitle?: string;  // Ex: "Thiamine" sous "Vitamine B1"
}
```

## Fichiers impactés

| Action | Fichier |
|--------|---------|
| Créer | `services/tableService.ts` |
| Créer | `components/TablePreviewModal.tsx` |
| Modifier | `package.json` |
| Modifier | `types.ts` |
| Modifier | `components/TipTapEditor.tsx` |
| Modifier | `components/Icons.tsx` |
| Modifier | `src/index.css` |
| Modifier | `services/latexService.ts` |

## Accessibility (WCAG 2.1)

- Contraste header vert sauge sur blanc : 3.2:1 ✓
- Navigation clavier dans le menu contextuel
- Focus trap dans la modal
- Escape pour fermer
- `role="dialog"`, `aria-modal="true"`
- Tables avec `scope="col"` sur headers

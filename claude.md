# Rich Text Book Editor - Development Session Summary

## Project Overview

**Project:** Rich Text Book Editor for "La Sante dans l'Assiette" (Health on Your Plate)
**Description:** A French naturopathy book editing application
**Tech Stack:** React 19, TypeScript, Vite, TipTap editor, Firebase (Firestore), Tailwind CSS v4
**Live URL:** https://sante-dans-assiette-editor.pages.dev
**Hosting:** Cloudflare Pages (direct upload)

---

## Session Accomplishments

### 1. Export System - Content Loading Fix

**Problem:** All export formats (PDF, DOCX, HTML, JSON) produced documents with blank content because Firebase stores content lazily - only loaded when a chapter is selected.

**Solution:** Added `loadAllContentForExport()` function in `App.tsx` that fetches all chapter content from Firebase before any export operation.

**Files Modified:**
- `App.tsx` - Added content loading for all export handlers

---

### 2. PDF Export - jsPDF Issues (Multiple Attempts)

**Problems Encountered:**
1. Character spacing issues with French characters
2. Misused `<h2>` tags (containing paragraphs) rendered as bold headings
3. Font limitations with Helvetica

**Attempted Solutions:**
- Added `normalizeTextForPDF()` function to replace problematic Unicode characters
- Added `charSpace: 0` to all text rendering calls
- Implemented heuristic heading detection (text > 150 chars = paragraph, not heading)

**Files Modified:**
- `services/pdfService.ts` - Multiple rewrites attempting to fix rendering

**Outcome:** Issues persisted due to fundamental jsPDF limitations with complex typography.

---

### 3. LaTeX/Overleaf PDF Export (Final Solution)

**Decision:** Replace jsPDF with LaTeX-based export via Overleaf for professional-quality PDFs.

**Implementation:**

Created `services/latexService.ts` with:
- `generateLatexDocument()` - Generates complete LaTeX document
- `htmlToLatex()` - Converts HTML content to LaTeX syntax
- `escapeLatex()` - Escapes special LaTeX characters
- `openInOverleaf()` - Opens document in Overleaf via form POST
- `downloadTexFile()` - Downloads .tex file for local compilation

**LaTeX Template Features:**
- Kindle 6x9" page format
- EB Garamond font (elegant, guaranteed on Overleaf)
- Brand colors: Deep Green (#2D4A3E), Gold (#C9A962)
- Professional chapter styling
- Gold-bordered blockquotes
- Table of contents
- French language support (babel)

**Bug Fix:** Initial implementation used URL encoding which caused "414 Request-URI Too Large" error. Fixed by using form POST method instead.

**Files Created:**
- `services/latexService.ts`

**Files Modified:**
- `App.tsx` - Replaced PDF export with LaTeX options

**Export Menu Structure:**
```
PDF
├── PDF via Overleaf (opens Overleaf with document)
└── Telecharger .tex (downloads for local compilation)

Autres formats
├── Export DOCX (Word)
└── Export HTML

Sauvegarde
├── Sauvegarder (JSON)
└── Restaurer sauvegarde

Imprimer (navigateur)
```

---

### 4. AI Editorial Assistant

**Feature:** Modal-based AI assistant that analyzes chapters and provides editorial feedback with back-and-forth chat capability.

**Implementation:**

Created `services/feedbackService.ts` with:
- `analyzeChapter()` - Initial comprehensive analysis
- `continueConversation()` - Follow-up questions with context
- `getQuickFeedback()` - Targeted feedback on specific aspects
- Uses `gemini-2.5-pro` model

**Feedback Covers:**
- Writing style and clarity
- Grammar and spelling (French)
- Content accuracy
- Structure and flow
- Engagement and readability

Created `components/FeedbackModal.tsx`:
- Beautiful modal UI with chat interface
- "Analyser ce chapitre" button for initial analysis
- Chat input for follow-up questions
- Markdown rendering for formatted responses
- Loading states and error handling

**Key Design Decision:** AI is read-only - it cannot modify content, only suggests improvements through dialogue.

**Files Created:**
- `services/feedbackService.ts`
- `components/FeedbackModal.tsx`

**Files Modified:**
- `components/Icons.tsx` - Added MessageSquareText, Send, Bot icons
- `App.tsx` - Added feedback modal state and purple "Assistant IA" button

---

## File Summary

### New Files Created

| File | Purpose |
|------|---------|
| `services/latexService.ts` | LaTeX document generation and Overleaf integration |
| `services/feedbackService.ts` | AI editorial feedback via Gemini API |
| `components/FeedbackModal.tsx` | Chat-style AI assistant modal UI |

### Files Modified

| File | Changes |
|------|---------|
| `App.tsx` | Export handlers, LaTeX integration, AI feedback modal |
| `components/Icons.tsx` | New icons for AI assistant |
| `services/pdfService.ts` | Multiple attempts at fixing (kept but replaced by LaTeX) |
| `services/exportService.ts` | DOCX export heuristic heading detection |

---

## Deployment

**Platform:** Cloudflare Pages
**Deploy Command:**
```bash
npm run build && CLOUDFLARE_ACCOUNT_ID=b12c5eabd8c77ca8249e65de678ab3f2 npx wrangler pages deploy dist --project-name=sante-dans-assiette-editor --commit-dirty=true
```

---

## Technical Notes

### LaTeX Overleaf Integration

Uses form POST to avoid URL length limits:
```typescript
const form = document.createElement('form');
form.method = 'POST';
form.action = 'https://www.overleaf.com/docs';
form.target = '_blank';
// Add textarea with LaTeX content
form.submit();
```

### AI Feedback System Prompt

The AI assistant is configured as a professional French editor specializing in health/naturopathy books. Key behaviors:
- Always responds in French
- Provides constructive, actionable feedback
- Never rewrites content - only suggests
- Cites specific passages when making suggestions

### Heuristic Heading Detection

For both PDF and DOCX exports, `<h2>` and `<h3>` tags are analyzed:
- If `className` includes "subtitle" or "title" → Real heading
- If text length < 150 chars AND no `. ` (period-space) → Real heading
- Otherwise → Treat as paragraph (was misused in original document)

---

### 5. List to Table Conversion (AI-Powered)

**Feature:** Convert lists to styled tables using AI analysis or manual templates.

**Implementation:**

Created `services/tableService.ts` with:
- `analyzeListForTable()` - AI analysis via Gemini to detect optimal table structure
- `convertListWithTemplate()` - Manual fallback with 2/3/4 column templates
- `generateTableHtml()` - Generates styled HTML table with paragraphs before/after for easy navigation
- `TABLE_TEMPLATES` - Predefined templates for fallback mode

Created `components/TablePreviewModal.tsx`:
- Preview modal showing generated table before insertion
- Loading state during AI analysis
- Fallback UI with template selection if AI fails
- Accept/Cancel buttons

**User Flow:**
1. User places cursor in a list (ul/ol)
2. "Tableau" button in toolbar becomes active (gold color)
3. Click button → AI analyzes list structure
4. Preview modal shows proposed table
5. User accepts → table replaces list with empty paragraphs before/after

**Table Styling (WYSIWYG - matches LaTeX export):**
- Header: Vert sauge (#9CAF88)
- Alternating rows: Blanc cassé (#FDFBF7) / Beige lin (#F5F0E8)
- Borders: Gold accent (#C9A962)
- First column: Bold vert bouteille (#2D4A3E)

**LaTeX Export:**
- Added `tableToLatex()` function in `latexService.ts`
- Uses `tabularx` with `colortbl` for styled tables
- Automatic detection and conversion of `<table class="styled-table">`

**Files Created:**
- `services/tableService.ts`
- `components/TablePreviewModal.tsx`
- `docs/plans/2024-12-15-list-to-table-design.md`

**Files Modified:**
- `components/TipTapEditor.tsx` - Added Table extensions, toolbar button, list detection
- `components/Icons.tsx` - Added Table2, RefreshCw icons
- `services/latexService.ts` - Added tableToLatex(), colortbl/tabularx packages
- `src/index.css` - Added .styled-table CSS styles
- `types.ts` - Added TableData, TableRow, TableCell, TableTemplate types
- `package.json` - Added @tiptap/extension-table dependencies

**Dependencies Added:**
```
@tiptap/extension-table
@tiptap/extension-table-row
@tiptap/extension-table-cell
@tiptap/extension-table-header
```

---

## File Summary

### New Files Created

| File | Purpose |
|------|---------|
| `services/latexService.ts` | LaTeX document generation and Overleaf integration |
| `services/feedbackService.ts` | AI editorial feedback via Gemini API |
| `services/tableService.ts` | AI-powered list to table conversion |
| `components/FeedbackModal.tsx` | Chat-style AI assistant modal UI |
| `components/TablePreviewModal.tsx` | Table preview with accept/cancel |
| `components/TitlePageEditor.tsx` | Form-based title page editor |
| `components/TableOfContents.tsx` | Dynamic auto-updating TOC |
| `docs/plans/2024-12-15-list-to-table-design.md` | Design document for table feature |

### Files Modified

| File | Changes |
|------|---------|
| `App.tsx` | Export handlers, LaTeX integration, AI feedback modal, front matter state |
| `components/TipTapEditor.tsx` | Table extensions, toolbar button, list detection |
| `components/Sidebar.tsx` | Added front matter section with gold styling |
| `components/Icons.tsx` | New icons (MessageSquareText, Send, Bot, Table2, RefreshCw, ClipboardList, BookCopy, ListTree) |
| `services/pdfService.ts` | Multiple attempts at fixing (kept but replaced by LaTeX) |
| `services/latexService.ts` | Added tableToLatex(), table colors, tabularx support, front matter export |
| `services/firebaseService.ts` | Added saveFrontMatter(), loadFrontMatter() |
| `services/exportService.ts` | DOCX export heuristic heading detection |
| `src/index.css` | Added .styled-table CSS for WYSIWYG tables |
| `types.ts` | Added TableData, TableRow, TableCell, FrontMatter, TitlePageData types |
| `package.json` | Added TipTap table extension dependencies |

---

## Deployment

**Platform:** Cloudflare Pages
**Deploy Command:**
```bash
npm run build && CLOUDFLARE_ACCOUNT_ID=b12c5eabd8c77ca8249e65de678ab3f2 npx wrangler pages deploy dist --project-name=sante-dans-assiette-editor --commit-dirty=true
```

---

## Technical Notes

### LaTeX Overleaf Integration

Uses form POST to avoid URL length limits:
```typescript
const form = document.createElement('form');
form.method = 'POST';
form.action = 'https://www.overleaf.com/docs';
form.target = '_blank';
// Add textarea with LaTeX content
form.submit();
```

### AI Feedback System Prompt

The AI assistant is configured as a professional French editor specializing in health/naturopathy books. Key behaviors:
- Always responds in French
- Provides constructive, actionable feedback
- Never rewrites content - only suggests
- Cites specific passages when making suggestions

### Heuristic Heading Detection

For both PDF and DOCX exports, `<h2>` and `<h3>` tags are analyzed:
- If `className` includes "subtitle" or "title" → Real heading
- If text length < 150 chars AND no `. ` (period-space) → Real heading
- Otherwise → Treat as paragraph (was misused in original document)

### List to Table Conversion

AI prompt for Gemini analysis:
- Detects optimal number of columns (2-4)
- Identifies term/description patterns
- Extracts subtitles (e.g., "Vitamine B1 (Thiamine)")
- Returns structured JSON for table generation

Fallback templates:
- 2 columns: Split on `:` or `-`
- 3 columns: Split on `:` then `,` or `-`
- 4 columns: Distribute words evenly

---

### 6. Deployment Fixes (Dec 17, 2025)

**Problem 1:** Cloudflare Pages deployment failed with `npm ci` error - `package-lock.json` out of sync with `@floating-ui/dom@1.7.4`.

**Solution:** Regenerated `package-lock.json` with clean `npm install`.

**Problem 2:** Missing Underline extension in TipTapEditor causing runtime errors.

**Solution:** Added missing import and extension registration:
```typescript
import Underline from '@tiptap/extension-underline';
// ... in extensions array:
Underline,
```

**Problem 3:** "Tableau" button not appearing after deployment - Cloudflare serving stale build.

**Root Cause:** Cloudflare Pages GitHub integration was serving an old cached build (`index-gOL6X4VY.js`) that predated the Tableau feature.

**Solution:** Manual deployment using `wrangler pages deploy dist` to force upload of correct build.

**Key Learning:** Always use manual deploy command for immediate updates:
```bash
npm run build && CLOUDFLARE_ACCOUNT_ID=b12c5eabd8c77ca8249e65de678ab3f2 npx wrangler pages deploy dist --project-name=sante-dans-assiette-editor --commit-dirty=true
```

GitHub-triggered builds may use cached artifacts or fail silently.

---

### 7. Front Matter System (Dec 18, 2025)

**Feature:** Dedicated front matter section for book preliminaries (Mise en garde, Page de titre, Table des matieres).

**Implementation:**

**New Types** (`types.ts`):
- `TitlePageData` - Form fields for title page (title, subtitle1, subtitle2, author, credentials, contact)
- `FrontMatter` - Container for disclaimer HTML and titlePage data
- `FrontMatterSection` - Union type: `'disclaimer' | 'titlePage' | 'tableOfContents'`

**Firebase Integration** (`services/firebaseService.ts`):
- `saveFrontMatter()` - Saves front matter to Firebase subcollection
- `loadFrontMatter()` - Loads front matter on app init

**New Components:**
- `components/TitlePageEditor.tsx` - Form-based editor with 6 labeled fields + live preview card
- `components/TableOfContents.tsx` - Dynamic TOC that auto-updates when chapters change

**Sidebar Enhancement** (`components/Sidebar.tsx`):
- Added collapsible "Pages liminaires" section at top (gold accent color)
- Three items: Mise en garde, Page de titre, Table des matieres
- Uses `ClipboardList`, `BookCopy`, `ListTree` icons

**LaTeX Export** (`services/latexService.ts`):
- Disclaimer renders before title page with decorative styling
- Title page uses all form fields (subtitles, credentials, contact)
- Both appear before `\tableofcontents`

**UI Location:**
```
▼ Pages liminaires (gold)
   📋 Mise en garde      → TipTap rich text editor
   📕 Page de titre      → Form with 6 fields + preview
   🌳 Table des matieres → Dynamic clickable TOC
─────────────────────────
▼ PARTIE 1: Mon Livre (green)
   ...chapters...
```

**Files Created:**
- `components/TitlePageEditor.tsx`
- `components/TableOfContents.tsx`

**Files Modified:**
- `types.ts` - Added FrontMatter types
- `services/firebaseService.ts` - Added front matter save/load
- `services/latexService.ts` - Added front matter to LaTeX export
- `components/Sidebar.tsx` - Added front matter section
- `components/Icons.tsx` - Added ClipboardList, BookCopy, ListTree icons
- `App.tsx` - Added front matter state, handlers, conditional rendering

---

## Future Considerations

1. **PDF via Overleaf** requires user to click "Recompile" - could explore server-side compilation for one-click PDF
2. **AI Assistant** could be extended to analyze full book consistency across chapters
3. **DOCX Export** still has the heuristic heading detection but wasn't fully tested this session
4. **Table Editing** - could add in-place table editing (add/remove rows/columns)
5. **Table Templates** - could add more predefined table styles/themes
6. **Cloudflare Deployment** - Consider disabling GitHub integration to avoid stale builds, or configure cache purging
7. **Front Matter DOCX/HTML Export** - Currently only exports to LaTeX; could extend to other formats

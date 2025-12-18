// ============================================
// Book Content Types
// ============================================

export interface BookVersion {
  id: string;
  timestamp: number;
  content: string; // HTML content
  summary?: string;
}

export enum SectionStatus {
  DRAFT = 'Brouillon',
  REVIEW = 'En révision',
  VALIDATED = 'Validé',
}

export interface BookSection {
  id: string;
  title: string;
  content: string; // Current HTML content (semantic classes)
  rawText?: string; // Original text if available
  status: SectionStatus;
  history: BookVersion[];
  wordCount?: number;
  lastModified?: number;
}

export interface BookPart {
  id: string;
  title: string;
  chapters: BookSection[];
  description?: string; // Optional part description
}

// ============================================
// Front Matter Types (Disclaimer + Title Page)
// ============================================

export interface TitlePageData {
  title: string;           // "La Santé dans l'assiette"
  subtitle1: string;       // "30 Jours pour se soigner"
  subtitle2: string;       // "Ramadan, ma guérison"
  author: string;          // "Oum Soumayya"
  credentials: string;     // "Praticienne en Hijama - Naturopathie..."
  contact: string;         // "monremede@gmail.com"
}

export interface FrontMatter {
  disclaimer: string;      // Mise en garde - HTML content (TipTap)
  titlePage: TitlePageData; // Page de titre - form fields
}

export type FrontMatterSection = 'disclaimer' | 'titlePage' | 'tableOfContents';

export interface BookStructure {
  parts: BookPart[];
  metadata?: BookMetadata;
  frontMatter?: FrontMatter;
}

export interface BookMetadata {
  title: string;
  subtitle?: string;
  author: string;
  authorCredentials?: string;
  version: string;
  lastUpdated: number;
  totalChapters: number;
  totalWords: number;
}

// ============================================
// Theme Types
// ============================================

export type ThemeMode = 'web' | 'print';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  description: string;
  cssClass: string;
}

export const THEMES: Record<ThemeMode, ThemeConfig> = {
  web: {
    id: 'web',
    name: 'Vue Riche',
    description: 'Affichage web avec couleurs et effets',
    cssClass: 'theme-web',
  },
  print: {
    id: 'print',
    name: 'Vue Impression',
    description: 'Optimisé pour Kindle/PDF (6x9 pouces)',
    cssClass: 'theme-print',
  },
};

// ============================================
// AI Types
// ============================================

export interface AIRequestOptions {
  type: 'FORMAT' | 'CORRECT' | 'REWRITE' | 'SEMANTIC';
  instructions?: string;
}

// ============================================
// Editor Types
// ============================================

export type ViewMode = 'WEB' | 'PRINT';

export type EditorMode = 'visual' | 'html';

// Semantic block types available in the editor
export type SemanticBlockType = 
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'hadith'
  | 'verse'
  | 'info'
  | 'tip'
  | 'warning'
  | 'study'
  | 'anecdote'
  | 'plant'
  | 'mineral'
  | 'vitamin'
  | 'recipe'
  | 'cause'
  | 'maladie'
  | 'citation'
  | 'separator'
  | 'list'
  | 'numberedList';

export interface SemanticBlockConfig {
  type: SemanticBlockType;
  label: string;
  icon: string;
  className: string;
  htmlTag: string;
  description?: string;
}

// Block configurations for the editor toolbar
export const SEMANTIC_BLOCKS: SemanticBlockConfig[] = [
  { type: 'paragraph', label: 'Paragraphe', icon: 'Pilcrow', className: 'paragraph', htmlTag: 'p' },
  { type: 'heading1', label: 'Titre Principal', icon: 'Heading1', className: 'chapter-title', htmlTag: 'h1' },
  { type: 'heading2', label: 'Sous-titre', icon: 'Heading2', className: 'subtitle', htmlTag: 'h2' },
  { type: 'heading3', label: 'Sous-section', icon: 'Heading3', className: 'sub-subtitle', htmlTag: 'h3' },
  { type: 'hadith', label: 'Hadith', icon: 'BookMarked', className: 'hadith-box', htmlTag: 'div' },
  { type: 'verse', label: 'Verset', icon: 'BookMarked', className: 'verse-box', htmlTag: 'div' },
  { type: 'info', label: 'Information', icon: 'AlertCircle', className: 'info-box', htmlTag: 'div' },
  { type: 'tip', label: 'Conseil', icon: 'Sparkles', className: 'tip-box', htmlTag: 'div' },
  { type: 'warning', label: 'Attention', icon: 'AlertCircle', className: 'warning-box', htmlTag: 'div' },
  { type: 'study', label: 'Étude', icon: 'FileText', className: 'study-box', htmlTag: 'div' },
  { type: 'anecdote', label: 'Anecdote', icon: 'Quote', className: 'anecdote-box', htmlTag: 'div' },
  { type: 'plant', label: 'Plante/Herbe', icon: 'Sparkles', className: 'plant-box', htmlTag: 'div' },
  { type: 'mineral', label: 'Minéral', icon: 'Sparkles', className: 'mineral-box', htmlTag: 'div' },
  { type: 'vitamin', label: 'Vitamine', icon: 'Sparkles', className: 'vitamin-box', htmlTag: 'div' },
  { type: 'recipe', label: 'Recette', icon: 'FileText', className: 'recipe-card', htmlTag: 'div' },
  { type: 'citation', label: 'Citation', icon: 'Quote', className: 'citation-box', htmlTag: 'blockquote' },
  { type: 'separator', label: 'Séparateur', icon: 'SeparatorHorizontal', className: 'separator', htmlTag: 'div' },
  { type: 'list', label: 'Liste', icon: 'List', className: 'styled-list', htmlTag: 'ul' },
  { type: 'numberedList', label: 'Liste numérotée', icon: 'ListOrdered', className: 'numbered-list', htmlTag: 'ol' },
];

// ============================================
// Import/Export Types
// ============================================

export interface ImportResult {
  success: boolean;
  parts: BookPart[];
  errors?: string[];
  warnings?: string[];
}

export interface ExportOptions {
  format: 'pdf' | 'epub' | 'html' | 'docx';
  theme: ThemeMode;
  includeTableOfContents: boolean;
  includeCover: boolean;
  pageSize?: '6x9' | 'a4' | 'letter';
}

// ============================================
// Firebase Types
// ============================================

export interface FirebaseBookData {
  structure: {
    parts: Array<{
      id: string;
      title: string;
      chapters: Array<{
        id: string;
        title: string;
        status: SectionStatus;
      }>;
    }>;
  };
  metadata?: BookMetadata;
  lastUpdated: number;
}

export interface FirebaseSectionData {
  content: string;
  status: SectionStatus;
  lastUpdated: number;
  wordCount?: number;
}

// ============================================
// Table Conversion Types (List → Table)
// ============================================

export interface TableData {
  headers: string[];
  rows: TableRow[];
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableCell {
  content: string;
  subtitle?: string;  // Ex: "Thiamine" sous "Vitamine B1"
}

// Template options for fallback when AI fails
export type TableTemplate = '2-cols' | '3-cols' | '4-cols';

export interface TableTemplateConfig {
  id: TableTemplate;
  label: string;
  description: string;
  columns: number;
  defaultHeaders: string[];
}

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
  content: string; // Current HTML content
  rawText?: string; // Original text if available
  status: SectionStatus;
  history: BookVersion[];
}

export interface BookPart {
  id: string;
  title: string;
  chapters: BookSection[];
}

export interface BookStructure {
  parts: BookPart[];
}

export interface AIRequestOptions {
  type: 'FORMAT' | 'CORRECT' | 'REWRITE';
  instructions?: string;
}

export type ViewMode = 'WEB' | 'PRINT';

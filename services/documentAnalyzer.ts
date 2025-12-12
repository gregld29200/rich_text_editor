/**
 * Document Analyzer Service
 * Analyzes DOCX/HTML content and auto-detects structure (parts, chapters)
 * Creates a BookStructure from any document
 */

import { BookStructure, BookPart, BookSection, SectionStatus } from '../types';

// Patterns for detecting parts/sections
const PART_PATTERNS = [
  /^PARTIE\s+([IVXLCDM]+|\d+)\s*[-–—:.]?\s*(.*)/i,
  /^PART\s+([IVXLCDM]+|\d+)\s*[-–—:.]?\s*(.*)/i,
  /^SECTION\s+([IVXLCDM]+|\d+)\s*[-–—:.]?\s*(.*)/i,
  /^LIVRE\s+([IVXLCDM]+|\d+)\s*[-–—:.]?\s*(.*)/i,
];

// Patterns for detecting chapters
const CHAPTER_PATTERNS = [
  /^CHAPITRE\s+(\w+)\s*[-–—:.]?\s*(.*)/i,
  /^CHAPTER\s+(\w+)\s*[-–—:.]?\s*(.*)/i,
  /^(\d+)\.\s+(.*)/,  // "1. Title"
  /^([IVXLCDM]+)\.\s+(.*)/i,  // "I. Title"
];

// Emoji regex for cleaning
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|💧|⚖️|✨|🌿|☕|🍵|🧘|🔥|⚠️|💪|🩺|🧬|🫀|🧠|🦴|🩸|💊|🌱|🍃|🌾|🥗|🥤|🍯|🫒|🥜|🌰|🫚|🧄|🧅|🥕|🥒|🥬|🍋|🍊|🍎|🥑|🫐|🍇|🌶️|🧂|⏰|📝|✅|❌|⭐|🔹|🔸|▪️|▫️|•/gu;

interface HeadingInfo {
  level: number;  // 1 = h1/part, 2 = h2/chapter, 3 = h3/section
  text: string;
  index: number;  // Position in the HTML
  type: 'part' | 'chapter' | 'subheading';
}

/**
 * Remove emojis from text
 */
function removeEmojis(text: string): string {
  return text.replace(EMOJI_REGEX, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Clean title - remove chapter/part numbers
 */
function cleanTitle(text: string): string {
  let cleaned = removeEmojis(text);
  
  // Remove "Chapitre X" prefix
  cleaned = cleaned.replace(/^(CHAPITRE|CHAPTER)\s+\w+\s*[-–—:.]?\s*/i, '');
  
  // Remove "Partie X" prefix but keep the rest
  cleaned = cleaned.replace(/^(PARTIE|PART|SECTION)\s+[IVXLCDM\d]+\s*[-–—:.]?\s*/i, '');
  
  // Remove leading punctuation
  cleaned = cleaned.replace(/^[-–—:.\s]+/, '');
  
  return cleaned.trim() || 'Sans titre';
}

/**
 * Detect if text is a part header
 */
function isPartHeader(text: string): boolean {
  const cleaned = text.trim();
  return PART_PATTERNS.some(pattern => pattern.test(cleaned));
}

/**
 * Detect if text is a chapter header
 */
function isChapterHeader(text: string): boolean {
  const cleaned = text.trim();
  // Must be relatively short to be a chapter title
  if (cleaned.length > 150) return false;
  return CHAPTER_PATTERNS.some(pattern => pattern.test(cleaned));
}

/**
 * Extract headings from HTML content
 */
function extractHeadings(html: string): HeadingInfo[] {
  const headings: HeadingInfo[] = [];
  
  // Match h1, h2, h3 tags
  const h1Regex = /<h1[^>]*>(.*?)<\/h1>/gi;
  const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
  const h3Regex = /<h3[^>]*>(.*?)<\/h3>/gi;
  
  // Also check for strong tags that might be headings
  const strongRegex = /<p[^>]*>\s*<strong>(.*?)<\/strong>\s*<\/p>/gi;
  
  let match;
  
  // Extract h1
  while ((match = h1Regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 2) {
      headings.push({
        level: 1,
        text: text,
        index: match.index,
        type: isPartHeader(text) ? 'part' : 'chapter'
      });
    }
  }
  
  // Extract h2
  while ((match = h2Regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 2) {
      headings.push({
        level: 2,
        text: text,
        index: match.index,
        type: isPartHeader(text) ? 'part' : (isChapterHeader(text) ? 'chapter' : 'subheading')
      });
    }
  }
  
  // Extract strong tags that look like part/chapter headers
  while ((match = strongRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 2 && text.length < 150) {
      if (isPartHeader(text)) {
        headings.push({
          level: 1,
          text: text,
          index: match.index,
          type: 'part'
        });
      } else if (isChapterHeader(text)) {
        headings.push({
          level: 2,
          text: text,
          index: match.index,
          type: 'chapter'
        });
      }
    }
  }
  
  // Sort by index
  headings.sort((a, b) => a.index - b.index);
  
  return headings;
}

/**
 * Process HTML content - add semantic classes
 */
function processContent(html: string): string {
  let processed = removeEmojis(html);
  
  // Add semantic classes
  processed = processed.replace(/<h1>/gi, '<h1 class="chapter-title">');
  processed = processed.replace(/<h2>/gi, '<h2 class="subtitle">');
  processed = processed.replace(/<h3>/gi, '<h3 class="sub-subtitle">');
  processed = processed.replace(/<p>(?!class=)/gi, '<p class="paragraph">');
  processed = processed.replace(/<ul>/gi, '<ul class="styled-list">');
  processed = processed.replace(/<ol>/gi, '<ol class="numbered-list">');
  processed = processed.replace(/<blockquote>/gi, '<blockquote class="citation-box">');
  
  // Clean up empty paragraphs
  processed = processed.replace(/<p[^>]*>\s*<\/p>/gi, '');
  
  return processed.trim();
}

/**
 * Generate a slug ID from text
 */
function generateId(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30);
  
  return `${slug}-${index}`;
}

/**
 * Main function: Analyze HTML and create BookStructure
 */
export function analyzeDocument(html: string, documentTitle: string = 'Document importé'): BookStructure {
  const headings = extractHeadings(html);
  
  console.log('Found headings:', headings.map(h => `[${h.type}] ${h.text.substring(0, 50)}`));
  
  const parts: BookPart[] = [];
  let currentPart: BookPart | null = null;
  let currentChapterContent: string[] = [];
  let currentChapterTitle: string | null = null;
  let currentChapterStartIndex: number = 0;
  let chapterIndex = 0;
  let partIndex = 0;
  
  // If no parts detected, create a default part
  const hasParts = headings.some(h => h.type === 'part');
  
  if (!hasParts) {
    currentPart = {
      id: 'part-1',
      title: documentTitle,
      chapters: []
    };
  }
  
  // Process each heading
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];
    
    // Get content between this heading and the next
    const startIdx = heading.index;
    const endIdx = nextHeading ? nextHeading.index : html.length;
    const content = html.substring(startIdx, endIdx);
    
    if (heading.type === 'part') {
      // Save current part if exists
      if (currentPart && currentPart.chapters.length > 0) {
        parts.push(currentPart);
      }
      
      // Start new part
      partIndex++;
      currentPart = {
        id: `part-${partIndex}`,
        title: cleanTitle(heading.text),
        chapters: []
      };
      
      // Reset chapter tracking
      currentChapterTitle = null;
      currentChapterContent = [];
      
    } else if (heading.type === 'chapter') {
      // Save previous chapter if exists
      if (currentChapterTitle && currentChapterContent.length > 0 && currentPart) {
        chapterIndex++;
        const chapterContent = processContent(currentChapterContent.join(''));
        currentPart.chapters.push({
          id: generateId(currentChapterTitle, chapterIndex),
          title: cleanTitle(currentChapterTitle),
          content: `<div class="chapter">\n<h1 class="chapter-title">${cleanTitle(currentChapterTitle)}</h1>\n<div class="separator">───── ◆ ─────</div>\n${chapterContent}\n</div>`,
          status: SectionStatus.DRAFT,
          history: []
        });
      }
      
      // Ensure we have a part
      if (!currentPart) {
        partIndex++;
        currentPart = {
          id: `part-${partIndex}`,
          title: documentTitle,
          chapters: []
        };
      }
      
      // Start new chapter
      currentChapterTitle = heading.text;
      currentChapterContent = [content];
      currentChapterStartIndex = startIdx;
      
    } else {
      // Subheading or content - add to current chapter
      if (currentChapterTitle) {
        currentChapterContent.push(content);
      } else if (currentPart) {
        // Content before first chapter - create intro chapter
        chapterIndex++;
        const chapterContent = processContent(content);
        if (chapterContent.length > 100) {
          currentPart.chapters.push({
            id: generateId(heading.text || 'introduction', chapterIndex),
            title: cleanTitle(heading.text) || 'Introduction',
            content: `<div class="chapter">\n<h1 class="chapter-title">${cleanTitle(heading.text) || 'Introduction'}</h1>\n<div class="separator">───── ◆ ─────</div>\n${chapterContent}\n</div>`,
            status: SectionStatus.DRAFT,
            history: []
          });
        }
      }
    }
  }
  
  // Save final chapter
  if (currentChapterTitle && currentChapterContent.length > 0 && currentPart) {
    chapterIndex++;
    const chapterContent = processContent(currentChapterContent.join(''));
    currentPart.chapters.push({
      id: generateId(currentChapterTitle, chapterIndex),
      title: cleanTitle(currentChapterTitle),
      content: `<div class="chapter">\n<h1 class="chapter-title">${cleanTitle(currentChapterTitle)}</h1>\n<div class="separator">───── ◆ ─────</div>\n${chapterContent}\n</div>`,
      status: SectionStatus.DRAFT,
      history: []
    });
  }
  
  // Save final part
  if (currentPart && currentPart.chapters.length > 0) {
    parts.push(currentPart);
  }
  
  // If no structure detected, create single chapter with all content
  if (parts.length === 0) {
    const processedContent = processContent(html);
    parts.push({
      id: 'part-1',
      title: documentTitle,
      chapters: [{
        id: 'chapter-1',
        title: documentTitle,
        content: `<div class="chapter">\n<h1 class="chapter-title">${documentTitle}</h1>\n<div class="separator">───── ◆ ─────</div>\n${processedContent}\n</div>`,
        status: SectionStatus.DRAFT,
        history: []
      }]
    });
  }
  
  // Calculate stats
  const totalChapters = parts.reduce((sum, p) => sum + p.chapters.length, 0);
  const totalWords = parts.reduce((sum, p) => {
    return sum + p.chapters.reduce((csum, ch) => {
      const text = ch.content.replace(/<[^>]+>/g, ' ');
      return csum + text.split(/\s+/).filter(w => w.length > 0).length;
    }, 0);
  }, 0);
  
  console.log(`Analyzed document: ${parts.length} parts, ${totalChapters} chapters, ~${totalWords} words`);
  
  return {
    parts,
    metadata: {
      title: documentTitle,
      author: 'Auteur',
      version: '1.0',
      lastUpdated: Date.now(),
      totalChapters,
      totalWords
    }
  };
}

/**
 * Analyze with more aggressive chapter detection
 * Splits on any heading-like patterns
 */
export function analyzeDocumentAggressive(html: string, documentTitle: string = 'Document importé'): BookStructure {
  // Split by potential chapter markers
  const chapterSplitRegex = /<p[^>]*>\s*<strong>([^<]{3,100})<\/strong>\s*<\/p>|<h[123][^>]*>([^<]{3,150})<\/h[123]>/gi;
  
  const parts: BookPart[] = [];
  let currentPart: BookPart = {
    id: 'part-1',
    title: documentTitle,
    chapters: []
  };
  
  let lastIndex = 0;
  let chapterIndex = 0;
  let match;
  const matches: { index: number; title: string; length: number }[] = [];
  
  // Find all potential chapter starts
  while ((match = chapterSplitRegex.exec(html)) !== null) {
    const title = (match[1] || match[2]).replace(/<[^>]+>/g, '').trim();
    
    // Skip if it looks like regular content
    if (title.length < 3 || title.length > 150) continue;
    if (title.split(' ').length > 20) continue; // Too many words for a title
    
    matches.push({
      index: match.index,
      title: title,
      length: match[0].length
    });
  }
  
  // Create chapters from matches
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    
    // Check if this is a PARTIE header
    if (isPartHeader(current.title)) {
      if (currentPart.chapters.length > 0) {
        parts.push(currentPart);
      }
      currentPart = {
        id: `part-${parts.length + 1}`,
        title: cleanTitle(current.title),
        chapters: []
      };
      continue;
    }
    
    const startIdx = current.index;
    const endIdx = next ? next.index : html.length;
    const content = html.substring(startIdx, endIdx);
    
    // Skip very short content
    const textContent = content.replace(/<[^>]+>/g, ' ').trim();
    if (textContent.length < 50) continue;
    
    chapterIndex++;
    const processedContent = processContent(content);
    const title = cleanTitle(current.title);
    
    currentPart.chapters.push({
      id: generateId(title, chapterIndex),
      title: title,
      content: `<div class="chapter">\n<h1 class="chapter-title">${title}</h1>\n<div class="separator">───── ◆ ─────</div>\n${processedContent}\n</div>`,
      status: SectionStatus.DRAFT,
      history: []
    });
  }
  
  // Add final part
  if (currentPart.chapters.length > 0) {
    parts.push(currentPart);
  }
  
  // Fallback if no structure found
  if (parts.length === 0) {
    return analyzeDocument(html, documentTitle);
  }
  
  const totalChapters = parts.reduce((sum, p) => sum + p.chapters.length, 0);
  const totalWords = parts.reduce((sum, p) => {
    return sum + p.chapters.reduce((csum, ch) => {
      const text = ch.content.replace(/<[^>]+>/g, ' ');
      return csum + text.split(/\s+/).filter(w => w.length > 0).length;
    }, 0);
  }, 0);
  
  return {
    parts,
    metadata: {
      title: documentTitle,
      author: 'Auteur',
      version: '1.0',
      lastUpdated: Date.now(),
      totalChapters,
      totalWords
    }
  };
}

export default analyzeDocument;

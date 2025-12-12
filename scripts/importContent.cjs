/**
 * Content Import Script
 * Extracts chapter content from HTML files and creates a structured data file
 * Run with: node scripts/importContent.cjs
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = '/Users/gregld/Documents/Sante editor';
const OUTPUT_FILE = path.join(__dirname, '../data/bookContent.ts');

// HTML files to process in order
const HTML_FILES = [
  'livre_phase1_complete.html',
  'livre_phase2_complete.html', 
  'livre_phase3_1_complete.html',
  'livre_phase3_2_complete.html',
  'livre_phase3_3_complete.html',
  'livre_phase4_1_complete.html',
  'livre_phase4_2_complete.html',
  'livre_phase4_3_complete.html',
  'livre_phase5_complete.html',
  'livre_phase6_complete.html',
  'livre_phase7_complete.html',
  'livre_phase8_complete.html',
  'livre_phase9_complete.html',
  'livre_phase10_complete.html',
];

// Part mapping based on PLAN_DE_TRAVAIL
const PART_MAPPING = {
  'livre_phase1_complete.html': { partId: 'p1', partTitle: 'Fondations' },
  'livre_phase2_complete.html': { partId: 'p2', partTitle: 'Partie I : Le Jeûne & le Corps' },
  'livre_phase3_1_complete.html': { partId: 'p3', partTitle: 'Partie II : Nutrition & Pathologies' },
  'livre_phase3_2_complete.html': { partId: 'p3', partTitle: 'Partie II : Nutrition & Pathologies' },
  'livre_phase3_3_complete.html': { partId: 'p3', partTitle: 'Partie II : Nutrition & Pathologies' },
  'livre_phase4_1_complete.html': { partId: 'p4', partTitle: 'Partie III : Alimentation Moderne & Stress' },
  'livre_phase4_2_complete.html': { partId: 'p4', partTitle: 'Partie III : Alimentation Moderne & Stress' },
  'livre_phase4_3_complete.html': { partId: 'p4', partTitle: 'Partie III : Alimentation Moderne & Stress' },
  'livre_phase5_complete.html': { partId: 'p5', partTitle: 'Partie IV : Inflammation' },
  'livre_phase6_complete.html': { partId: 'p6', partTitle: 'Partie V : Migraines & Café' },
  'livre_phase7_complete.html': { partId: 'p7', partTitle: 'Partie VI : Coups de Pouce & Hijama' },
  'livre_phase8_complete.html': { partId: 'p8', partTitle: 'Partie VII : Ramadan selon les Saisons' },
  'livre_phase9_complete.html': { partId: 'p9', partTitle: 'Partie VIII : Remèdes & Aliments' },
  'livre_phase10_complete.html': { partId: 'p10', partTitle: 'Partie IX : Diabète' },
};

/**
 * Extract body content from HTML file
 */
function extractBodyContent(html) {
  // Find body tag content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return html; // Return full content if no body tag
  
  let content = bodyMatch[1];
  
  // Remove script tags
  content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
  
  return content.trim();
}

/**
 * Extract chapters from body content using split approach
 */
function extractChapters(bodyContent, fileName) {
  const chapters = [];
  
  // Split by chapter divs
  const parts = bodyContent.split(/<div class="chapitre">/i);
  
  // Skip the first part (before first chapter)
  for (let i = 1; i < parts.length; i++) {
    let chapterHtml = parts[i];
    
    // Find the end of this chapter (before footer or next major section)
    const footerIdx = chapterHtml.indexOf('<footer>');
    if (footerIdx !== -1) {
      chapterHtml = chapterHtml.substring(0, footerIdx);
    }
    
    // Extract chapter title
    const titleMatch = chapterHtml.match(/<div class="chapitre-titre">([\s\S]*?)<\/div>/i);
    let title = titleMatch ? titleMatch[1].trim().replace(/<[^>]*>/g, '') : `Chapitre ${i}`;
    
    // Clean up title
    title = title.replace(/\s+/g, ' ').trim();
    
    // Clean the content - remove header section
    let content = chapterHtml;
    content = content.replace(/<div class="chapitre-header">[\s\S]*?<\/div>\s*<div class="separateur-chapitre">[\s\S]*?<\/div>/gi, '');
    
    // Remove trailing separateur and closing div
    content = content.replace(/<div class="separateur">[^<]*<\/div>\s*$/gi, '');
    content = content.replace(/<\/div>\s*$/gi, '');
    
    // Wrap in proper structure with semantic classes
    content = `<div class="chapter">
<div class="chapter-header">
<h1 class="chapter-title">${title}</h1>
</div>
<div class="separator">───── ◆ ─────</div>
${content.trim()}
</div>`;
    
    // Normalize class names to semantic classes
    content = normalizeClasses(content);
    
    chapters.push({
      id: `${fileName.replace('.html', '').replace(/_/g, '-')}-ch${i - 1}`,
      title: title,
      content: content.trim(),
    });
  }
  
  return chapters;
}

/**
 * Normalize class names to semantic schema
 */
function normalizeClasses(html) {
  let result = html;
  
  // Map old classes to new semantic classes
  const classMap = {
    'chapitre-titre': 'chapter-title',
    'sous-titre': 'subtitle',
    'separateur-chapitre': 'separator',
    'separateur': 'separator',
    'no-indent': 'paragraph',
    'citation-exergue': 'citation-box',
    'info-box': 'info-box',
    'tip-box': 'tip-box',
    'warning-box': 'warning-box',
    'hadith-box': 'hadith-box',
    'verse-box': 'verse-box',
    'maladie-box': 'maladie-box',
    'cause-box': 'cause-box',
    'plante-box': 'plant-box',
    'herbe-box': 'plant-box',
    'mineral-box': 'mineral-box',
    'vitamin-box': 'vitamin-box',
    'anecdote-box': 'anecdote-box',
    'regime-box': 'info-box',
    'aliment-box': 'plant-box',
    'nutriment-box': 'mineral-box',
    'conseil-pratique': 'tip-box',
    'avertissement-box': 'warning-box',
    'huile-box': 'plant-box',
    'lettrine': 'drop-cap',
  };
  
  for (const [oldClass, newClass] of Object.entries(classMap)) {
    result = result.replace(new RegExp(`class="${oldClass}"`, 'gi'), `class="${newClass}"`);
    result = result.replace(new RegExp(`class='${oldClass}'`, 'gi'), `class="${newClass}"`);
  }
  
  return result;
}

/**
 * Process all HTML files
 */
function processAllFiles() {
  const parts = {};
  
  for (const fileName of HTML_FILES) {
    const filePath = path.join(SOURCE_DIR, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${fileName} - file not found`);
      continue;
    }
    
    console.log(`Processing ${fileName}...`);
    
    const html = fs.readFileSync(filePath, 'utf-8');
    const bodyContent = extractBodyContent(html);
    const chapters = extractChapters(bodyContent, fileName);
    
    const mapping = PART_MAPPING[fileName];
    if (!mapping) continue;
    
    const { partId, partTitle } = mapping;
    
    if (!parts[partId]) {
      parts[partId] = {
        id: partId,
        title: partTitle,
        chapters: [],
      };
    }
    
    parts[partId].chapters.push(...chapters);
    
    console.log(`  Found ${chapters.length} chapters`);
  }
  
  return Object.values(parts);
}

/**
 * Escape string for TypeScript template literal
 */
function escapeForTS(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

/**
 * Generate TypeScript output
 */
function generateOutput(parts) {
  // Calculate stats
  let totalChapters = 0;
  let totalWords = 0;
  
  for (const part of parts) {
    totalChapters += part.chapters.length;
    for (const chapter of part.chapters) {
      const text = chapter.content.replace(/<[^>]*>/g, ' ');
      totalWords += text.split(/\s+/).filter(w => w.length > 0).length;
    }
  }
  
  const chaptersData = parts.map(part => {
    return part.chapters.map(ch => ({
      partId: part.id,
      partTitle: part.title,
      ...ch
    }));
  }).flat();

  const output = `// ============================================
// BOOK CONTENT DATA
// Auto-generated from HTML source files
// Generated: ${new Date().toISOString()}
// Total: ${totalChapters} chapters, ~${totalWords} words
// ============================================

import { BookStructure, BookSection, SectionStatus } from '../types';

// All chapter content
const CHAPTERS: Record<string, { title: string; content: string }> = {
${chaptersData.map(ch => `  '${ch.id}': {
    title: ${JSON.stringify(ch.title)},
    content: \`${escapeForTS(ch.content)}\`,
  },`).join('\n')}
};

// Helper to create a chapter from the data
const createChapter = (id: string): BookSection => {
  const data = CHAPTERS[id];
  return {
    id,
    title: data?.title || id,
    content: data?.content || '',
    status: SectionStatus.VALIDATED,
    history: [],
  };
};

// Full Book Structure
export const IMPORTED_BOOK_DATA: BookStructure = {
  parts: [
${parts.map(part => `    {
      id: '${part.id}',
      title: ${JSON.stringify(part.title)},
      chapters: [
${part.chapters.map(ch => `        createChapter('${ch.id}'),`).join('\n')}
      ],
    },`).join('\n')}
  ],
  metadata: {
    title: 'La Santé dans l\\'Assiette',
    subtitle: '30 Jours pour se soigner - Ramadan, ma guérison',
    author: 'Oum Soumayya',
    authorCredentials: 'Praticienne en Hijama, Naturopathie, Acupuncture, Réflexologie, Massothérapie, Micronutrition',
    version: '2.0',
    lastUpdated: ${Date.now()},
    totalChapters: ${totalChapters},
    totalWords: ${totalWords},
  },
};

export default IMPORTED_BOOK_DATA;
`;

  return output;
}

// Main execution
function main() {
  console.log('\\n=== Book Content Import ===\\n');
  
  const parts = processAllFiles();
  
  console.log(`\\nTotal parts: ${parts.length}`);
  
  let totalChapters = 0;
  for (const part of parts) {
    totalChapters += part.chapters.length;
  }
  console.log(`Total chapters: ${totalChapters}`);
  
  const output = generateOutput(parts);
  
  // Ensure data directory exists
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  
  console.log(`\\nOutput written to: ${OUTPUT_FILE}`);
  console.log(`Output size: ${(output.length / 1024).toFixed(1)} KB`);
  console.log('\\n=== Import Complete ===\\n');
}

main();

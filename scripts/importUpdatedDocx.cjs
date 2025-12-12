/**
 * Updated DOCX Content Import Script
 * Imports corrected content from the new DOCX files
 * - Detects chapters from "Chapitre X" followed by title patterns
 * - Removes emojis
 * - Removes "Chapitre X" numbering from titles
 * - Applies semantic HTML classes
 * 
 * Run with: node scripts/importUpdatedDocx.cjs
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const SOURCE_DIR = '/Users/gregld/Downloads/pages sante';
const OUTPUT_FILE = path.join(__dirname, '../data/updatedChapters.ts');

// Files to process and their target parts
const FILES_CONFIG = [
  { file: 'livre_phase1_complete.docx', partId: 'p1', partTitle: 'Fondations' },
  { file: 'livre_phase2_complete_2.docx', partId: 'p2', partTitle: 'Partie I : Le Jeûne & le Corps' },
  { file: 'livre_phase3_1.docx', partId: 'p3a', partTitle: 'Partie II : Nutrition & Pathologies (1)' },
  { file: 'livre_phase3_2.docx', partId: 'p3b', partTitle: 'Partie II : Nutrition & Pathologies (2)' },
  { file: 'livre_phase4_1.docx', partId: 'p4a', partTitle: 'Partie III : Alimentation Moderne & Stress (1)' },
  { file: 'livre_phase4_2.docx', partId: 'p4b', partTitle: 'Partie III : Alimentation Moderne & Stress (2)' },
  { file: 'livre_phase5.docx', partId: 'p5', partTitle: 'Partie IV : Inflammation' },
  { file: 'livre_phase6.docx', partId: 'p6', partTitle: 'Partie V : Migraines & Café' },
  { file: 'livre_phase7.docx', partId: 'p7', partTitle: 'Partie VI : Coups de Pouce & Hijama' },
  { file: 'livre_phase9.docx', partId: 'p9', partTitle: 'Partie VIII : Remèdes & Aliments' },
];

// Emoji regex pattern
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F18E}]|[\u{3030}]|[\u{00A9}\u{00AE}]|[\u{2122}\u{2139}]|[\u{231A}\u{231B}]|[\u{25AA}\u{25AB}\u{25B6}\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}\u{26AB}]|[\u{26BD}\u{26BE}]|[\u{26C4}\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}\u{2B1C}]|[\u{2B55}]|[\u{3297}]|[\u{3299}]|💧|⚖️|✨|🌿|☕|🍵|🧘|🔥|⚠️|💪|🩺|🧬|🫀|🧠|🦴|🩸|💊|🌱|🍃|🌾|🥗|🥤|🍯|🫒|🥜|🌰|🫚|🧄|🧅|🥕|🥒|🥬|🍋|🍊|🍎|🥑|🫐|🍇|🌶️|🧂|⏰|📝|✅|❌|⭐|🔹|🔸|▪️|▫️|•/gu;

// Chapter patterns in French
const CHAPTER_PATTERNS = [
  /Chapitre\s+(Premier|Deuxième|Troisième|Quatrième|Cinquième|Sixième|Septième|Huitième|Neuvième|Dixième)/i,
  /Chapitre\s+(Onzième|Douzième|Treizième|Quatorzième|Quinzième|Seizième|Dix-septième|Dix-huitième|Dix-neuvième|Vingtième)/i,
  /Chapitre\s+(Vingt-et-unième|Vingt-deuxième|Vingt-troisième|Vingt-quatrième|Vingt-cinquième)/i,
  /Chapitre\s+(Un|Deux|Trois|Quatre|Cinq|Six|Sept|Huit|Neuf|Dix)/i,
  /Chapitre\s+(Onze|Douze|Treize|Quatorze|Quinze|Seize|Dix-sept|Dix-huit|Dix-neuf|Vingt)/i,
  /Chapitre\s+(Vingt-et-un|Vingt-deux|Vingt-trois|Vingt-quatre|Vingt-cinq|Vingt-six|Vingt-sept|Vingt-huit|Vingt-neuf|Trente)/i,
  /Chapitre\s+(Trente-et-un|Trente-deux|Trente-trois|Trente-quatre|Trente-cinq|Trente-six|Trente-sept|Trente-huit|Trente-neuf|Quarante)/i,
  /Chapitre\s+(Quarante-et-un|Quarante-deux|Quarante-trois|Quarante-quatre|Quarante-cinq|Quarante-six|Quarante-sept|Quarante-huit|Quarante-neuf|Cinquante)/i,
  /Chapitre\s+(Cinquante-et-un|Cinquante-deux|Cinquante-trois|Cinquante-quatre|Cinquante-cinq|Cinquante-six|Cinquante-sept|Cinquante-huit|Cinquante-neuf|Soixante)/i,
  /CHAPITRE\s+([A-ZÉÈÊËÀÂÄÙÛÜ-]+)/i,
  /CHAPITRE\s+(\d+)/i,
];

/**
 * Remove emojis from text
 */
function removeEmojis(text) {
  return text.replace(EMOJI_REGEX, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Check if text is a chapter marker
 * Must be a standalone paragraph that STARTS with "Chapitre" (case insensitive)
 * and is relatively short (not a sentence that mentions "chapitre")
 */
function isChapterMarker(text) {
  const cleaned = text.replace(/<[^>]+>/g, '').trim();
  // Must start with "Chapitre" and be relatively short (title-like)
  if (!cleaned.match(/^Chapitre\s/i)) return false;
  if (cleaned.length > 80) return false; // Too long to be a chapter title marker
  return CHAPTER_PATTERNS.some(pattern => pattern.test(cleaned));
}

/**
 * Extract chapter title from chapter marker and following paragraph
 */
function extractChapterTitle(paragraphs, startIndex) {
  // The chapter title is usually the paragraph right after "Chapitre X"
  if (startIndex + 1 < paragraphs.length) {
    const nextPara = paragraphs[startIndex + 1].replace(/<[^>]+>/g, '').trim();
    // Check if it looks like a title (not too long, not a separator)
    if (nextPara.length > 2 && nextPara.length < 200 && !nextPara.match(/^[─—\-\s◆✦•]+$/)) {
      return removeEmojis(nextPara);
    }
  }
  return null;
}

/**
 * Process HTML content - add semantic classes
 */
function processContent(html) {
  let processed = removeEmojis(html);
  
  // Convert strong titles to proper headings
  processed = processed.replace(/<p><strong>([^<]+)<\/strong><\/p>/gi, (match, content) => {
    const text = content.trim();
    // Part headers
    if (text.match(/^PARTIE\s+[IVX]+/i) || text.match(/^FONDATIONS$/i)) {
      return `<h1 class="part-title">${text}</h1>`;
    }
    // Section headers
    if (text.length < 100) {
      return `<h2 class="subtitle">${text}</h2>`;
    }
    return `<p class="paragraph"><strong>${text}</strong></p>`;
  });
  
  // Add classes to remaining elements
  processed = processed.replace(/<p>(?!class=)/gi, '<p class="paragraph">');
  processed = processed.replace(/<ul>/gi, '<ul class="styled-list">');
  processed = processed.replace(/<ol>/gi, '<ol class="numbered-list">');
  processed = processed.replace(/<blockquote>/gi, '<blockquote class="citation-box">');
  
  // Clean up separators - make them proper separator divs
  processed = processed.replace(/<p class="paragraph">\s*[─—\-\s]*[◆✦]+[─—\-\s]*\s*<\/p>/gi, 
    '<div class="separator">───── ◆ ─────</div>');
  
  // Clean up empty paragraphs
  processed = processed.replace(/<p[^>]*>\s*<\/p>/gi, '');
  
  // Clean up TOC-like entries (number at end)
  processed = processed.replace(/<p class="paragraph">([^<]+)\t+\d+<\/p>/gi, '');
  
  return processed.trim();
}

/**
 * Extract chapters from HTML
 */
function extractChapters(html, sourceFile) {
  const chapters = [];
  
  // Split into paragraphs
  const paragraphs = html.split(/<\/p>/i).map(p => p + '</p>');
  
  let currentChapter = null;
  let currentContent = [];
  let skipUntilChapter = true; // Skip cover/TOC content
  
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const text = para.replace(/<[^>]+>/g, '').trim();
    
    // Check if this is a chapter marker
    if (isChapterMarker(text)) {
      // Save previous chapter if exists
      if (currentChapter && currentContent.length > 0) {
        const content = processContent(currentContent.join(''));
        if (content.length > 100) {
          chapters.push({
            ...currentChapter,
            content: `<div class="chapter">\n<h1 class="chapter-title">${currentChapter.title}</h1>\n<div class="separator">───── ◆ ─────</div>\n${content}\n</div>`
          });
        }
      }
      
      // Start new chapter
      const title = extractChapterTitle(paragraphs, i);
      if (title) {
        const baseId = sourceFile.replace('.docx', '').replace(/_/g, '-').toLowerCase();
        currentChapter = {
          id: `${baseId}-ch${chapters.length}`,
          title: title
        };
        currentContent = [];
        skipUntilChapter = false;
        i++; // Skip the title paragraph
        continue;
      }
    }
    
    // Skip content before first chapter (cover, TOC, etc.)
    if (skipUntilChapter) continue;
    
    // Add to current chapter content
    if (currentChapter && para.trim()) {
      currentContent.push(para);
    }
  }
  
  // Save last chapter
  if (currentChapter && currentContent.length > 0) {
    const content = processContent(currentContent.join(''));
    if (content.length > 100) {
      chapters.push({
        ...currentChapter,
        content: `<div class="chapter">\n<h1 class="chapter-title">${currentChapter.title}</h1>\n<div class="separator">───── ◆ ─────</div>\n${content}\n</div>`
      });
    }
  }
  
  // If no chapters found (no "Chapitre X" markers), treat as single chapter
  if (chapters.length === 0) {
    // Try to find a title from strong text
    const strongMatch = html.match(/<p><strong>([^<]{5,100})<\/strong><\/p>/i);
    let title = strongMatch ? removeEmojis(strongMatch[1]) : sourceFile.replace('.docx', '').replace(/_/g, ' ');
    
    // Skip PARTIE headers as titles
    if (title.match(/^PARTIE\s+/i)) {
      const nextStrong = html.match(/<p><strong>PARTIE[^<]+<\/strong><\/p>\s*<p><strong>([^<]{5,100})<\/strong><\/p>/i);
      if (nextStrong) title = removeEmojis(nextStrong[1]);
    }
    
    const content = processContent(html);
    const baseId = sourceFile.replace('.docx', '').replace(/_/g, '-').toLowerCase();
    
    chapters.push({
      id: `${baseId}-ch0`,
      title: title,
      content: `<div class="chapter">\n<h1 class="chapter-title">${title}</h1>\n<div class="separator">───── ◆ ─────</div>\n${content}\n</div>`
    });
  }
  
  return chapters;
}

/**
 * Process a single DOCX file
 */
async function processDocxFile(filePath, config) {
  console.log(`\nProcessing: ${config.file}`);
  
  try {
    const result = await mammoth.convertToHtml({ path: filePath });
    
    const chapters = extractChapters(result.value, config.file);
    
    console.log(`  Found ${chapters.length} chapter(s):`);
    chapters.forEach((ch, i) => {
      const wordCount = ch.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
      console.log(`    ${i + 1}. "${ch.title.substring(0, 50)}${ch.title.length > 50 ? '...' : ''}" (~${wordCount} words)`);
    });
    
    return {
      partId: config.partId,
      partTitle: config.partTitle,
      chapters: chapters
    };
    
  } catch (error) {
    console.error(`  ERROR: ${error.message}`);
    return null;
  }
}

/**
 * Main import function
 */
async function importAllDocx() {
  console.log('\n=== Updated DOCX Content Import ===');
  console.log(`Source: ${SOURCE_DIR}`);
  
  const allParts = [];
  
  for (const config of FILES_CONFIG) {
    const filePath = path.join(SOURCE_DIR, config.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`\nSkipping ${config.file} - file not found`);
      continue;
    }
    
    const partData = await processDocxFile(filePath, config);
    if (partData && partData.chapters.length > 0) {
      allParts.push(partData);
    }
  }
  
  // Generate TypeScript output
  generateOutput(allParts);
  
  console.log('\n=== Import Complete ===\n');
}

/**
 * Generate the TypeScript output file
 */
function generateOutput(parts) {
  const totalChapters = parts.reduce((sum, p) => sum + p.chapters.length, 0);
  const totalWords = parts.reduce((sum, p) => {
    return sum + p.chapters.reduce((csum, ch) => {
      const text = ch.content.replace(/<[^>]+>/g, ' ');
      return csum + text.split(/\s+/).filter(w => w.length > 0).length;
    }, 0);
  }, 0);
  
  let output = `// ============================================
// UPDATED BOOK CONTENT
// Auto-generated from corrected DOCX files
// Generated: ${new Date().toISOString()}
// Total: ${totalChapters} chapters, ~${totalWords} words
// ============================================

import { BookPart, BookSection, SectionStatus } from '../types';

// Helper to create a chapter
function createChapter(id: string, title: string, content: string): BookSection {
  return {
    id,
    title,
    content,
    status: SectionStatus.DRAFT,
    history: [],
  };
}

`;

  // Generate chapters data
  output += '// All updated chapters\n';
  output += 'const UPDATED_CHAPTERS: Record<string, { title: string; content: string }> = {\n';
  
  for (const part of parts) {
    for (const chapter of part.chapters) {
      const escapedContent = chapter.content
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');
      
      output += `  '${chapter.id}': {\n`;
      output += `    title: "${chapter.title.replace(/"/g, '\\"')}",\n`;
      output += `    content: \`${escapedContent}\`,\n`;
      output += `  },\n`;
    }
  }
  
  output += '};\n\n';
  
  // Generate parts structure
  output += '// Updated parts structure\n';
  output += 'export const UPDATED_PARTS: BookPart[] = [\n';
  
  // Group parts that should be merged (p3a+p3b -> p3, p4a+p4b -> p4)
  const mergedParts = {};
  
  for (const part of parts) {
    const basePartId = part.partId.replace(/[ab]$/, '');
    
    if (!mergedParts[basePartId]) {
      mergedParts[basePartId] = {
        id: basePartId,
        title: part.partTitle.replace(/\s*\(\d\)\s*$/, ''),
        chapters: []
      };
    }
    
    mergedParts[basePartId].chapters.push(...part.chapters);
  }
  
  for (const partId of Object.keys(mergedParts).sort()) {
    const part = mergedParts[partId];
    output += `  {\n`;
    output += `    id: '${part.id}',\n`;
    output += `    title: "${part.title.replace(/"/g, '\\"')}",\n`;
    output += `    chapters: [\n`;
    
    for (const chapter of part.chapters) {
      output += `      createChapter('${chapter.id}', UPDATED_CHAPTERS['${chapter.id}'].title, UPDATED_CHAPTERS['${chapter.id}'].content),\n`;
    }
    
    output += `    ],\n`;
    output += `  },\n`;
  }
  
  output += '];\n\n';
  output += 'export default UPDATED_PARTS;\n';
  
  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`\nOutput written to: ${OUTPUT_FILE}`);
  console.log(`Output size: ${(output.length / 1024).toFixed(1)} KB`);
  console.log(`Total parts: ${Object.keys(mergedParts).length}`);
  console.log(`Total chapters: ${totalChapters}`);
  console.log(`Total words: ~${totalWords}`);
}

// Run the import
importAllDocx();

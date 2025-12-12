/**
 * DOCX Content Import Script
 * Extracts chapter content from the remaining chapters DOCX file
 * Run with: node scripts/importDocx.cjs
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const DOCX_FILE = '/Users/gregld/Documents/Sante editor/remaining chapters.docx';
const OUTPUT_FILE = path.join(__dirname, '../data/remainingChapters.ts');

// Part mapping for phases 11-18 (estimate based on book structure)
const PART_TITLES = {
  'Phase 11': { partId: 'p11', partTitle: 'Partie X : Compléments & Vitamines' },
  'Phase 12': { partId: 'p12', partTitle: 'Partie XI : Hormones & Équilibre' },
  'Phase 13': { partId: 'p13', partTitle: 'Partie XII : Sommeil & Récupération' },
  'Phase 14': { partId: 'p14', partTitle: 'Partie XIII : Immunité' },
  'Phase 15': { partId: 'p15', partTitle: 'Partie XIV : Détox Avancée' },
  'Phase 16': { partId: 'p16', partTitle: 'Partie XV : Alimentation Spirituelle' },
  'Phase 17': { partId: 'p17', partTitle: 'Partie XVI : Recettes & Pratiques' },
  'Phase 18': { partId: 'p18', partTitle: 'Partie XVII : Conclusion & Ressources' },
};

async function extractDocxContent() {
  console.log('\n=== DOCX Content Import ===\n');
  
  if (!fs.existsSync(DOCX_FILE)) {
    console.error(`DOCX file not found: ${DOCX_FILE}`);
    process.exit(1);
  }

  try {
    // Convert DOCX to HTML
    console.log('Converting DOCX to HTML...');
    const result = await mammoth.convertToHtml({ path: DOCX_FILE });
    const html = result.value;
    
    // Log any warnings
    if (result.messages.length > 0) {
      console.log('Conversion warnings:', result.messages);
    }
    
    console.log(`HTML content length: ${html.length} characters`);
    
    // Save raw HTML for inspection
    const rawHtmlPath = path.join(__dirname, '../data/remainingChapters_raw.html');
    fs.writeFileSync(rawHtmlPath, html);
    console.log(`Raw HTML saved to: ${rawHtmlPath}`);
    
    // Try to identify chapter structure
    // Look for h1, h2 tags or specific patterns
    const chapters = extractChapters(html);
    
    console.log(`\nFound ${chapters.length} chapters`);
    chapters.forEach((ch, i) => {
      console.log(`  ${i + 1}. ${ch.title} (${ch.content.length} chars)`);
    });
    
    // Generate TypeScript file
    generateTsFile(chapters);
    
    console.log('\n=== Import Complete ===\n');
    
  } catch (error) {
    console.error('Error processing DOCX:', error);
    process.exit(1);
  }
}

function extractChapters(html) {
  const chapters = [];
  
  // Split by h1 or h2 headings (common chapter markers)
  // First, let's see what headings exist
  const h1Matches = html.match(/<h1[^>]*>(.*?)<\/h1>/gi) || [];
  const h2Matches = html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  
  console.log(`Found ${h1Matches.length} h1 tags, ${h2Matches.length} h2 tags`);
  
  // Try splitting by h1 first
  if (h1Matches.length > 0) {
    const parts = html.split(/<h1[^>]*>/i);
    
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const titleMatch = part.match(/^(.*?)<\/h1>/i);
      if (titleMatch) {
        const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        const content = '<h1 class="chapter-title">' + part;
        
        if (title && content.length > 100) {
          chapters.push({
            id: `remaining-ch${i - 1}`,
            title: title,
            content: cleanupContent(content)
          });
        }
      }
    }
  }
  
  // If no h1 chapters found, try h2
  if (chapters.length === 0 && h2Matches.length > 0) {
    const parts = html.split(/<h2[^>]*>/i);
    
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const titleMatch = part.match(/^(.*?)<\/h2>/i);
      if (titleMatch) {
        const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        const content = '<h2 class="chapter-title">' + part;
        
        if (title && content.length > 100) {
          chapters.push({
            id: `remaining-ch${i - 1}`,
            title: title,
            content: cleanupContent(content)
          });
        }
      }
    }
  }
  
  // If still no chapters, treat the whole document as one
  if (chapters.length === 0) {
    chapters.push({
      id: 'remaining-ch0',
      title: 'Chapitres Restants',
      content: cleanupContent(html)
    });
  }
  
  return chapters;
}

function cleanupContent(html) {
  return html
    // Add semantic classes
    .replace(/<h1>/gi, '<h1 class="chapter-title">')
    .replace(/<h2>/gi, '<h2 class="subtitle">')
    .replace(/<h3>/gi, '<h3 class="sub-subtitle">')
    .replace(/<p>/gi, '<p class="paragraph">')
    .replace(/<ul>/gi, '<ul class="styled-list">')
    .replace(/<ol>/gi, '<ol class="numbered-list">')
    .replace(/<blockquote>/gi, '<blockquote class="citation-box">')
    // Clean up empty paragraphs
    .replace(/<p[^>]*>\s*<\/p>/gi, '')
    // Trim
    .trim();
}

function generateTsFile(chapters) {
  const wordCount = chapters.reduce((sum, ch) => {
    const text = ch.content.replace(/<[^>]+>/g, ' ');
    return sum + text.split(/\s+/).filter(w => w.length > 0).length;
  }, 0);
  
  let output = `// ============================================
// REMAINING CHAPTERS DATA (Phases 11-18)
// Auto-generated from DOCX source file
// Generated: ${new Date().toISOString()}
// Total: ${chapters.length} chapters, ~${wordCount} words
// ============================================

import { BookSection, SectionStatus } from '../types';

export const REMAINING_CHAPTERS: BookSection[] = [
`;

  chapters.forEach((ch, index) => {
    const escapedContent = ch.content
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${');
    
    output += `  {
    id: '${ch.id}',
    title: "${ch.title.replace(/"/g, '\\"')}",
    status: SectionStatus.DRAFT,
    history: [],
    content: \`${escapedContent}\`,
  },
`;
  });

  output += `];

export default REMAINING_CHAPTERS;
`;

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`\nOutput written to: ${OUTPUT_FILE}`);
  console.log(`Output size: ${(output.length / 1024).toFixed(1)} KB`);
}

// Run the extraction
extractDocxContent();

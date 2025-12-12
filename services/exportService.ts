import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { BookStructure } from '../types';

// ============================================
// HTML EXPORT
// ============================================

const getHTMLTemplate = (title: string, content: string): string => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Lora', Georgia, serif;
      font-size: 12pt;
      line-height: 1.8;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fff;
    }
    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 28pt;
      color: #2D4A3E;
      text-align: center;
      margin: 40px 0 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #C9A962;
    }
    h2 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18pt;
      color: #2D4A3E;
      margin: 30px 0 15px;
    }
    h3 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 14pt;
      color: #2D4A3E;
      margin: 25px 0 10px;
    }
    p {
      margin-bottom: 15px;
      text-align: justify;
    }
    blockquote {
      margin: 20px 30px;
      padding: 15px 20px;
      border-left: 4px solid #C9A962;
      background: #f9f7f4;
      font-style: italic;
    }
    .chapter {
      page-break-before: always;
      margin-top: 60px;
    }
    .chapter:first-child {
      page-break-before: avoid;
      margin-top: 0;
    }
    .chapter-title {
      font-family: 'Playfair Display', serif;
      font-size: 22pt;
      color: #2D4A3E;
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 1px solid #ddd;
    }
    .hadith-box, .verse-box {
      margin: 20px 0;
      padding: 15px;
      background: #f5f5f0;
      border-left: 4px solid #2D4A3E;
    }
    .info-box, .tip-box {
      margin: 20px 0;
      padding: 15px;
      background: #e8f4e8;
      border-left: 4px solid #4a7c4a;
    }
    .warning-box {
      margin: 20px 0;
      padding: 15px;
      background: #fff3e0;
      border-left: 4px solid #e65100;
    }
    .recipe-card {
      margin: 20px 0;
      padding: 20px;
      border: 1px solid #ddd;
      background: #fafafa;
    }
    ul, ol {
      margin: 15px 0 15px 30px;
    }
    li {
      margin-bottom: 8px;
    }
    .cover {
      text-align: center;
      padding: 100px 20px;
      page-break-after: always;
    }
    .cover-title {
      font-family: 'Playfair Display', serif;
      font-size: 36pt;
      color: #2D4A3E;
      margin-bottom: 30px;
    }
    .cover-author {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18pt;
      color: #666;
      font-style: italic;
    }
    .toc {
      page-break-after: always;
      padding: 40px 0;
    }
    .toc-title {
      font-family: 'Playfair Display', serif;
      font-size: 24pt;
      color: #2D4A3E;
      text-align: center;
      margin-bottom: 40px;
    }
    .toc-item {
      padding: 8px 0;
      border-bottom: 1px dotted #ccc;
    }
    @media print {
      body { padding: 0; }
      .chapter { page-break-before: always; }
    }
  </style>
</head>
<body>
${content}
</body>
</html>
`;

export const exportToHTML = (structure: BookStructure, title: string, author: string): void => {
  let content = `
    <div class="cover">
      <div class="cover-title">${title}</div>
      <div class="cover-author">${author}</div>
    </div>
    <div class="toc">
      <div class="toc-title">Table des Matieres</div>
  `;
  
  // TOC
  for (const part of structure.parts) {
    content += `<div style="font-weight: bold; margin-top: 15px;">${part.title}</div>`;
    for (const chapter of part.chapters) {
      content += `<div class="toc-item">${chapter.title}</div>`;
    }
  }
  content += '</div>';
  
  // Chapters
  for (const part of structure.parts) {
    for (const chapter of part.chapters) {
      content += `
        <div class="chapter">
          <div class="chapter-title">${chapter.title}</div>
          <div class="chapter-content">${chapter.content}</div>
        </div>
      `;
    }
  }
  
  const html = getHTMLTemplate(title, content);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  saveAs(blob, `${title.replace(/[^a-zA-Z0-9]/g, '_')}.html`);
};

// ============================================
// DOCX EXPORT
// ============================================

const stripHtml = (html: string): string => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// Process inline formatting within a paragraph
const processInlineContent = (el: HTMLElement): TextRun[] => {
  const runs: TextRun[] = [];
  
  const processInlineNode = (node: Node, isBold = false, isItalic = false, isUnderline = false): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) {
        runs.push(new TextRun({
          text,
          bold: isBold,
          italics: isItalic,
          underline: isUnderline ? {} : undefined
        }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childEl = node as HTMLElement;
      const tag = childEl.tagName.toLowerCase();
      
      // Determine formatting based on tag
      const newBold = isBold || tag === 'strong' || tag === 'b';
      const newItalic = isItalic || tag === 'em' || tag === 'i';
      const newUnderline = isUnderline || tag === 'u';
      
      // Process children with accumulated formatting
      childEl.childNodes.forEach(child => {
        processInlineNode(child, newBold, newItalic, newUnderline);
      });
    }
  };
  
  el.childNodes.forEach(child => processInlineNode(child));
  
  return runs;
};

const htmlToDocxParagraphs = (html: string): Paragraph[] => {
  const paragraphs: Paragraph[] = [];
  const container = document.createElement('div');
  container.innerHTML = html;
  
  const processElement = (el: Element): void => {
    const tagName = el.tagName.toLowerCase();
    const className = el.className || '';
    const text = (el.textContent || '').trim();
    
    // Skip empty elements and decorative separators
    if (!text && !['br', 'hr'].includes(tagName)) return;
    if (className.includes('separator')) return;
    
    switch (tagName) {
      case 'h1':
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text, bold: true, size: 32 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }));
        break;
        
      case 'h2':
        // Detect misused h2 tags: long text without subtitle class = paragraph
        const isRealH2 = className.includes('subtitle') || className.includes('title') || 
                         (text.length < 150 && !text.includes('. '));
        if (isRealH2) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text, bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 }
          }));
        } else {
          // Render as regular paragraph
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text })],
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED
          }));
        }
        break;
        
      case 'h3':
        // Same heuristic for h3
        const isRealH3 = className.includes('subtitle') || className.includes('title') || 
                         (text.length < 150 && !text.includes('. '));
        if (isRealH3) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text, bold: true, size: 24 })],
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 }
          }));
        } else {
          // Render as regular paragraph
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text })],
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED
          }));
        }
        break;
        
      case 'p':
        const runs = processInlineContent(el as HTMLElement);
        if (runs.length > 0) {
          // Check for special styling classes
          const isQuote = className.includes('hadith') || className.includes('verse');
          const isInfo = className.includes('info') || className.includes('tip');
          const isWarning = className.includes('warning');
          
          paragraphs.push(new Paragraph({
            children: runs,
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED,
            indent: (isQuote || isInfo || isWarning) ? { left: 400 } : undefined,
            border: isQuote ? {
              left: { style: BorderStyle.SINGLE, size: 12, color: 'C9A962' }
            } : undefined
          }));
        }
        break;
        
      case 'ul':
        el.querySelectorAll(':scope > li').forEach(li => {
          const liText = (li.textContent || '').trim();
          if (liText) {
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: '• ' + liText })],
              spacing: { after: 100 },
              indent: { left: 720 }
            }));
          }
        });
        break;
        
      case 'ol':
        el.querySelectorAll(':scope > li').forEach((li, index) => {
          const liText = (li.textContent || '').trim();
          if (liText) {
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: `${index + 1}. ${liText}` })],
              spacing: { after: 100 },
              indent: { left: 720 }
            }));
          }
        });
        break;
        
      case 'blockquote':
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text, italics: true })],
          spacing: { before: 200, after: 200 },
          indent: { left: 720, right: 720 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 12, color: 'C9A962' }
          }
        }));
        break;
        
      case 'div':
      case 'section':
      case 'article':
        // For container elements, process children directly
        Array.from(el.children).forEach(child => processElement(child));
        break;
        
      case 'span':
        // Skip spans, their content is handled by parent
        break;
        
      default:
        // For any other block element with text, treat as paragraph
        if (text && !['script', 'style', 'br', 'hr', 'li'].includes(tagName)) {
          // Check if it has block-level children
          const hasBlockChildren = el.querySelector('p, h1, h2, h3, ul, ol, blockquote, div');
          if (hasBlockChildren) {
            Array.from(el.children).forEach(child => processElement(child));
          } else {
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text })],
              spacing: { after: 200 }
            }));
          }
        }
        break;
    }
  };
  
  // Process all top-level children
  Array.from(container.children).forEach(child => processElement(child));
  
  // If no paragraphs found, treat entire content as one paragraph
  if (paragraphs.length === 0) {
    const plainText = container.textContent?.trim();
    if (plainText) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: plainText })],
        spacing: { after: 200 }
      }));
    }
  }
  
  return paragraphs;
};

export const exportToDOCX = async (
  structure: BookStructure,
  title: string,
  author: string,
  onProgress?: (progress: number, message: string) => void
): Promise<void> => {
  onProgress?.(0, 'Creation du document DOCX...');
  
  const children: Paragraph[] = [];
  
  // Cover/Title
  children.push(new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 56 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 2000, after: 400 }
  }));
  
  children.push(new Paragraph({
    children: [new TextRun({ text: author, italics: true, size: 28 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 1000 }
  }));
  
  // Page break after cover
  children.push(new Paragraph({
    children: [],
    pageBreakBefore: true
  }));
  
  // Table of Contents header
  children.push(new Paragraph({
    children: [new TextRun({ text: 'Table des Matieres', bold: true, size: 36 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 }
  }));
  
  // TOC entries
  for (const part of structure.parts) {
    children.push(new Paragraph({
      children: [new TextRun({ text: part.title, bold: true, size: 24 })],
      spacing: { before: 200, after: 100 }
    }));
    
    for (const chapter of part.chapters) {
      children.push(new Paragraph({
        children: [new TextRun({ text: '    ' + chapter.title, size: 22 })],
        spacing: { after: 50 }
      }));
    }
  }
  
  const totalChapters = structure.parts.reduce((sum, p) => sum + p.chapters.length, 0);
  let processedChapters = 0;
  
  // Chapters
  for (const part of structure.parts) {
    for (const chapter of part.chapters) {
      processedChapters++;
      const progress = 10 + (processedChapters / totalChapters) * 85;
      onProgress?.(progress, `Export: ${chapter.title}`);
      
      // Page break before chapter
      children.push(new Paragraph({
        children: [],
        pageBreakBefore: true
      }));
      
      // Chapter title
      children.push(new Paragraph({
        children: [new TextRun({ text: chapter.title, bold: true, size: 36 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999' }
        }
      }));
      
      // Chapter content
      const contentParagraphs = htmlToDocxParagraphs(chapter.content);
      children.push(...contentParagraphs);
    }
  }
  
  onProgress?.(95, 'Finalisation du document...');
  
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: 12240, // 8.5 inches in twentieths of a point
            height: 15840 // 11 inches
          },
          margin: {
            top: 1440, // 1 inch
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children
    }]
  });
  
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
  
  onProgress?.(100, 'Termine!');
};

// ============================================
// JSON BACKUP
// ============================================

export interface BookBackup {
  version: string;
  exportedAt: string;
  bookTitle: string;
  structure: BookStructure;
}

export const exportToJSON = (structure: BookStructure, title: string): void => {
  const backup: BookBackup = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    bookTitle: title,
    structure
  };
  
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const filename = `backup_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
  saveAs(blob, filename);
};

export const importFromJSON = (file: File): Promise<BookBackup> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const backup = JSON.parse(json) as BookBackup;
        
        // Validate structure
        if (!backup.structure || !backup.structure.parts) {
          throw new Error('Invalid backup file structure');
        }
        
        resolve(backup);
      } catch (err) {
        reject(new Error('Failed to parse backup file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// ============================================
// AUTO-BACKUP TO LOCAL STORAGE
// ============================================

const BACKUP_KEY = 'book_auto_backup';
const BACKUP_HISTORY_KEY = 'book_backup_history';
const MAX_BACKUPS = 10;

export const autoBackupToLocalStorage = (structure: BookStructure): void => {
  try {
    const backup: BookBackup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      bookTitle: 'La Sante dans l\'Assiette',
      structure
    };
    
    // Save current backup
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    
    // Add to history
    const historyJson = localStorage.getItem(BACKUP_HISTORY_KEY);
    let history: BookBackup[] = historyJson ? JSON.parse(historyJson) : [];
    
    // Add new backup at the beginning
    history.unshift(backup);
    
    // Keep only last N backups
    if (history.length > MAX_BACKUPS) {
      history = history.slice(0, MAX_BACKUPS);
    }
    
    localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history));
    
    console.log('Auto-backup saved:', backup.exportedAt);
  } catch (e) {
    console.error('Auto-backup failed:', e);
  }
};

export const getAutoBackup = (): BookBackup | null => {
  try {
    const json = localStorage.getItem(BACKUP_KEY);
    if (json) {
      return JSON.parse(json) as BookBackup;
    }
  } catch (e) {
    console.error('Failed to load auto-backup:', e);
  }
  return null;
};

export const getBackupHistory = (): BookBackup[] => {
  try {
    const json = localStorage.getItem(BACKUP_HISTORY_KEY);
    if (json) {
      return JSON.parse(json) as BookBackup[];
    }
  } catch (e) {
    console.error('Failed to load backup history:', e);
  }
  return [];
};

export const clearBackupHistory = (): void => {
  localStorage.removeItem(BACKUP_KEY);
  localStorage.removeItem(BACKUP_HISTORY_KEY);
};

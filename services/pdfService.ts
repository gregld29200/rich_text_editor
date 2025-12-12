import jsPDF from 'jspdf';
import { BookStructure } from '../types';

// Kindle 6x9 inch format in points (72 points per inch)
const PAGE_WIDTH_PT = 6 * 72; // 432 points
const PAGE_HEIGHT_PT = 9 * 72; // 648 points
const MARGIN_LEFT = 54; // 0.75 inch
const MARGIN_RIGHT = 54;
const MARGIN_TOP = 54;
const MARGIN_BOTTOM = 54;
const CONTENT_WIDTH = PAGE_WIDTH_PT - MARGIN_LEFT - MARGIN_RIGHT;
const USABLE_HEIGHT = PAGE_HEIGHT_PT - MARGIN_TOP - MARGIN_BOTTOM;

// Typography settings
const FONT_BODY = 11;
const FONT_H1 = 18;
const FONT_H2 = 14;
const FONT_H3 = 12;
const LINE_HEIGHT_FACTOR = 1.5;
const PARAGRAPH_SPACING = 8;
const HEADING_SPACING_BEFORE = 16;
const HEADING_SPACING_AFTER = 8;
const LIST_INDENT = 20;
const QUOTE_INDENT = 25;

interface PDFExportOptions {
  bookTitle: string;
  author: string;
  includeTableOfContents: boolean;
}

interface ContentBlock {
  type: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'listitem' | 'quote' | 'separator';
  text: string;
  className?: string;
}

// Normalize text for PDF rendering - replace problematic characters
const normalizeTextForPDF = (text: string): string => {
  return text
    // Replace French quotes with regular quotes
    .replace(/«\s*/g, '"')
    .replace(/\s*»/g, '"')
    // Replace other special quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Replace en-dash and em-dash
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    // Replace ellipsis
    .replace(/…/g, '...')
    // Normalize spaces (replace non-breaking spaces and multiple spaces)
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    // Trim
    .trim();
};

// Parse HTML content into structured blocks
const parseHtmlToBlocks = (html: string): ContentBlock[] => {
  const blocks: ContentBlock[] = [];
  const container = document.createElement('div');
  container.innerHTML = html;
  
  const processElement = (el: Element): void => {
    const tagName = el.tagName.toLowerCase();
    const className = el.className || '';
    const rawText = (el.textContent || '').trim();
    const text = normalizeTextForPDF(rawText);
    
    // Skip empty elements and decorative separators
    if (!text && tagName !== 'br' && tagName !== 'hr') return;
    if (className.includes('separator')) {
      blocks.push({ type: 'separator', text: '' });
      return;
    }
    
    switch (tagName) {
      case 'h1':
        blocks.push({ type: 'heading1', text, className });
        break;
      case 'h2':
        // Detect misused h2 tags: long text without subtitle class = paragraph
        // Real headings are short (<150 chars) or have 'subtitle' class
        const isRealH2 = className.includes('subtitle') || className.includes('title') || 
                         (text.length < 150 && !text.includes('. '));
        blocks.push({ type: isRealH2 ? 'heading2' : 'paragraph', text, className });
        break;
      case 'h3':
        // Same heuristic for h3
        const isRealH3 = className.includes('subtitle') || className.includes('title') || 
                         (text.length < 150 && !text.includes('. '));
        blocks.push({ type: isRealH3 ? 'heading3' : 'paragraph', text, className });
        break;
      case 'p':
        if (text) {
          blocks.push({ type: 'paragraph', text, className });
        }
        break;
      case 'li':
        if (text) {
          blocks.push({ type: 'listitem', text, className });
        }
        break;
      case 'blockquote':
        if (text) {
          blocks.push({ type: 'quote', text, className });
        }
        break;
      case 'ul':
      case 'ol':
        // Process list items directly
        el.querySelectorAll(':scope > li').forEach(li => {
          const liText = (li.textContent || '').trim();
          if (liText) {
            blocks.push({ type: 'listitem', text: liText, className });
          }
        });
        break;
      case 'div':
      case 'section':
      case 'article':
      case 'span':
        // For container elements, process children
        Array.from(el.children).forEach(child => processElement(child));
        break;
      default:
        // For any other element with text, treat as paragraph
        if (text && !['script', 'style', 'br', 'hr'].includes(tagName)) {
          // Check if it has block-level children
          const hasBlockChildren = el.querySelector('p, h1, h2, h3, ul, ol, blockquote, div');
          if (hasBlockChildren) {
            Array.from(el.children).forEach(child => processElement(child));
          } else {
            blocks.push({ type: 'paragraph', text, className });
          }
        }
        break;
    }
  };
  
  // Process all top-level children
  Array.from(container.children).forEach(child => processElement(child));
  
  // If no blocks found, treat entire content as one paragraph
  if (blocks.length === 0) {
    const plainText = container.textContent?.trim();
    if (plainText) {
      blocks.push({ type: 'paragraph', text: plainText });
    }
  }
  
  return blocks;
};

// Calculate line height for a given font size
const getLineHeight = (fontSize: number): number => {
  return fontSize * LINE_HEIGHT_FACTOR;
};

// Draw page header
const drawHeader = (pdf: jsPDF, text: string, pageNum: number): void => {
  if (pageNum <= 2) return; // No header on cover or TOC first page
  
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.setFont('helvetica', 'normal');
  
  const truncated = normalizeTextForPDF(text.length > 50 ? text.substring(0, 47) + '...' : text);
  pdf.text(truncated, MARGIN_LEFT, MARGIN_TOP - 20, { charSpace: 0 });
  
  // Header line
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_LEFT, MARGIN_TOP - 12, PAGE_WIDTH_PT - MARGIN_RIGHT, MARGIN_TOP - 12);
};

// Draw page footer with page number
const drawFooter = (pdf: jsPDF, pageNum: number): void => {
  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 120);
  pdf.setFont('helvetica', 'normal');
  
  const pageStr = pageNum.toString();
  const textWidth = pdf.getTextWidth(pageStr);
  pdf.text(pageStr, (PAGE_WIDTH_PT - textWidth) / 2, PAGE_HEIGHT_PT - MARGIN_BOTTOM + 25, { charSpace: 0 });
};

// Create cover page
const createCoverPage = (pdf: jsPDF, title: string, author: string): void => {
  // Title
  pdf.setFontSize(32);
  pdf.setTextColor(45, 74, 62); // Brand green
  pdf.setFont('helvetica', 'bold');
  
  const normalizedTitle = normalizeTextForPDF(title);
  const titleLines = pdf.splitTextToSize(normalizedTitle, CONTENT_WIDTH - 40);
  const titleY = PAGE_HEIGHT_PT / 3;
  titleLines.forEach((line: string, i: number) => {
    const lineWidth = pdf.getTextWidth(line);
    pdf.text(line, (PAGE_WIDTH_PT - lineWidth) / 2, titleY + (i * 40), { charSpace: 0 });
  });
  
  // Decorative line
  const lineY = titleY + (titleLines.length * 40) + 30;
  pdf.setDrawColor(201, 169, 98); // Brand gold
  pdf.setLineWidth(2);
  pdf.line(PAGE_WIDTH_PT / 2 - 80, lineY, PAGE_WIDTH_PT / 2 + 80, lineY);
  
  // Author
  pdf.setFontSize(18);
  pdf.setTextColor(100, 100, 100);
  pdf.setFont('helvetica', 'italic');
  const normalizedAuthor = normalizeTextForPDF(author);
  const authorWidth = pdf.getTextWidth(normalizedAuthor);
  pdf.text(normalizedAuthor, (PAGE_WIDTH_PT - authorWidth) / 2, lineY + 50, { charSpace: 0 });
};

// Create table of contents
const createTableOfContents = (pdf: jsPDF, structure: BookStructure): number => {
  pdf.addPage();
  let currentPage = 2;
  let yPos = MARGIN_TOP;
  
  // TOC Title
  pdf.setFontSize(24);
  pdf.setTextColor(45, 74, 62);
  pdf.setFont('helvetica', 'bold');
  const tocTitle = 'Table des Matieres';
  const tocTitleWidth = pdf.getTextWidth(tocTitle);
  pdf.text(tocTitle, (PAGE_WIDTH_PT - tocTitleWidth) / 2, yPos + 20, { charSpace: 0 });
  yPos += 60;
  
  // Estimate chapter pages (rough estimate: 1 chapter = 1 page for TOC purposes)
  let estimatedPage = currentPage + 1;
  
  for (const part of structure.parts) {
    // Check for page break
    if (yPos > PAGE_HEIGHT_PT - MARGIN_BOTTOM - 60) {
      drawFooter(pdf, currentPage);
      pdf.addPage();
      currentPage++;
      yPos = MARGIN_TOP;
    }
    
    // Part title
    pdf.setFontSize(13);
    pdf.setTextColor(45, 74, 62);
    pdf.setFont('helvetica', 'bold');
    const normalizedPartTitle = normalizeTextForPDF(part.title);
    pdf.text(normalizedPartTitle, MARGIN_LEFT, yPos, { charSpace: 0 });
    yPos += 22;
    
    // Chapters
    pdf.setFontSize(11);
    pdf.setTextColor(60, 60, 60);
    pdf.setFont('helvetica', 'normal');
    
    for (const chapter of part.chapters) {
      if (yPos > PAGE_HEIGHT_PT - MARGIN_BOTTOM - 30) {
        drawFooter(pdf, currentPage);
        pdf.addPage();
        currentPage++;
        yPos = MARGIN_TOP;
      }
      
      const rawTitle = chapter.title.length > 50 
        ? chapter.title.substring(0, 47) + '...' 
        : chapter.title;
      const chapterTitle = normalizeTextForPDF(rawTitle);
      
      // Title on left
      pdf.text('  ' + chapterTitle, MARGIN_LEFT, yPos, { charSpace: 0 });
      
      // Page number on right
      const pageNumStr = estimatedPage.toString();
      const pageNumWidth = pdf.getTextWidth(pageNumStr);
      pdf.text(pageNumStr, PAGE_WIDTH_PT - MARGIN_RIGHT - pageNumWidth, yPos, { charSpace: 0 });
      
      // Dots between
      const titleWidth = pdf.getTextWidth('  ' + chapterTitle);
      const dotsStart = MARGIN_LEFT + titleWidth + 5;
      const dotsEnd = PAGE_WIDTH_PT - MARGIN_RIGHT - pageNumWidth - 5;
      const dotWidth = pdf.getTextWidth('.');
      const numDots = Math.floor((dotsEnd - dotsStart) / (dotWidth * 1.5));
      if (numDots > 3) {
        pdf.setTextColor(180, 180, 180);
        pdf.text('.'.repeat(numDots), dotsStart, yPos, { charSpace: 0 });
        pdf.setTextColor(60, 60, 60);
      }
      
      yPos += 18;
      estimatedPage++;
    }
    
    yPos += 8; // Space after part
  }
  
  drawFooter(pdf, currentPage);
  return currentPage;
};

// Render a single chapter
const renderChapter = (
  pdf: jsPDF,
  chapter: { title: string; content: string },
  startPage: number
): number => {
  let currentPage = startPage;
  let yPos = MARGIN_TOP;
  const maxY = PAGE_HEIGHT_PT - MARGIN_BOTTOM - 20;
  
  // Helper to check and handle page breaks
  const checkPageBreak = (neededSpace: number): void => {
    if (yPos + neededSpace > maxY) {
      drawFooter(pdf, currentPage);
      pdf.addPage();
      currentPage++;
      drawHeader(pdf, chapter.title, currentPage);
      yPos = MARGIN_TOP;
    }
  };
  
  // Chapter title
  pdf.setFontSize(FONT_H1);
  pdf.setTextColor(45, 74, 62);
  pdf.setFont('helvetica', 'bold');
  
  const normalizedTitle = normalizeTextForPDF(chapter.title);
  const titleLines = pdf.splitTextToSize(normalizedTitle, CONTENT_WIDTH);
  const titleLineHeight = getLineHeight(FONT_H1);
  
  titleLines.forEach((line: string) => {
    checkPageBreak(titleLineHeight);
    const lineWidth = pdf.getTextWidth(line);
    pdf.text(line, (PAGE_WIDTH_PT - lineWidth) / 2, yPos + FONT_H1, { charSpace: 0 });
    yPos += titleLineHeight;
  });
  
  // Decorative line under title
  yPos += 10;
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_LEFT + 60, yPos, PAGE_WIDTH_PT - MARGIN_RIGHT - 60, yPos);
  yPos += 25;
  
  // Parse and render content
  const blocks = parseHtmlToBlocks(chapter.content);
  
  for (const block of blocks) {
    let fontSize = FONT_BODY;
    let isBold = false;
    let isItalic = false;
    let indent = 0;
    let spaceBefore = 0;
    let spaceAfter = PARAGRAPH_SPACING;
    let textColor: [number, number, number] = [51, 51, 51];
    let bulletPrefix = '';
    
    switch (block.type) {
      case 'heading1':
        fontSize = FONT_H1;
        isBold = true;
        spaceBefore = HEADING_SPACING_BEFORE * 1.5;
        spaceAfter = HEADING_SPACING_AFTER;
        textColor = [45, 74, 62];
        break;
      case 'heading2':
        fontSize = FONT_H2;
        isBold = true;
        spaceBefore = HEADING_SPACING_BEFORE;
        spaceAfter = HEADING_SPACING_AFTER;
        textColor = [45, 74, 62];
        break;
      case 'heading3':
        fontSize = FONT_H3;
        isBold = true;
        spaceBefore = HEADING_SPACING_BEFORE * 0.8;
        spaceAfter = HEADING_SPACING_AFTER * 0.8;
        textColor = [45, 74, 62];
        break;
      case 'paragraph':
        indent = 0;
        spaceAfter = PARAGRAPH_SPACING;
        // Check for special box classes
        if (block.className?.includes('hadith') || block.className?.includes('verse')) {
          indent = QUOTE_INDENT;
          isItalic = true;
          textColor = [60, 60, 60];
        } else if (block.className?.includes('info') || block.className?.includes('tip')) {
          indent = 15;
          textColor = [40, 80, 40];
        } else if (block.className?.includes('warning')) {
          indent = 15;
          textColor = [180, 80, 0];
        }
        break;
      case 'listitem':
        indent = LIST_INDENT;
        bulletPrefix = '• ';
        spaceAfter = 4;
        break;
      case 'quote':
        indent = QUOTE_INDENT;
        isItalic = true;
        textColor = [80, 80, 80];
        spaceBefore = 8;
        spaceAfter = 8;
        break;
      case 'separator':
        checkPageBreak(20);
        yPos += 10;
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.5);
        pdf.line(MARGIN_LEFT + 80, yPos, PAGE_WIDTH_PT - MARGIN_RIGHT - 80, yPos);
        yPos += 15;
        continue;
    }
    
    // Apply spacing before
    yPos += spaceBefore;
    
    // Set font
    pdf.setFontSize(fontSize);
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    const fontStyle = isBold ? 'bold' : (isItalic ? 'italic' : 'normal');
    pdf.setFont('helvetica', fontStyle);
    
    // Calculate available width
    const availableWidth = CONTENT_WIDTH - indent;
    
    // Split text to fit width
    const textToRender = normalizeTextForPDF(bulletPrefix + block.text);
    const lines = pdf.splitTextToSize(textToRender, availableWidth);
    const lineHeight = getLineHeight(fontSize);
    
    // Render each line
    for (let i = 0; i < lines.length; i++) {
      checkPageBreak(lineHeight);
      
      let lineText = lines[i];
      let lineIndent = indent;
      
      // Only first line of list item gets bullet
      if (i > 0 && bulletPrefix) {
        lineIndent = indent + pdf.getTextWidth(bulletPrefix);
      }
      
      pdf.text(lineText, MARGIN_LEFT + lineIndent, yPos + fontSize * 0.8, { 
        charSpace: 0,
        align: 'left'
      });
      yPos += lineHeight;
    }
    
    // Apply spacing after
    yPos += spaceAfter;
  }
  
  // Draw footer on last page of chapter
  drawFooter(pdf, currentPage);
  
  return currentPage;
};

// Main export function
export const exportBookToPDF = async (
  structure: BookStructure,
  options: PDFExportOptions,
  onProgress?: (progress: number, message: string) => void
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [PAGE_WIDTH_PT, PAGE_HEIGHT_PT]
  });
  
  // Ensure no extra character spacing
  pdf.setCharSpace(0);
  
  const totalChapters = structure.parts.reduce((sum, p) => sum + p.chapters.length, 0);
  
  if (totalChapters === 0) {
    throw new Error('No chapters to export');
  }
  
  let currentPage = 1;
  let processedChapters = 0;
  
  // Cover page
  onProgress?.(0, 'Creation de la page de couverture...');
  createCoverPage(pdf, options.bookTitle, options.author);
  
  // Table of Contents
  if (options.includeTableOfContents) {
    onProgress?.(5, 'Creation de la table des matieres...');
    currentPage = createTableOfContents(pdf, structure);
  }
  
  // Chapters
  for (const part of structure.parts) {
    for (const chapter of part.chapters) {
      processedChapters++;
      const progress = 10 + (processedChapters / totalChapters) * 85;
      onProgress?.(progress, `Export: ${chapter.title.substring(0, 40)}...`);
      
      // Start new page for chapter
      pdf.addPage();
      currentPage++;
      
      // Render chapter content
      currentPage = renderChapter(pdf, chapter, currentPage);
    }
  }
  
  onProgress?.(98, 'Finalisation du PDF...');
  
  // Save the PDF
  const filename = options.bookTitle
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50) + '.pdf';
  
  pdf.save(filename);
  
  onProgress?.(100, 'Termine!');
};

// Alias for compatibility
export const exportBookToPDFSimple = exportBookToPDF;

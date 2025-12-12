import { BookStructure } from '../types';
import { saveAs } from 'file-saver';

// ============================================
// LATEX DOCUMENT GENERATION SERVICE
// ============================================

interface LatexExportOptions {
  title: string;
  author: string;
}

// Special LaTeX character escaping
const escapeLatex = (text: string): string => {
  return text
    // Backslash must be first (before we add more backslashes)
    .replace(/\\/g, '\\textbackslash{}')
    // Special characters
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    // French quotes
    .replace(/«\s*/g, '\\og{}')
    .replace(/\s*»/g, '\\fg{}')
    // Smart quotes
    .replace(/"/g, "''")
    .replace(/"/g, "''")
    .replace(/"/g, "''")
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    // Dashes
    .replace(/—/g, '---')
    .replace(/–/g, '--')
    // Ellipsis
    .replace(/…/g, '\\ldots{}')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
};

// Check if an h2/h3 is a real heading or misused as paragraph
const isRealHeading = (text: string, className: string): boolean => {
  // Has subtitle/title class = real heading
  if (className.includes('subtitle') || className.includes('title')) {
    return true;
  }
  // Short text without sentences = real heading
  if (text.length < 150 && !text.includes('. ')) {
    return true;
  }
  return false;
};

// Convert HTML content to LaTeX
const htmlToLatex = (html: string): string => {
  const container = document.createElement('div');
  container.innerHTML = html;
  
  let latex = '';
  
  const processElement = (el: Element): string => {
    const tagName = el.tagName.toLowerCase();
    const className = el.className || '';
    const rawText = (el.textContent || '').trim();
    
    // Skip empty elements
    if (!rawText && !['br', 'hr', 'ul', 'ol'].includes(tagName)) {
      return '';
    }
    
    // Skip separators - render as horizontal rule
    if (className.includes('separator')) {
      return '\n\\begin{center}\\rule{2in}{0.4pt}\\end{center}\n\n';
    }
    
    switch (tagName) {
      case 'h1':
        // Skip chapter-title class h1s as we handle chapter title separately
        if (className.includes('chapter-title')) {
          return '';
        }
        return `\\section*{${escapeLatex(rawText)}}\n\n`;
        
      case 'h2':
        if (isRealHeading(rawText, className)) {
          return `\\section*{${escapeLatex(rawText)}}\n\n`;
        } else {
          // Treat as paragraph
          return `${escapeLatex(rawText)}\n\n`;
        }
        
      case 'h3':
        if (isRealHeading(rawText, className)) {
          return `\\subsection*{${escapeLatex(rawText)}}\n\n`;
        } else {
          return `${escapeLatex(rawText)}\n\n`;
        }
        
      case 'p':
        // Process inline elements
        return processInlineContent(el as HTMLElement) + '\n\n';
        
      case 'ul':
        let ulContent = '\\begin{itemize}\n';
        el.querySelectorAll(':scope > li').forEach(li => {
          const liText = (li.textContent || '').trim();
          if (liText) {
            ulContent += `  \\item ${escapeLatex(liText)}\n`;
          }
        });
        ulContent += '\\end{itemize}\n\n';
        return ulContent;
        
      case 'ol':
        let olContent = '\\begin{enumerate}\n';
        el.querySelectorAll(':scope > li').forEach(li => {
          const liText = (li.textContent || '').trim();
          if (liText) {
            olContent += `  \\item ${escapeLatex(liText)}\n`;
          }
        });
        olContent += '\\end{enumerate}\n\n';
        return olContent;
        
      case 'blockquote':
        return `\\begin{goldquote}\n${escapeLatex(rawText)}\n\\end{goldquote}\n\n`;
        
      case 'div':
      case 'section':
      case 'article':
        // Process children for container elements
        let containerContent = '';
        Array.from(el.children).forEach(child => {
          containerContent += processElement(child);
        });
        return containerContent;
        
      case 'br':
        return '\\\\\n';
        
      case 'hr':
        return '\\begin{center}\\rule{3in}{0.4pt}\\end{center}\n\n';
        
      default:
        // For other elements, just escape and return text
        if (rawText) {
          return `${escapeLatex(rawText)}\n\n`;
        }
        return '';
    }
  };
  
  // Process inline formatting within a paragraph
  const processInlineContent = (el: HTMLElement): string => {
    let result = '';
    
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return escapeLatex(node.textContent || '');
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement;
        const tag = elem.tagName.toLowerCase();
        const innerContent = Array.from(elem.childNodes).map(processNode).join('');
        
        switch (tag) {
          case 'strong':
          case 'b':
            return `\\textbf{${innerContent}}`;
          case 'em':
          case 'i':
            return `\\textit{${innerContent}}`;
          case 'u':
            return `\\underline{${innerContent}}`;
          case 'br':
            return '\\\\';
          default:
            return innerContent;
        }
      }
      return '';
    };
    
    Array.from(el.childNodes).forEach(node => {
      result += processNode(node);
    });
    
    return result;
  };
  
  // Process all top-level children
  Array.from(container.children).forEach(child => {
    latex += processElement(child);
  });
  
  // If no structured content, treat as plain text
  if (!latex.trim() && container.textContent?.trim()) {
    latex = escapeLatex(container.textContent.trim()) + '\n\n';
  }
  
  return latex;
};

// LaTeX document template
const getLatexTemplate = (title: string, author: string, content: string): string => {
  return `\\documentclass[11pt, oneside]{book}

% ============================================
% PAGE GEOMETRY - Kindle 6x9"
% ============================================
\\usepackage[
  paperwidth=6in, 
  paperheight=9in,
  top=0.75in, 
  bottom=0.75in,
  left=0.75in, 
  right=0.75in
]{geometry}

% ============================================
% LANGUAGE & FONTS
% ============================================
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[french]{babel}

% Use EB Garamond - elegant book font (guaranteed available on Overleaf)
\\usepackage{ebgaramond}

% ============================================
% COLORS
% ============================================
\\usepackage{xcolor}
\\definecolor{deepgreen}{HTML}{2D4A3E}
\\definecolor{brandgold}{HTML}{C9A962}

% ============================================
% CHAPTER & SECTION STYLING
% ============================================
\\usepackage{titlesec}

% Chapter format - centered, large, green
\\titleformat{\\chapter}[display]
  {\\normalfont\\huge\\bfseries\\color{deepgreen}\\centering}
  {}{0pt}{}
\\titlespacing*{\\chapter}{0pt}{30pt}{20pt}

% Section format - green subtitle
\\titleformat{\\section}
  {\\normalfont\\Large\\bfseries\\color{deepgreen}}
  {}{0pt}{}
\\titlespacing*{\\section}{0pt}{20pt}{10pt}

% Subsection format
\\titleformat{\\subsection}
  {\\normalfont\\large\\bfseries\\color{deepgreen}}
  {}{0pt}{}
\\titlespacing*{\\subsection}{0pt}{15pt}{8pt}

% ============================================
% HEADERS & FOOTERS
% ============================================
\\usepackage{fancyhdr}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\small\\color{gray}\\leftmark}
\\fancyfoot[C]{\\thepage}
\\renewcommand{\\headrulewidth}{0.4pt}
\\renewcommand{\\footrulewidth}{0pt}

% Plain style for chapter pages
\\fancypagestyle{plain}{
  \\fancyhf{}
  \\fancyfoot[C]{\\thepage}
  \\renewcommand{\\headrulewidth}{0pt}
}

% ============================================
% BLOCKQUOTE STYLING (Gold border)
% ============================================
\\usepackage{mdframed}
\\newmdenv[
  leftline=true,
  rightline=false,
  topline=false,
  bottomline=false,
  linewidth=3pt,
  linecolor=brandgold,
  backgroundcolor=gray!5,
  innerleftmargin=15pt,
  innerrightmargin=10pt,
  innertopmargin=10pt,
  innerbottommargin=10pt,
  skipabove=10pt,
  skipbelow=10pt
]{goldquote}

% ============================================
% LISTS
% ============================================
\\usepackage{enumitem}
\\setlist[itemize]{leftmargin=20pt, labelsep=8pt, itemsep=4pt}
\\setlist[enumerate]{leftmargin=20pt, labelsep=8pt, itemsep=4pt}

% ============================================
% HYPERLINKS & TOC
% ============================================
\\usepackage{hyperref}
\\hypersetup{
  colorlinks=true,
  linkcolor=deepgreen,
  urlcolor=deepgreen,
  bookmarks=true,
  bookmarksnumbered=false
}

% ============================================
% PARAGRAPH FORMATTING
% ============================================
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{8pt}

% ============================================
% DOCUMENT
% ============================================
\\begin{document}

% --------------------------------------------
% COVER PAGE
% --------------------------------------------
\\begin{titlepage}
\\centering
\\vspace*{2.5in}
{\\Huge\\bfseries\\color{deepgreen} ${escapeLatex(title)} \\par}
\\vspace{0.5in}
{\\color{brandgold}\\rule{2in}{2pt}\\par}
\\vspace{0.5in}
{\\Large\\itshape ${escapeLatex(author)} \\par}
\\vfill
\\end{titlepage}

% --------------------------------------------
% TABLE OF CONTENTS
% --------------------------------------------
\\tableofcontents
\\newpage

% --------------------------------------------
% CHAPTERS
% --------------------------------------------
${content}

\\end{document}
`;
};

// Generate complete LaTeX document from book structure
export const generateLatexDocument = (
  structure: BookStructure,
  options: LatexExportOptions
): string => {
  let chaptersContent = '';
  
  for (const part of structure.parts) {
    for (const chapter of part.chapters) {
      // Chapter title
      const chapterTitle = escapeLatex(chapter.title);
      chaptersContent += `\\chapter*{${chapterTitle}}\n`;
      chaptersContent += `\\addcontentsline{toc}{chapter}{${chapterTitle}}\n`;
      chaptersContent += `\\markboth{${chapterTitle}}{${chapterTitle}}\n\n`;
      
      // Chapter content
      if (chapter.content) {
        chaptersContent += htmlToLatex(chapter.content);
      }
      
      chaptersContent += '\n\\newpage\n\n';
    }
  }
  
  return getLatexTemplate(options.title, options.author, chaptersContent);
};

// Open document in Overleaf using form POST (handles large documents)
export const openInOverleaf = (texContent: string): void => {
  try {
    // Create a form to POST to Overleaf
    // This avoids URL length limits that cause 414 errors
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.overleaf.com/docs';
    form.target = '_blank';
    form.style.display = 'none';
    
    // Add the snip content as a form field
    const snippetField = document.createElement('textarea');
    snippetField.name = 'snip';
    snippetField.value = texContent;
    form.appendChild(snippetField);
    
    // Add engine preference (pdflatex for compatibility)
    const engineField = document.createElement('input');
    engineField.type = 'hidden';
    engineField.name = 'engine';
    engineField.value = 'pdflatex';
    form.appendChild(engineField);
    
    // Submit the form
    document.body.appendChild(form);
    form.submit();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(form);
    }, 100);
    
  } catch (error) {
    console.error('Error opening Overleaf:', error);
    throw new Error('Impossible d\'ouvrir Overleaf. Essayez de télécharger le fichier .tex.');
  }
};

// Download .tex file for local compilation
export const downloadTexFile = (texContent: string, filename: string): void => {
  const blob = new Blob([texContent], { type: 'application/x-tex;charset=utf-8' });
  const safeFilename = filename
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
  saveAs(blob, `${safeFilename}.tex`);
};

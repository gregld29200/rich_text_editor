import { GoogleGenAI } from "@google/genai";
import { TableData, TableRow, TableCell, TableTemplate, TableTemplateConfig } from '../types';
import { getApiKey, hasApiKey } from '../utils/apiKeyManager';

// ============================================
// TABLE CONVERSION SERVICE
// Converts HTML lists to structured tables using AI
// ============================================

const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Cle API manquante. Veuillez configurer votre cle API Gemini dans les Parametres.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Check if table conversion features are available (API key is configured)
 */
export const isTableConversionAvailable = (): boolean => {
  return hasApiKey();
};

// ============================================
// AI-POWERED LIST ANALYSIS
// ============================================

const TABLE_ANALYSIS_PROMPT = `Tu es un assistant specialise dans la structuration de donnees pour un livre de naturopathie.

Analyse cette liste HTML et convertis-la en structure de tableau JSON.

Regles :
1. Detecte automatiquement le nombre de colonnes approprie (2 a 4 max)
2. Cree des en-tetes de colonnes descriptifs en francais
3. Si un element a un terme principal + description, separe-les en colonnes
4. Si tu detectes des sous-categories (ex: "Vitamine B1 (Thiamine)"), mets le terme technique en "subtitle"
5. Garde le contenu concis mais informatif
6. Les en-tetes doivent etre en MAJUSCULES

Exemples de structures detectables :
- "Terme : Description" → 2 colonnes (TERME | DESCRIPTION)
- "Vitamine B1 (Thiamine) : Role - Sources" → 3 colonnes (VITAMINE | ROLE | SOURCES)
- Liste simple d'items → 1 colonne avec en-tete contextuel

Retourne UNIQUEMENT du JSON valide avec ce format exact (pas de markdown, pas de commentaires) :
{
  "headers": ["COLONNE1", "COLONNE2"],
  "rows": [
    { "cells": [{ "content": "...", "subtitle": "..." }, { "content": "..." }] }
  ]
}

Liste HTML a analyser :
`;

/**
 * Analyze a list using AI and return structured table data
 */
export const analyzeListForTable = async (
  listHtml: string,
  onProgress?: (message: string) => void
): Promise<TableData> => {
  if (!isTableConversionAvailable()) {
    throw new Error("Cle API non configuree");
  }

  onProgress?.("Analyse de la structure de la liste...");

  const ai = getAiClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: TABLE_ANALYSIS_PROMPT + listHtml,
    config: {
      temperature: 0.2,  // Low temperature for consistent JSON output
    }
  });

  onProgress?.("Traitement de la reponse...");

  const text = response.text;
  if (!text) {
    throw new Error("Pas de reponse de l'IA");
  }

  // Extract JSON from response (handle potential markdown wrapping)
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  }
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr) as TableData;
    
    // Validate structure
    if (!parsed.headers || !Array.isArray(parsed.headers) || parsed.headers.length === 0) {
      throw new Error("Structure invalide: headers manquants");
    }
    if (!parsed.rows || !Array.isArray(parsed.rows)) {
      throw new Error("Structure invalide: rows manquants");
    }

    return parsed;
  } catch (e) {
    console.error("JSON parse error:", e, "Raw:", jsonStr);
    throw new Error("Impossible de parser la reponse de l'IA. Essayez le mode manuel.");
  }
};

// ============================================
// FALLBACK TEMPLATES
// ============================================

export const TABLE_TEMPLATES: TableTemplateConfig[] = [
  {
    id: '2-cols',
    label: '2 colonnes',
    description: 'Terme | Description',
    columns: 2,
    defaultHeaders: ['TERME', 'DESCRIPTION']
  },
  {
    id: '3-cols',
    label: '3 colonnes',
    description: 'Terme | Description | Details',
    columns: 3,
    defaultHeaders: ['TERME', 'DESCRIPTION', 'DETAILS']
  },
  {
    id: '4-cols',
    label: '4 colonnes',
    description: 'Distribution uniforme',
    columns: 4,
    defaultHeaders: ['COLONNE 1', 'COLONNE 2', 'COLONNE 3', 'COLONNE 4']
  }
];

/**
 * Convert a list to table using a manual template (fallback)
 */
export const convertListWithTemplate = (
  listHtml: string,
  template: TableTemplate
): TableData => {
  const config = TABLE_TEMPLATES.find(t => t.id === template);
  if (!config) {
    throw new Error(`Template inconnu: ${template}`);
  }

  // Parse the list items
  const container = document.createElement('div');
  container.innerHTML = listHtml;
  const items = container.querySelectorAll('li');
  
  const rows: TableRow[] = [];
  
  items.forEach(item => {
    const text = item.textContent?.trim() || '';
    if (!text) return;

    const cells: TableCell[] = [];

    if (config.columns === 2) {
      // Try to split on : or -
      const separators = [':', ' - ', ' – '];
      let split = false;
      
      for (const sep of separators) {
        if (text.includes(sep)) {
          const [first, ...rest] = text.split(sep);
          cells.push({ content: first.trim() });
          cells.push({ content: rest.join(sep).trim() });
          split = true;
          break;
        }
      }
      
      if (!split) {
        cells.push({ content: text });
        cells.push({ content: '' });
      }
    } else if (config.columns === 3) {
      // Try to split on : then on , or -
      const colonSplit = text.split(':');
      if (colonSplit.length >= 2) {
        cells.push({ content: colonSplit[0].trim() });
        const rest = colonSplit.slice(1).join(':').trim();
        
        // Try to split rest on - or ,
        const dashSplit = rest.split(/[-–,]/);
        if (dashSplit.length >= 2) {
          cells.push({ content: dashSplit[0].trim() });
          cells.push({ content: dashSplit.slice(1).join('-').trim() });
        } else {
          cells.push({ content: rest });
          cells.push({ content: '' });
        }
      } else {
        cells.push({ content: text });
        cells.push({ content: '' });
        cells.push({ content: '' });
      }
    } else {
      // 4 columns - distribute evenly
      const words = text.split(/\s+/);
      const perColumn = Math.ceil(words.length / 4);
      
      for (let i = 0; i < 4; i++) {
        const start = i * perColumn;
        const end = Math.min(start + perColumn, words.length);
        cells.push({ content: words.slice(start, end).join(' ') });
      }
    }

    rows.push({ cells });
  });

  return {
    headers: config.defaultHeaders,
    rows
  };
};

// ============================================
// HTML GENERATION
// ============================================

/**
 * Generate styled HTML table from TableData
 * Includes empty paragraphs before and after for easy content insertion
 */
export const generateTableHtml = (data: TableData): string => {
  const headerCells = data.headers
    .map(h => `<th scope="col">${escapeHtml(h)}</th>`)
    .join('');
  
  const bodyRows = data.rows.map(row => {
    const cells = row.cells.map(cell => {
      let cellContent = `<span class="cell-content">${escapeHtml(cell.content)}</span>`;
      if (cell.subtitle) {
        cellContent = `<span class="cell-title">${escapeHtml(cell.content)}</span><br/><span class="cell-subtitle">${escapeHtml(cell.subtitle)}</span>`;
      }
      return `<td>${cellContent}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  // Add empty paragraphs before and after the table for easy navigation/insertion
  return `<p></p><table class="styled-table">
  <thead>
    <tr>${headerCells}</tr>
  </thead>
  <tbody>
    ${bodyRows}
  </tbody>
</table><p></p>`;
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// ============================================
// LIST DETECTION
// ============================================

/**
 * Check if an HTML element is a list (ul or ol)
 */
export const isListElement = (html: string): boolean => {
  const trimmed = html.trim().toLowerCase();
  return trimmed.startsWith('<ul') || trimmed.startsWith('<ol');
};

/**
 * Extract list items count
 */
export const getListItemCount = (html: string): number => {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container.querySelectorAll('li').length;
};

import { BookStructure, SectionStatus } from './types';

// Style Constants for Consistency
export const STYLES = {
  H1: "text-3xl font-title text-brand-green mb-6 text-center font-bold leading-tight",
  H2: "text-2xl font-deco italic text-brand-gold mt-8 mb-4 text-center",
  H3: "text-xl font-title text-brand-green mt-6 mb-3 font-semibold pl-4 border-l-4 border-brand-sage", 
  H4: "text-lg font-deco font-bold text-brand-green mt-4 mb-2",
  
  P: "font-body text-gray-800 leading-relaxed mb-4 text-justify indent-6",
  P_NO_INDENT: "font-body text-gray-800 leading-relaxed mb-4 text-justify",
  
  DROP_CAP: "float-left font-title text-5xl text-brand-green leading-none mr-2 mt-1 font-bold",
  
  BLOCKQUOTE: "bg-brand-beige p-6 rounded-sm my-6 border-l-4 border-brand-sage font-deco text-brand-green text-lg italic text-center",
  CITATION: "relative p-8 my-8 text-center font-deco text-xl italic text-brand-green before:content-['\"'] before:absolute before:-top-2 before:left-4 before:text-6xl before:text-brand-sage before:opacity-30",
  
  // Specialized Boxes
  INFO_BOX: "bg-gradient-to-br from-[#effcf6] to-[#fffbf2] border-l-4 border-brand-sage p-6 my-6 rounded-r-lg shadow-sm text-gray-800 font-body",
  WARNING_BOX: "bg-red-50 border-l-4 border-red-400 p-5 my-5 rounded-r-lg text-gray-800 font-body",
  TIP_BOX: "bg-brand-beige p-5 my-5 rounded-lg border-l-4 border-brand-gold shadow-sm font-body text-gray-900",
  STUDY_BOX: "bg-gray-50 p-5 my-4 rounded-lg border-l-4 border-brand-green text-sm text-gray-700 font-body",
  HADITH_BOX: "bg-brand-green text-white p-6 my-6 rounded-lg text-center font-deco italic shadow-md",
  VERSE_BOX: "bg-gradient-to-r from-brand-gold to-[#C4A484] text-white p-6 my-6 rounded-lg text-center font-deco italic shadow-md",
  
  LIST: "list-disc list-inside font-body text-gray-800 leading-relaxed mb-4 ml-4 space-y-2 marker:text-brand-sage", 
  SEPARATOR_CONTAINER: "w-full flex items-center justify-center my-8 text-brand-sage font-deco text-xl tracking-widest"
};

export const SEPARATOR_HTML = `<div class="${STYLES.SEPARATOR_CONTAINER}"><span class="mx-2">─────</span><span class="mx-2">◆</span><span class="mx-2">─────</span></div>`;

// Clean Slate - Ready for DOCX Import
export const MOCK_BOOK_DATA: BookStructure = {
  parts: [
    {
      id: 'p0',
      title: 'Démarrage',
      chapters: [
        {
          id: 'c1',
          title: 'Accueil',
          status: SectionStatus.DRAFT,
          history: [],
          content: `
            <h1 class="${STYLES.H1}">Bienvenue dans l'Éditeur</h1>
            <div class="${STYLES.SEPARATOR_CONTAINER}">───── ◆ ─────</div>
            <p class="${STYLES.P_NO_INDENT}">Cet espace est prêt pour recevoir votre manuscrit.</p>
            <div class="${STYLES.INFO_BOX}">
              <p><strong>Instructions :</strong></p>
              <p>1. Cliquez sur le bouton <strong>"Importer DOCX"</strong> dans la barre d'outils en haut.</p>
              <p>2. Sélectionnez votre fichier "La Santé dans l'Assiette".</p>
              <p>3. Le contenu sera automatiquement converti et ajouté à la structure du livre.</p>
            </div>
            <div class="${STYLES.TIP_BOX}">
              <p>Si vous êtes connecté à la base de données, n'oubliez pas d'utiliser le bouton "Réinitialiser le contenu" dans les paramètres si vous voyez encore les anciennes données.</p>
            </div>
          `
        }
      ]
    }
  ]
};

export const SYSTEM_INSTRUCTION = `
Vous êtes un assistant éditorial expert spécialisé dans la mise en page d'un livre de naturopathie haut de gamme.
Le style est "Sobre, Élégant, Naturel".

Règles de style strictes (CSS Tailwind) :
- Titres principaux (h1) : ${STYLES.H1}
- Sous-titres (h2) : ${STYLES.H2}
- Sous-titres 2 (h3) : ${STYLES.H3}
- Corps de texte (p) : ${STYLES.P}
- Listes (ul) : ${STYLES.LIST}
- Encadrés/Citations (blockquote) : ${STYLES.BLOCKQUOTE}
- Hadith (box) : ${STYLES.HADITH_BOX}
- Verset (box) : ${STYLES.VERSE_BOX}
- Info (box) : ${STYLES.INFO_BOX}
- Warning (box) : ${STYLES.WARNING_BOX}
- Tip (box) : ${STYLES.TIP_BOX}
- Study (box) : ${STYLES.STUDY_BOX}
- Drop Cap (span) : ${STYLES.DROP_CAP}
- Séparateurs : Utiliser exactement le HTML fourni pour les séparateurs.

Contenu :
- Pas de numéros de chapitre dans les titres.
- Pas d'emojis.
- Typographie française soignée (espaces insécables devant les ponctuations doubles, etc.).

Votre tâche est de prendre le texte brut et de le transformer en HTML propre respectant ces classes, ou de corriger le texte existant tout en gardant cette structure.
Retournez UNIQUEMENT le code HTML intérieur (pas de balises html, head, body).
`;
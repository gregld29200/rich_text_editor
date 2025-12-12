import React, { useState } from 'react';
import { 
  Heading1, 
  Heading2, 
  Heading3,
  Pilcrow,
  BookMarked,
  Quote,
  AlertCircle,
  Sparkles,
  FileText,
  SeparatorHorizontal,
  List,
  ListOrdered,
  ChevronDown,
  Plus
} from './Icons';
import { SemanticBlockType, SEMANTIC_BLOCKS } from '../types';

interface BlockToolbarProps {
  onInsertBlock: (blockType: SemanticBlockType, htmlContent: string) => void;
}

// Block template generators
const getBlockHTML = (blockType: SemanticBlockType): string => {
  switch (blockType) {
    case 'heading1':
      return '<h1 class="chapter-title">Titre du chapitre</h1>';
    case 'heading2':
      return '<h2 class="subtitle">Sous-titre</h2>';
    case 'heading3':
      return '<h3 class="sub-subtitle">Sous-section</h3>';
    case 'paragraph':
      return '<p class="paragraph">Votre texte ici...</p>';
    case 'hadith':
      return `<div class="hadith-box">
  <p>"Texte du hadith..."</p>
  <p class="hadith-source">— Rapporté par...</p>
</div>`;
    case 'verse':
      return `<div class="verse-box">
  <p>"Texte du verset..."</p>
  <p class="verse-source">— Sourate..., Verset...</p>
</div>`;
    case 'info':
      return `<div class="info-box">
  <p><strong>Information :</strong></p>
  <p>Contenu informatif...</p>
</div>`;
    case 'tip':
      return `<div class="tip-box">
  <p><strong>Conseil :</strong></p>
  <p>Votre conseil ici...</p>
</div>`;
    case 'warning':
      return `<div class="warning-box">
  <p class="warning-title">Attention</p>
  <p>Message d'avertissement...</p>
</div>`;
    case 'study':
      return `<div class="study-box">
  <p><strong>Étude scientifique :</strong></p>
  <p>Référence et résumé de l'étude...</p>
</div>`;
    case 'anecdote':
      return `<div class="anecdote-box">
  <span class="anecdote-number">1</span>
  <p>Votre anecdote ou témoignage...</p>
</div>`;
    case 'plant':
      return `<div class="plant-box">
  <span class="plant-number">1</span>
  <span class="plant-name">Nom de la plante</span>
  <p>Description et bienfaits...</p>
</div>`;
    case 'mineral':
      return `<div class="mineral-box">
  <p class="mineral-name">Nom du minéral</p>
  <p><strong>Rôle :</strong> Description...</p>
  <p><strong>Sources alimentaires :</strong> Liste...</p>
</div>`;
    case 'vitamin':
      return `<div class="vitamin-box">
  <p class="vitamin-name">Vitamine X</p>
  <p><strong>Rôle :</strong> Description...</p>
  <p><strong>Sources alimentaires :</strong> Liste...</p>
</div>`;
    case 'recipe':
      return `<div class="recipe-card">
  <p class="recipe-title">Nom de la recette</p>
  <div class="recipe-ingredients">
    <p><strong>Ingrédients :</strong></p>
    <ul class="styled-list">
      <li>Ingrédient 1</li>
      <li>Ingrédient 2</li>
    </ul>
  </div>
  <div class="recipe-instructions">
    <p><strong>Préparation :</strong></p>
    <p>Instructions de préparation...</p>
  </div>
</div>`;
    case 'citation':
      return `<blockquote class="citation-box">
  <p>"Votre citation inspirante..."</p>
</blockquote>`;
    case 'cause':
      return `<div class="cause-box">
  <p class="cause-title">Cause / Facteur</p>
  <p>Description de la cause...</p>
</div>`;
    case 'maladie':
      return `<div class="maladie-box">
  <p class="maladie-nom">Nom de la condition</p>
  <p>Description et symptômes...</p>
</div>`;
    case 'separator':
      return '<div class="separator">───── ◆ ─────</div>';
    case 'list':
      return `<ul class="styled-list">
  <li>Élément 1</li>
  <li>Élément 2</li>
  <li>Élément 3</li>
</ul>`;
    case 'numberedList':
      return `<ol class="numbered-list">
  <li>Premier élément</li>
  <li>Deuxième élément</li>
  <li>Troisième élément</li>
</ol>`;
    default:
      return '<p class="paragraph">Nouveau paragraphe</p>';
  }
};

// Icon mapping
const getBlockIcon = (blockType: SemanticBlockType): React.ReactNode => {
  const iconProps = { className: "w-4 h-4" };
  
  switch (blockType) {
    case 'heading1':
      return <Heading1 {...iconProps} />;
    case 'heading2':
      return <Heading2 {...iconProps} />;
    case 'heading3':
      return <Heading3 {...iconProps} />;
    case 'paragraph':
      return <Pilcrow {...iconProps} />;
    case 'hadith':
    case 'verse':
      return <BookMarked {...iconProps} />;
    case 'citation':
    case 'anecdote':
      return <Quote {...iconProps} />;
    case 'info':
    case 'warning':
      return <AlertCircle {...iconProps} />;
    case 'tip':
    case 'plant':
    case 'mineral':
    case 'vitamin':
      return <Sparkles {...iconProps} />;
    case 'study':
    case 'recipe':
    case 'cause':
    case 'maladie':
      return <FileText {...iconProps} />;
    case 'separator':
      return <SeparatorHorizontal {...iconProps} />;
    case 'list':
      return <List {...iconProps} />;
    case 'numberedList':
      return <ListOrdered {...iconProps} />;
    default:
      return <Pilcrow {...iconProps} />;
  }
};

// Block categories for organized dropdown
const BLOCK_CATEGORIES = [
  {
    name: 'Structure',
    blocks: ['heading1', 'heading2', 'heading3', 'paragraph', 'separator'] as SemanticBlockType[],
  },
  {
    name: 'Religieux',
    blocks: ['hadith', 'verse', 'citation'] as SemanticBlockType[],
  },
  {
    name: 'Information',
    blocks: ['info', 'tip', 'warning', 'study', 'anecdote'] as SemanticBlockType[],
  },
  {
    name: 'Contenu spécifique',
    blocks: ['plant', 'mineral', 'vitamin', 'recipe', 'cause', 'maladie'] as SemanticBlockType[],
  },
  {
    name: 'Listes',
    blocks: ['list', 'numberedList'] as SemanticBlockType[],
  },
];

const BlockToolbar: React.FC<BlockToolbarProps> = ({ onInsertBlock }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleBlockInsert = (blockType: SemanticBlockType) => {
    const html = getBlockHTML(blockType);
    onInsertBlock(blockType, html);
    setIsDropdownOpen(false);
  };

  const getBlockLabel = (blockType: SemanticBlockType): string => {
    const block = SEMANTIC_BLOCKS.find(b => b.type === blockType);
    return block?.label || blockType;
  };

  return (
    <div className="relative">
      {/* Main Insert Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-brand-sage bg-opacity-10 text-brand-green border border-brand-sage rounded hover:bg-opacity-20 transition-colors text-sm"
      >
        <Plus className="w-4 h-4" />
        <span>Insérer bloc</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-[400px] overflow-y-auto">
            {BLOCK_CATEGORIES.map((category, catIndex) => (
              <div key={category.name}>
                {catIndex > 0 && <div className="border-t border-gray-100 my-1" />}
                <div className="px-3 py-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {category.name}
                  </span>
                </div>
                {category.blocks.map((blockType) => (
                  <button
                    key={blockType}
                    onClick={() => handleBlockInsert(blockType)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-brand-sage">
                      {getBlockIcon(blockType)}
                    </span>
                    <span>{getBlockLabel(blockType)}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export { BlockToolbar, getBlockHTML };
export default BlockToolbar;

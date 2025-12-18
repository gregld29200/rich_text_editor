import React from 'react';
import { BookStructure, SectionStatus } from '../types';
import { FileText, BookOpen } from './Icons';

interface TableOfContentsProps {
  structure: BookStructure;
  onNavigateToChapter: (chapterId: string) => void;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ structure, onNavigateToChapter }) => {
  // Calculate total chapters
  const totalChapters = structure.parts.reduce((sum, part) => sum + part.chapters.length, 0);
  
  // Generate chapter numbers across all parts
  let globalChapterIndex = 0;

  return (
    <div className="h-full overflow-y-auto bg-brand-white">
      <div className="max-w-3xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-title font-bold text-brand-green mb-2">
            Table des Matieres
          </h1>
          <div className="w-24 h-1 bg-brand-gold mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">
            {totalChapters} chapitre{totalChapters > 1 ? 's' : ''} dans {structure.parts.length} partie{structure.parts.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Dynamic TOC */}
        <div className="space-y-8">
          {structure.parts.map((part, partIndex) => (
            <div key={part.id} className="group">
              {/* Part Title */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center text-sm font-bold">
                  {partIndex + 1}
                </div>
                <h2 className="text-xl font-title font-bold text-brand-green">
                  {part.title}
                </h2>
              </div>

              {/* Chapters in this part */}
              <div className="ml-11 space-y-1">
                {part.chapters.map((chapter) => {
                  globalChapterIndex++;
                  const chapterNum = globalChapterIndex;
                  
                  return (
                    <button
                      key={chapter.id}
                      onClick={() => onNavigateToChapter(chapter.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-brand-sage/10 transition-colors group/item text-left"
                    >
                      {/* Chapter number */}
                      <span className="text-sm font-mono text-brand-gold w-8 flex-shrink-0">
                        {String(chapterNum).padStart(2, '0')}
                      </span>
                      
                      {/* Icon */}
                      <FileText className="w-4 h-4 text-gray-400 group-hover/item:text-brand-green flex-shrink-0" />
                      
                      {/* Title */}
                      <span className="flex-1 text-gray-700 group-hover/item:text-brand-green truncate">
                        {chapter.title}
                      </span>
                      
                      {/* Dotted line */}
                      <span className="flex-1 border-b border-dotted border-gray-300 mx-2"></span>
                      
                      {/* Status indicator */}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        chapter.status === SectionStatus.VALIDATED 
                          ? 'bg-green-100 text-green-700'
                          : chapter.status === SectionStatus.REVIEW
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {chapter.status === SectionStatus.VALIDATED ? 'Valide' : 
                         chapter.status === SectionStatus.REVIEW ? 'En revision' : 'Brouillon'}
                      </span>
                    </button>
                  );
                })}
                
                {part.chapters.length === 0 && (
                  <p className="text-sm text-gray-400 italic p-3">
                    Aucun chapitre dans cette partie
                  </p>
                )}
              </div>
            </div>
          ))}

          {structure.parts.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun contenu pour l'instant</p>
              <p className="text-sm text-gray-400 mt-2">
                Ajoutez des chapitres pour les voir apparaitre ici
              </p>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            Cette table des matieres se met a jour automatiquement lorsque vous ajoutez, supprimez ou reorganisez les chapitres.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TableOfContents;

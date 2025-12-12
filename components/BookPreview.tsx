import React from 'react';
import { BookSection, ViewMode } from '../types';

interface BookPreviewProps {
  section: BookSection | null;
  viewMode: ViewMode;
}

const BookPreview: React.FC<BookPreviewProps> = ({ section, viewMode }) => {
  if (!section) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-gray-100 text-gray-400">
        <p className="font-body">Sélectionnez un chapitre pour commencer</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 h-full overflow-y-auto p-8 flex justify-center items-start transition-colors duration-300 ${viewMode === 'PRINT' ? 'bg-gray-500' : 'bg-gray-200'}`}>
      {/* Simulation of a 6x9 inch book page */}
      <div 
        id="print-area"
        className={`book-page w-[600px] min-h-[900px] p-12 shadow-2xl relative transition-all duration-300 ease-in-out ${
          viewMode === 'PRINT' 
            ? 'bg-white print-simulation' // Applies specific print CSS overrides defined in index.html
            : 'bg-brand-white'
        }`}
        style={{
          maxWidth: '100%',
        }}
      >
        {/* Render HTML Content safely */}
        <div 
          className={`book-content prose max-w-none ${viewMode === 'PRINT' ? 'prose-sm' : 'prose-stone'}`}
          dangerouslySetInnerHTML={{ __html: section.content }} 
        />
        
        {/* Page Footer Simulation */}
        <div className={`mt-16 pt-8 border-t flex justify-center ${viewMode === 'PRINT' ? 'border-black' : 'border-gray-100'}`}>
           <span className={`${viewMode === 'PRINT' ? 'text-black font-serif italic' : 'text-gray-400 font-deco text-xs'}`}>
             La Santé dans l'Assiette
           </span>
        </div>
      </div>
    </div>
  );
};

export default BookPreview;

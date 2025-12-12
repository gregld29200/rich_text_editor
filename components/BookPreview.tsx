import React from 'react';
import { BookSection, ThemeMode, THEMES } from '../types';

interface BookPreviewProps {
  section: BookSection | null;
  theme: ThemeMode;
}

const BookPreview: React.FC<BookPreviewProps> = ({ section, theme }) => {
  const themeConfig = THEMES[theme];
  
  if (!section) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-gray-100 text-gray-400">
        <p className="font-body text-center p-4">
          Sélectionnez un chapitre<br />pour voir l'aperçu
        </p>
      </div>
    );
  }

  return (
    <div 
      className={`flex-1 h-full overflow-y-auto p-4 md:p-8 flex justify-center items-start transition-colors duration-300 ${
        theme === 'print' ? 'bg-gray-500' : 'bg-gray-200'
      }`}
    >
      {/* Book Page Container */}
      <div 
        id="print-area"
        className={`book-page relative transition-all duration-300 ease-in-out ${themeConfig.cssClass}`}
        style={{
          width: theme === 'print' ? '6in' : '650px',
          minHeight: theme === 'print' ? '9in' : '900px',
          maxWidth: '100%',
          padding: theme === 'print' ? '0.75in 0.6in' : '3rem',
          boxShadow: theme === 'print' 
            ? '0 0 20px rgba(0,0,0,0.3)' 
            : '0 4px 20px rgba(0,0,0,0.15)',
          background: theme === 'print' ? 'white' : 'var(--blanc-casse, #FDFBF7)',
        }}
      >
        {/* Content Area */}
        <div 
          className="book-content prose max-w-none"
          dangerouslySetInnerHTML={{ __html: section.content }} 
        />
        
        {/* Page Footer */}
        <div 
          className={`page-footer mt-12 pt-6 flex justify-center ${
            theme === 'print' 
              ? 'border-t border-gray-400 text-gray-600' 
              : 'border-t border-gray-200 text-gray-400'
          }`}
        >
          <span 
            className={`text-xs ${
              theme === 'print' 
                ? 'font-serif italic' 
                : 'font-deco'
            }`}
          >
            La Santé dans l'Assiette
          </span>
        </div>
      </div>
    </div>
  );
};

export default BookPreview;

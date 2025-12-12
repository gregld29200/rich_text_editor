import React, { useState } from 'react';
import { BookStructure, SectionStatus } from '../types';
import { ChevronRight, ChevronDown, FileText, CheckCircle, Clock, BookOpen } from './Icons';

interface SidebarProps {
  structure: BookStructure;
  currentSectionId: string | null;
  onSelectSection: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ structure, currentSectionId, onSelectSection }) => {
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({
    'p1': true,
    'p2': true
  });

  const togglePart = (partId: string) => {
    setExpandedParts(prev => ({ ...prev, [partId]: !prev[partId] }));
  };

  const getStatusIcon = (status: SectionStatus) => {
    switch (status) {
      case SectionStatus.VALIDATED:
        return <CheckCircle className="w-4 h-4 text-brand-green" />;
      case SectionStatus.REVIEW:
        return <Clock className="w-4 h-4 text-brand-gold" />;
      default:
        return <div className="w-4 h-4 rounded-full border border-gray-300" />;
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-full flex flex-col no-print">
      <div className="p-6 border-b border-gray-100 bg-brand-white">
        <h1 className="text-xl font-title text-brand-green font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          La Santé dans l'Assiette
        </h1>
        <p className="text-xs text-gray-500 mt-2 font-body uppercase tracking-wider">Éditeur de Manuscrit</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {structure.parts.map((part) => (
          <div key={part.id} className="select-none">
            <button 
              onClick={() => togglePart(part.id)}
              className="flex items-center gap-2 w-full text-left p-2 hover:bg-gray-50 rounded text-brand-green font-semibold"
            >
              {expandedParts[part.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="truncate">{part.title}</span>
            </button>
            
            {expandedParts[part.id] && (
              <div className="ml-4 mt-1 space-y-1 border-l border-gray-100 pl-2">
                {part.chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => onSelectSection(chapter.id)}
                    className={`flex items-center justify-between w-full text-left p-2 rounded text-sm transition-colors ${
                      currentSectionId === chapter.id 
                        ? 'bg-brand-sage text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-brand-green'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate font-body">{chapter.title}</span>
                    </div>
                    <div title={chapter.status}>
                      {getStatusIcon(chapter.status)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-400 text-center font-body">
        v1.0.0 • Oum Soumayya
      </div>
    </div>
  );
};

export default Sidebar;

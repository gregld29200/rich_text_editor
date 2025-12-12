import React, { useState, useEffect } from 'react';
import * as Diff from 'diff';
import { BookVersion } from '../types';
import { RotateCcw, GitCompare, CheckCircle } from './Icons';

interface VersionHistoryProps {
  currentContent: string;
  history: BookVersion[];
  onRestore: (version: BookVersion) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ currentContent, history, onRestore }) => {
  const [selectedVersion, setSelectedVersion] = useState<BookVersion | null>(null);
  const [diffElements, setDiffElements] = useState<React.ReactElement[]>([]);

  useEffect(() => {
    if (selectedVersion) {
      // Compare selected version content with current content
      // Note: We are diffing text/html source which might be noisy, 
      // but it gives full transparency on what changed in structure.
      const diff = Diff.diffWords(selectedVersion.content, currentContent);
      
      const elements = diff.map((part, index) => {
        const color = part.added ? 'bg-green-100 text-green-800' :
                      part.removed ? 'bg-red-100 text-red-800 line-through' : 
                      'text-gray-500';
        return (
          <span key={index} className={`${color} px-0.5 break-all`}>
            {part.value}
          </span>
        );
      });
      setDiffElements(elements);
    }
  }, [selectedVersion, currentContent]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
        <GitCompare className="w-12 h-12 mb-4 opacity-20" />
        <p>Aucun historique disponible pour cette section.</p>
        <p className="text-xs mt-2">Les versions sont créées automatiquement à chaque sauvegarde.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Version List */}
      <div className="flex-1 overflow-y-auto border-b border-gray-200">
        <h3 className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider bg-gray-50 sticky top-0">
          Versions Précédentes ({history.length})
        </h3>
        <div className="divide-y divide-gray-100">
          {history.map((version) => (
            <div 
              key={version.id}
              onClick={() => setSelectedVersion(version)}
              className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedVersion?.id === version.id ? 'bg-blue-50 border-l-4 border-blue-400' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm text-gray-700">
                  {new Date(version.timestamp).toLocaleString()}
                </span>
                {selectedVersion?.id === version.id && (
                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">Sélectionné</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-2 truncate">
                {version.summary || "Sauvegarde automatique"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Diff View Area */}
      <div className="h-1/2 flex flex-col border-t border-gray-300 shadow-inner bg-gray-50">
        <div className="p-2 border-b border-gray-200 bg-white flex justify-between items-center">
          <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
            <GitCompare className="w-4 h-4" />
            Comparaison (Diff)
          </span>
          
          {selectedVersion && (
            <button 
              onClick={() => {
                if(window.confirm("Êtes-vous sûr de vouloir restaurer cette version ? Le contenu actuel sera sauvegardé dans l'historique.")) {
                  onRestore(selectedVersion);
                  setSelectedVersion(null);
                }
              }}
              className="px-3 py-1 bg-brand-gold text-white text-xs rounded hover:bg-opacity-90 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Restaurer cette version
            </button>
          )}
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs bg-white">
          {selectedVersion ? (
            <div className="whitespace-pre-wrap leading-relaxed">
              {diffElements}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 italic">
              Sélectionnez une version ci-dessus pour voir les différences.
              <br/>
              <span className="text-green-600 bg-green-100 px-1 mx-1">Vert</span> = Ajouté actuellement
              <span className="text-red-600 bg-red-100 px-1 mx-1 line-through">Rouge</span> = Présent dans l'ancienne version
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistory;
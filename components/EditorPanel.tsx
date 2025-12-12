import React, { useState, useEffect } from 'react';
import { BookSection, SectionStatus, AIRequestOptions, BookVersion } from '../types';
import { Wand2, Save, Edit3, History as HistoryIcon, Eye } from './Icons';
import { processContentWithAI } from '../services/geminiService';
import RichTextEditor from './RichTextEditor';
import VersionHistory from './VersionHistory';

interface EditorPanelProps {
  section: BookSection | null;
  onUpdate: (id: string, newContent: string, newStatus?: SectionStatus) => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ section, onUpdate }) => {
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<SectionStatus>(SectionStatus.DRAFT);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [isCodeMode, setIsCodeMode] = useState(false);

  useEffect(() => {
    if (section) {
      setContent(section.content);
      setStatus(section.status);
    } else {
      setContent('');
    }
  }, [section]);

  const handleSave = () => {
    if (section) {
      onUpdate(section.id, content, status);
    }
  };

  const handleRestore = (version: BookVersion) => {
    if (section) {
      // When restoring, we trigger an update which will save current state to history automatically
      onUpdate(section.id, version.content, status);
      setActiveTab('editor');
    }
  };

  const handleAIRequest = async (type: AIRequestOptions['type']) => {
    if (!section) return;
    
    setIsProcessing(true);
    setShowAiMenu(false);
    try {
      const newContent = await processContentWithAI(content, { 
        type, 
        instructions: customPrompt 
      });
      setContent(newContent);
    } catch (error) {
      alert("Erreur lors de la génération IA. Vérifiez votre clé API.");
    } finally {
      setIsProcessing(false);
      setCustomPrompt('');
    }
  };

  if (!section) {
    return <div className="w-1/3 bg-white border-l border-gray-200 hidden lg:block" />;
  }

  return (
    <div className="w-full lg:w-[450px] bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-10 no-print">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="overflow-hidden">
           <h2 className="font-title font-bold text-gray-800">Éditeur</h2>
           <span className="text-xs text-gray-500 font-body truncate block">{section.title}</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
             onClick={handleSave}
             className="p-2 bg-brand-green text-white rounded hover:bg-opacity-90 transition-all flex items-center gap-2 text-sm"
             title="Sauvegarder les changements"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Enregistrer</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'editor' 
              ? 'border-brand-green text-brand-green' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          Édition
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'history' 
              ? 'border-brand-green text-brand-green' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <HistoryIcon className="w-4 h-4" />
          Historique
        </button>
      </div>

      {/* Editor Content */}
      {activeTab === 'editor' && (
        <>
          {/* Editor Toolbar (Status & AI) */}
          <div className="p-2 border-b border-gray-100 flex gap-2 items-center justify-between bg-white">
             <div className="relative">
                <button 
                    onClick={() => setShowAiMenu(!showAiMenu)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-brand-sage bg-opacity-10 text-brand-green border border-brand-sage rounded flex items-center gap-2 text-sm hover:bg-opacity-20 transition-all"
                >
                    {isProcessing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-green" /> : <Wand2 className="w-4 h-4" />}
                    Assistant IA
                </button>
                
                {showAiMenu && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Actions Rapides</p>
                        <button 
                            onClick={() => handleAIRequest('FORMAT')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded text-gray-700 flex items-center gap-2"
                        >
                            <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs">F</span>
                            Formater (Style Livre)
                        </button>
                        <button 
                            onClick={() => handleAIRequest('CORRECT')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded text-gray-700 flex items-center gap-2"
                        >
                            <span className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-600 rounded-full text-xs">C</span>
                            Corriger Orthographe
                        </button>
                        
                        <div className="border-t border-gray-100 my-2 pt-2">
                            <label className="text-xs text-gray-500 px-2 block mb-1">Instruction personnalisée</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2" 
                                placeholder="ex: Rends le ton plus chaleureux..."
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                            />
                            <button 
                                 onClick={() => handleAIRequest('REWRITE')}
                                 className="w-full bg-brand-gold text-white text-xs py-1.5 rounded hover:bg-opacity-90"
                            >
                                Exécuter
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value as SectionStatus)}
              className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-700 bg-white"
            >
              {Object.values(SectionStatus).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <RichTextEditor 
              content={content} 
              onChange={setContent} 
              isCodeMode={isCodeMode}
              toggleCodeMode={() => setIsCodeMode(!isCodeMode)}
            />
          </div>
        </>
      )}

      {/* History Content */}
      {activeTab === 'history' && (
        <VersionHistory 
          currentContent={content}
          history={section.history}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
};

export default EditorPanel;

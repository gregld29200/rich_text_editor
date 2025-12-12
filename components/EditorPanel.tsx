import React, { useState, useEffect } from 'react';
import { BookSection, SectionStatus, AIRequestOptions, BookVersion, SemanticBlockType } from '../types';
import { Wand2, Save, Edit3, History as HistoryIcon, Loader2 } from './Icons';
import { processContentWithAI, isAIAvailable } from '../services/geminiService';
import TipTapEditor from './TipTapEditor';
import { BlockToolbar, getBlockHTML } from './BlockToolbar';
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (section) {
      setContent(section.content);
      setStatus(section.status);
      setHasUnsavedChanges(false);
    } else {
      setContent('');
    }
  }, [section]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (section) {
      onUpdate(section.id, content, status);
      setHasUnsavedChanges(false);
    }
  };

  const handleRestore = (version: BookVersion) => {
    if (section) {
      onUpdate(section.id, version.content, status);
      setActiveTab('editor');
    }
  };

  const handleAIRequest = async (type: AIRequestOptions['type']) => {
    if (!section) return;
    
    if (!isAIAvailable()) {
      alert("Clé API manquante. Veuillez configurer votre clé API Gemini dans les Paramètres.");
      return;
    }
    
    setIsProcessing(true);
    setShowAiMenu(false);
    try {
      const newContent = await processContentWithAI(content, { 
        type, 
        instructions: customPrompt 
      });
      setContent(newContent);
      setHasUnsavedChanges(true);
    } catch (error: any) {
      const message = error?.message || "Erreur lors de la génération IA.";
      alert(message);
    } finally {
      setIsProcessing(false);
      setCustomPrompt('');
    }
  };

  const handleInsertBlock = (blockType: SemanticBlockType, htmlContent: string) => {
    // Insert the block HTML at the end of current content
    const newContent = content + '\n' + htmlContent;
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  if (!section) {
    return (
      <div className="w-full lg:w-[450px] bg-white border-l border-gray-200 hidden lg:flex items-center justify-center text-gray-400">
        <p className="text-center p-8">
          Sélectionnez un chapitre<br />pour commencer l'édition
        </p>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-[450px] bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-10 no-print">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="overflow-hidden flex-1 min-w-0">
           <h2 className="font-title font-bold text-gray-800 flex items-center gap-2">
             Éditeur
             {hasUnsavedChanges && (
               <span className="w-2 h-2 rounded-full bg-amber-500" title="Modifications non enregistrées" />
             )}
           </h2>
           <span className="text-xs text-gray-500 font-body truncate block">{section.title}</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
             onClick={handleSave}
             disabled={!hasUnsavedChanges}
             className={`p-2 rounded transition-all flex items-center gap-2 text-sm ${
               hasUnsavedChanges 
                 ? 'bg-brand-green text-white hover:bg-opacity-90' 
                 : 'bg-gray-100 text-gray-400 cursor-not-allowed'
             }`}
             title="Enregistrer les changements"
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
          {/* Editor Toolbar (Status, AI, Block Insert) */}
          <div className="p-2 border-b border-gray-100 flex gap-2 items-center justify-between bg-white flex-wrap">
            <div className="flex gap-2 items-center">
              {/* Block Insert */}
              <BlockToolbar onInsertBlock={handleInsertBlock} />
              
              {/* AI Assistant */}
              <div className="relative">
                <button 
                    onClick={() => setShowAiMenu(!showAiMenu)}
                    disabled={isProcessing || !isAIAvailable()}
                    className={`px-3 py-1.5 border rounded flex items-center gap-2 text-sm transition-all ${
                      isAIAvailable()
                        ? 'bg-brand-gold bg-opacity-10 text-brand-gold border-brand-gold hover:bg-opacity-20'
                        : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    }`}
                    title={isAIAvailable() ? "Assistant IA" : "Configurez votre clé API dans les Paramètres"}
                >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">IA</span>
                </button>
                
                {showAiMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowAiMenu(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Actions IA</p>
                          <button 
                              onClick={() => handleAIRequest('FORMAT')}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded text-gray-700 flex items-center gap-2"
                          >
                              <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs font-bold">F</span>
                              Formater (Style Livre)
                          </button>
                          <button 
                              onClick={() => handleAIRequest('CORRECT')}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded text-gray-700 flex items-center gap-2"
                          >
                              <span className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-600 rounded-full text-xs font-bold">C</span>
                              Corriger Orthographe
                          </button>
                          
                          <div className="border-t border-gray-100 my-2 pt-2">
                              <label className="text-xs text-gray-500 px-2 block mb-1">Instruction personnalisée</label>
                              <input 
                                  type="text" 
                                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-brand-gold" 
                                  placeholder="ex: Rends le ton plus chaleureux..."
                                  value={customPrompt}
                                  onChange={(e) => setCustomPrompt(e.target.value)}
                              />
                              <button 
                                   onClick={() => handleAIRequest('REWRITE')}
                                   className="w-full bg-brand-gold text-white text-sm py-1.5 rounded hover:bg-opacity-90 transition-colors"
                              >
                                  Exécuter
                              </button>
                          </div>
                      </div>
                    </>
                )}
              </div>
            </div>

            {/* Status Select */}
            <select 
              value={status} 
              onChange={(e) => {
                setStatus(e.target.value as SectionStatus);
                setHasUnsavedChanges(true);
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-sage"
            >
              {Object.values(SectionStatus).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* TipTap Editor */}
          <div className="flex-1 relative overflow-hidden">
            <TipTapEditor 
              content={content} 
              onChange={handleContentChange} 
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

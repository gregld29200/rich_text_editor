import React, { useState, useCallback, useEffect, useRef } from 'react';
import mammoth from 'mammoth';
import Sidebar from './components/Sidebar';
import BookPreview from './components/BookPreview';
import EditorPanel from './components/EditorPanel';
import SettingsModal from './components/SettingsModal';
import { BookStructure, BookSection, SectionStatus, BookVersion, ViewMode } from './types';
import IMPORTED_BOOK_DATA from './data/bookContent';
import { Download, Printer, Settings, FileUp, Volume2, Square, Loader2, HelpCircle, RotateCcw } from './components/Icons';
import WelcomeGuide, { useWelcomeGuide } from './components/WelcomeGuide';
import { 
  initFirebase, 
  saveBookStructure, 
  loadBookStructure, 
  loadSectionContent, 
  saveSectionContent,
  addHistoryEntry,
  loadSectionHistory
} from './services/firebaseService';
import { generateChapterAudio } from './services/geminiService';
import { getApiKey } from './utils/apiKeyManager';
import { analyzeDocumentAggressive } from './services/documentAnalyzer';

function App() {
  const [bookData, setBookData] = useState<BookStructure>(IMPORTED_BOOK_DATA);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(
    IMPORTED_BOOK_DATA.parts[0]?.chapters[0]?.id || null
  );
  // API key is optional - app works without AI features
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('WEB');
  const [showSettings, setShowSettings] = useState(false);
  const [firebaseActive, setFirebaseActive] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Welcome Guide
  const { showGuide, closeGuide, reopenGuide } = useWelcomeGuide();

  // Audio State
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // --- 0. Auto-Init Backend on Mount ---
  useEffect(() => {
    const autoInitBackend = async () => {
      await handleFirebaseConfig(); // No args = use default hardcoded config
    };
    autoInitBackend();
  }, []);

  // --- 1. Load Content on Section Select (Granular Loading) ---
  useEffect(() => {
    if (!currentSectionId || !firebaseActive) return;

    // Stop audio if changing chapters
    stopAudio();

    const fetchContent = async () => {
      setIsLoadingContent(true);
      try {
        const data = await loadSectionContent(currentSectionId);
        const history = await loadSectionHistory(currentSectionId);

        if (data) {
          setBookData(prev => ({
            parts: prev.parts.map(part => ({
              ...part,
              chapters: part.chapters.map(c => {
                if (c.id === currentSectionId) {
                  return { ...c, content: data.content, status: data.status, history };
                }
                return c;
              })
            }))
          }));
        }
      } catch (e) {
        console.error("Error loading section content:", e);
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContent();
  }, [currentSectionId, firebaseActive]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Helper to find section by ID
  const getCurrentSection = useCallback((): BookSection | null => {
    if (!currentSectionId) return null;
    for (const part of bookData.parts) {
      const section = part.chapters.find(c => c.id === currentSectionId);
      if (section) return section;
    }
    return null;
  }, [bookData, currentSectionId]);

  // --- Audio Logic ---
  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // ignore if already stopped
      }
      audioSourceRef.current = null;
    }
    setIsPlayingAudio(false);
    setIsGeneratingAudio(false);
  };

  const handleTextToSpeech = async () => {
    if (isPlayingAudio) {
      stopAudio();
      return;
    }

    const section = getCurrentSection();
    if (!section || !section.content) return;

    setIsGeneratingAudio(true);
    try {
      // Initialize AudioContext on user gesture
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const audioBuffer = await generateChapterAudio(section.content, audioContextRef.current);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setIsPlayingAudio(false);
        setIsGeneratingAudio(false);
        audioSourceRef.current = null;
      };

      audioSourceRef.current = source;
      source.start();
      setIsPlayingAudio(true);
    } catch (e) {
      console.error("TTS Error", e);
      alert("Erreur lors de la lecture audio. Vérifiez votre clé API.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // --- 2. Save Logic (Granular Saving) ---
  const handleUpdateSection = async (id: string, newContent: string, newStatus?: SectionStatus) => {
    const timestamp = Date.now();
    const newHistoryEntry: BookVersion = {
      id: timestamp.toString(),
      timestamp: timestamp,
      content: getCurrentSection()?.content || '', 
      summary: `Modification ${new Date().toLocaleTimeString()}`
    };

    const newBookData: BookStructure = {
      ...bookData,
      parts: bookData.parts.map(part => ({
        ...part,
        chapters: part.chapters.map(chapter => {
          if (chapter.id === id) {
            return {
              ...chapter,
              content: newContent,
              status: newStatus || chapter.status,
              history: [newHistoryEntry, ...chapter.history]
            };
          }
          return chapter;
        })
      }))
    };
    
    setBookData(newBookData);

    if (firebaseActive) {
      try {
        await saveSectionContent(id, newContent, newStatus || SectionStatus.DRAFT);
        await addHistoryEntry(id, newHistoryEntry);
        await saveBookStructure(newBookData); 
      } catch (e) {
        console.error("Failed to auto-save to Firebase", e);
      }
    }
  };

  const handlePrint = () => {
    setViewMode('PRINT');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleSelectApiKey = async () => {
      try {
          const win = window as Window & { aistudio?: { openSelectKey?: () => Promise<void> } };
          if(win.aistudio && win.aistudio.openSelectKey){
             await win.aistudio.openSelectKey();
             setApiKeyMissing(false);
          } else {
              alert("L'interface de sélection de clé API n'est pas disponible.");
          }
      } catch (e) {
          console.error(e);
          alert("Erreur lors de la sélection de la clé.");
      }
  };

  // --- Reset Feature ---
  const handleResetToDefault = async () => {
    const firstChapterId = IMPORTED_BOOK_DATA.parts[0]?.chapters[0]?.id || null;
    
    if(!firebaseActive) {
      setBookData(IMPORTED_BOOK_DATA);
      setCurrentSectionId(firstChapterId);
      setShowSettings(false);
      return;
    }

    if(!confirm("Attention : Ceci va écraser la structure actuelle du livre avec le contenu importé. Les chapitres existants dans la base de données ne seront pas supprimés mais la navigation sera réinitialisée. Continuer ?")) return;
    
    setIsLoadingContent(true);
    try {
      // 1. Save full imported structure
      await saveBookStructure(IMPORTED_BOOK_DATA);
      
      // 2. Save all content from imported data
      for(const part of IMPORTED_BOOK_DATA.parts) {
        for(const chapter of part.chapters) {
          await saveSectionContent(chapter.id, chapter.content, chapter.status);
        }
      }
      
      // 3. Update local
      setBookData(IMPORTED_BOOK_DATA);
      setCurrentSectionId(firstChapterId);
      alert("Contenu réinitialisé avec succès !");
    } catch(e) {
      console.error(e);
      alert("Erreur lors de la réinitialisation.");
    } finally {
      setIsLoadingContent(false);
      setShowSettings(false);
    }
  }

  const handleFirebaseConfig = async (config?: any) => {
    try {
      initFirebase(config);
      setFirebaseActive(true);
      
      const remoteStructure = await loadBookStructure();
      
      if (remoteStructure) {
        // --- SMART MERGE LOGIC ---
        // Check for new parts in IMPORTED_BOOK_DATA that are NOT in remoteStructure
        // This ensures new code updates (like Phase 7, 8...) appear even if DB is old
        const remotePartIds = new Set(remoteStructure.parts.map(p => p.id));
        const newParts = IMPORTED_BOOK_DATA.parts.filter(p => !remotePartIds.has(p.id));
        
        if (newParts.length > 0) {
           console.log("New content detected in code, merging into database...", newParts.map(p => p.title));
           
           // 1. Save the content of these new sections to Firestore
           for(const part of newParts) {
             for(const chapter of part.chapters) {
               await saveSectionContent(chapter.id, chapter.content, chapter.status);
             }
           }
           
           // 2. Merge structures
           const mergedParts = [...remoteStructure.parts, ...newParts];
           const mergedStructure = { parts: mergedParts };
           
           // 3. Save new structure index
           await saveBookStructure(mergedStructure);
           
           // 4. Update local state
           setBookData(mergedStructure);
        } else {
           // Normal load
           const hydratedStructure: BookStructure = {
            parts: remoteStructure.parts.map(p => ({
              ...p,
              chapters: p.chapters.map(c => ({
                ...c,
                content: c.content || '',
                history: []
              }))
            }))
          };
          setBookData(hydratedStructure);
        }
      } else {
        // First time initialization
        await saveBookStructure(bookData);
        for(const part of bookData.parts) {
          for(const chapter of part.chapters) {
            await saveSectionContent(chapter.id, chapter.content, chapter.status);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.docx')) {
      // Ask user what to do
      const action = confirm(
        "Comment voulez-vous importer ce document ?\n\n" +
        "OK = Analyser et remplacer tout le contenu\n" +
        "(Le document sera divisé automatiquement en parties et chapitres)\n\n" +
        "Annuler = Ne pas importer"
      );
      
      if (!action) {
        event.target.value = '';
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        try {
          // Convert DOCX to HTML
          const result = await mammoth.convertToHtml({ arrayBuffer });
          
          // Analyze and structure the document
          const documentTitle = file.name.replace('.docx', '').replace(/_/g, ' ');
          const analyzedBook = analyzeDocumentAggressive(result.value, documentTitle);
          
          // Show summary
          const totalChapters = analyzedBook.parts.reduce((sum, p) => sum + p.chapters.length, 0);
          const partsList = analyzedBook.parts.map(p => `  • ${p.title} (${p.chapters.length} chapitres)`).join('\n');
          
          const confirmImport = confirm(
            `Document analysé avec succès !\n\n` +
            `Structure détectée :\n` +
            `${partsList}\n\n` +
            `Total : ${analyzedBook.parts.length} parties, ${totalChapters} chapitres\n\n` +
            `Confirmer l'import ?`
          );
          
          if (!confirmImport) {
            event.target.value = '';
            return;
          }
          
          // Update state with analyzed book
          setBookData(analyzedBook);
          
          // Select first chapter
          const firstChapterId = analyzedBook.parts[0]?.chapters[0]?.id || null;
          setCurrentSectionId(firstChapterId);
          
          // Save to Firebase if active
          const failedChapters: string[] = [];
          if (firebaseActive) {
            await saveBookStructure(analyzedBook);
            for (const part of analyzedBook.parts) {
              for (const chapter of part.chapters) {
                try {
                  await saveSectionContent(chapter.id, chapter.content, chapter.status);
                } catch (saveErr: any) {
                  console.error(`Failed to save chapter "${chapter.title}":`, saveErr);
                  failedChapters.push(chapter.title);
                }
              }
            }
          }
          
          if (failedChapters.length > 0) {
            alert(`Import partiellement réussi !\n\n${analyzedBook.parts.length} parties et ${totalChapters} chapitres créés.\n\n⚠️ ${failedChapters.length} chapitre(s) trop volumineux pour Firebase:\n- ${failedChapters.join('\n- ')}\n\nCes chapitres sont disponibles localement mais ne seront pas synchronisés. Divisez-les en parties plus petites.`);
          } else {
            alert(`Import réussi !\n\n${analyzedBook.parts.length} parties et ${totalChapters} chapitres créés.\n\nVous pouvez maintenant éditer chaque chapitre individuellement.`);
          }
          
        } catch (err: any) {
          console.error(err);
          alert(`Erreur lors de l'analyse du fichier DOCX:\n${err.message || 'Erreur inconnue'}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Veuillez sélectionner un fichier .docx");
    }
    
    // Reset the input to allow re-importing the same file
    event.target.value = '';
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        onSaveFirebase={handleFirebaseConfig}
        hasFirebase={firebaseActive}
        onResetContent={handleResetToDefault}
      />

      {/* Welcome Guide */}
      {showGuide && <WelcomeGuide onClose={closeGuide} />}

      {/* Main Layout */}
      <Sidebar 
        structure={bookData} 
        currentSectionId={currentSectionId} 
        onSelectSection={setCurrentSectionId} 
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Bar */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-20 no-print">
            <div className="flex items-center gap-4">
               {/* View Toggle */}
               <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-medium">
                 <button 
                   onClick={() => setViewMode('WEB')}
                   className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'WEB' ? 'bg-white shadow text-brand-green' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   Vue Riche
                 </button>
                 <button 
                   onClick={() => setViewMode('PRINT')}
                   className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${viewMode === 'PRINT' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   <Printer className="w-3 h-3" />
                   Vue Impression
                 </button>
               </div>
               
               {isLoadingContent && firebaseActive && (
                 <div className="flex items-center gap-2 text-xs text-brand-gold animate-pulse">
                   <div className="w-2 h-2 rounded-full bg-brand-gold"></div>
                   Chargement du chapitre...
                 </div>
               )}
            </div>

            <div className="flex items-center gap-3">
                {/* TTS Button */}
                <button 
                  onClick={handleTextToSpeech}
                  disabled={isGeneratingAudio}
                  className={`flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm font-medium border ${
                    isPlayingAudio || isGeneratingAudio
                      ? 'bg-brand-sage text-white border-brand-sage' 
                      : 'text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {isGeneratingAudio ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPlayingAudio ? (
                    <Square className="w-4 h-4 fill-current" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isGeneratingAudio ? 'Génération...' : isPlayingAudio ? 'Arrêter' : 'Écouter'}
                  </span>
                </button>

                <div className="w-px h-6 bg-gray-300 mx-1"></div>

                <label className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded cursor-pointer text-sm font-medium border border-gray-200">
                    <FileUp className="w-4 h-4" />
                    <span className="hidden sm:inline">Importer DOCX</span>
                    <input type="file" accept=".docx" className="hidden" onChange={handleFileUpload} />
                </label>

                <button 
                    onClick={() => {
                      if (confirm("Réinitialiser tout le contenu avec les données importées originales ?")) {
                        handleResetToDefault();
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-orange-600 hover:bg-orange-50 rounded text-sm font-medium border border-orange-200"
                    title="Réinitialiser le contenu"
                >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Réinitialiser</span>
                </button>

                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                    <Download className="w-4 h-4" />
                    Export PDF
                </button>
                
                <button 
                  onClick={reopenGuide}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                  title="Guide d'utilisation"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>

                <button 
                  onClick={() => setShowSettings(true)}
                  className={`p-2 rounded-full transition-colors ${firebaseActive ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100 text-gray-400'}`}
                  title="Paramètres & Backend"
                >
                  <Settings className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
            <BookPreview section={getCurrentSection()} theme={viewMode === 'WEB' ? 'web' : 'print'} />
            <EditorPanel section={getCurrentSection()} onUpdate={handleUpdateSection} />
        </div>
      </div>
    </div>
  );
}

export default App;
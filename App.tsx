import React, { useState, useCallback, useEffect, useRef } from 'react';
import mammoth from 'mammoth';
import { arrayMove } from '@dnd-kit/sortable';
import Sidebar from './components/Sidebar';
import BookPreview from './components/BookPreview';
import EditorPanel from './components/EditorPanel';
import SettingsModal from './components/SettingsModal';
import FeedbackModal from './components/FeedbackModal';
import TitlePageEditor from './components/TitlePageEditor';
import { BookStructure, BookSection, SectionStatus, BookVersion, ViewMode, FrontMatter, FrontMatterSection, TitlePageData } from './types';
import IMPORTED_BOOK_DATA from './data/bookContent';
import { Download, Printer, Settings, FileUp, Volume2, Square, Loader2, HelpCircle, RotateCcw, ChevronDown, FileText, FileDown, Save, MessageSquareText, Trash2, Undo, X } from './components/Icons';
import WelcomeGuide, { useWelcomeGuide } from './components/WelcomeGuide';
import { 
  initFirebase, 
  saveBookStructure, 
  loadBookStructure, 
  loadSectionContent, 
  saveSectionContent,
  addHistoryEntry,
  loadSectionHistory,
  saveFrontMatter,
  loadFrontMatter
} from './services/firebaseService';
import { generateChapterAudio } from './services/geminiService';
import { getApiKey } from './utils/apiKeyManager';
import { analyzeDocumentAggressive } from './services/documentAnalyzer';
import { 
  generateLatexDocument, 
  openInOverleaf, 
  downloadTexFile 
} from './services/latexService';
import { 
  exportToHTML, 
  exportToDOCX, 
  exportToJSON, 
  importFromJSON,
  autoBackupToLocalStorage,
  getAutoBackup,
  BookBackup
} from './services/exportService';

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

  // AI Feedback Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Front Matter State
  const [currentFrontMatterSection, setCurrentFrontMatterSection] = useState<FrontMatterSection | null>(null);
  const [frontMatter, setFrontMatter] = useState<FrontMatter>({
    disclaimer: '<p>Ce livre est destine a apporter un soutien, pour vous aider a comprendre ce que vous pouvez faire au mieux en terme de sante pour ameliorer votre bien-etre.</p><p>Il ne remplace en rien le diagnostic d\'un professionnel de la sante.</p><p>Veuillez consulter un praticien si les troubles persistent au bout des 3 jours de reforme alimentaire.</p>',
    titlePage: {
      title: 'La Sante dans l\'assiette',
      subtitle1: '30 Jours pour se soigner',
      subtitle2: 'Ramadan, ma guerison',
      author: 'Oum Soumayya',
      credentials: 'Praticienne en Hijama - Naturopathie - Acupuncture - Reflexologie - Massotherapie - Micronutrition - Therapie par la chaleur',
      contact: 'monremede@gmail.com'
    }
  });

  // Deleted Chapter Undo State
  const [deletedChapter, setDeletedChapter] = useState<{
    chapter: BookSection;
    partId: string;
    index: number;
  } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const BOOK_TITLE = 'La Sante dans l\'Assiette';
  const BOOK_AUTHOR = 'Oum Soumayya';

  // Load all chapter content from Firebase for export
  const loadAllContentForExport = async (): Promise<BookStructure> => {
    if (!firebaseActive) {
      // If not using Firebase, return current bookData as-is
      return bookData;
    }
    
    // Load content for all chapters
    const hydratedStructure: BookStructure = {
      parts: await Promise.all(bookData.parts.map(async (part) => ({
        ...part,
        chapters: await Promise.all(part.chapters.map(async (chapter) => {
          // If content is already loaded (non-empty), use it
          if (chapter.content && chapter.content.trim() !== '' && chapter.content !== '<p>Collez votre contenu ici...</p>') {
            return chapter;
          }
          // Otherwise, load from Firebase
          try {
            const data = await loadSectionContent(chapter.id);
            if (data && data.content) {
              return { ...chapter, content: data.content, status: data.status };
            }
          } catch (e) {
            console.error(`Failed to load content for ${chapter.title}:`, e);
          }
          return chapter;
        }))
      })))
    };
    
    return hydratedStructure;
  };

  // Auto-backup on data change
  useEffect(() => {
    if (bookData.parts.length > 0) {
      autoBackupToLocalStorage(bookData);
    }
  }, [bookData]);

  // Check for local backup on startup
  useEffect(() => {
    const localBackup = getAutoBackup();
    if (localBackup && !firebaseActive) {
      const backupDate = new Date(localBackup.exportedAt).toLocaleString('fr-FR');
      if (confirm(`Une sauvegarde locale a ete trouvee (${backupDate}).\n\nVoulez-vous la restaurer ?`)) {
        setBookData(localBackup.structure);
        const firstChapter = localBackup.structure.parts[0]?.chapters[0];
        if (firstChapter) {
          setCurrentSectionId(firstChapter.id);
        }
      }
    }
  }, []);

  const handlePrint = () => {
    setViewMode('PRINT');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  // LaTeX/Overleaf PDF Export
  const handleExportLaTeX = async (downloadOnly: boolean = false) => {
    if (isExporting) return;
    
    const totalChapters = bookData.parts.reduce((sum, p) => sum + p.chapters.length, 0);
    if (totalChapters === 0) {
      alert("Aucun chapitre a exporter. Ajoutez du contenu d'abord.");
      return;
    }
    
    // Confirmation dialog for Overleaf
    if (!downloadOnly) {
      const confirmed = confirm(
        "Ceci ouvrira Overleaf.com dans un nouvel onglet.\n\n" +
        "Instructions :\n" +
        "1. Cliquez sur le bouton vert 'Recompile'\n" +
        "2. Attendez quelques secondes\n" +
        "3. Telechargez votre PDF\n\n" +
        "Continuer ?"
      );
      if (!confirmed) return;
    }
    
    setIsExporting(true);
    setExportProgress(0);
    setExportMessage('Chargement du contenu...');
    setShowExportMenu(false);
    
    try {
      // Load all content first
      setExportMessage('Chargement des chapitres...');
      setExportProgress(20);
      const fullBookData = await loadAllContentForExport();
      
      // Generate LaTeX document
      setExportMessage('Generation du document LaTeX...');
      setExportProgress(60);
      const texContent = generateLatexDocument(fullBookData, {
        title: BOOK_TITLE,
        author: BOOK_AUTHOR,
        frontMatter: frontMatter
      });
      
      setExportProgress(90);
      
      if (downloadOnly) {
        // Download .tex file
        setExportMessage('Telechargement du fichier .tex...');
        downloadTexFile(texContent, BOOK_TITLE);
        alert('Fichier .tex telecharge. Utilisez LaTeX (TeX Live, MiKTeX) ou Overleaf pour compiler en PDF.');
      } else {
        // Open in Overleaf
        setExportMessage('Ouverture dans Overleaf...');
        openInOverleaf(texContent);
      }
      
      setExportProgress(100);
    } catch (error) {
      console.error('LaTeX export error:', error);
      alert('Erreur lors de la generation LaTeX. ' + (error instanceof Error ? error.message : ''));
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportMessage('');
    }
  };

  const handleExportDOCX = async () => {
    if (isExporting) return;
    
    const totalChapters = bookData.parts.reduce((sum, p) => sum + p.chapters.length, 0);
    if (totalChapters === 0) {
      alert("Aucun chapitre a exporter.");
      return;
    }
    
    setIsExporting(true);
    setExportProgress(0);
    setExportMessage('Chargement du contenu...');
    setShowExportMenu(false);
    
    try {
      // Load all content first
      const fullBookData = await loadAllContentForExport();
      
      await exportToDOCX(fullBookData, BOOK_TITLE, BOOK_AUTHOR, (progress, message) => {
        setExportProgress(progress);
        setExportMessage(message);
      });
    } catch (error) {
      console.error('DOCX export error:', error);
      alert('Erreur lors de l\'export DOCX.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportMessage('');
    }
  };

  const handleExportHTML = async () => {
    if (isExporting) return;
    
    const totalChapters = bookData.parts.reduce((sum, p) => sum + p.chapters.length, 0);
    if (totalChapters === 0) {
      alert("Aucun chapitre a exporter.");
      return;
    }
    
    setIsExporting(true);
    setExportProgress(0);
    setExportMessage('Chargement du contenu...');
    setShowExportMenu(false);
    
    try {
      // Load all content first
      const fullBookData = await loadAllContentForExport();
      exportToHTML(fullBookData, BOOK_TITLE, BOOK_AUTHOR);
    } catch (error) {
      console.error('HTML export error:', error);
      alert('Erreur lors de l\'export HTML.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportMessage('');
    }
  };

  const handleExportBackup = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    setExportProgress(0);
    setExportMessage('Chargement du contenu...');
    setShowExportMenu(false);
    
    try {
      // Load all content first
      const fullBookData = await loadAllContentForExport();
      exportToJSON(fullBookData, BOOK_TITLE);
      alert('Sauvegarde JSON telechargee. Conservez ce fichier en lieu sur!');
    } catch (error) {
      console.error('Backup export error:', error);
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportMessage('');
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const backup = await importFromJSON(file);
      if (confirm(`Restaurer la sauvegarde du ${new Date(backup.exportedAt).toLocaleString('fr-FR')} ?\n\nCeci remplacera tout le contenu actuel.`)) {
        setBookData(backup.structure);
        const firstChapter = backup.structure.parts[0]?.chapters[0];
        if (firstChapter) {
          setCurrentSectionId(firstChapter.id);
        }
        
        if (firebaseActive) {
          await saveBookStructure(backup.structure);
          for (const part of backup.structure.parts) {
            for (const chapter of part.chapters) {
              try {
                await saveSectionContent(chapter.id, chapter.content, chapter.status);
              } catch (e) {
                console.error('Failed to save chapter:', chapter.title);
              }
            }
          }
        }
        
        alert('Sauvegarde restauree avec succes!');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Erreur lors de l\'import. Verifiez que le fichier est valide.');
    }
    
    event.target.value = '';
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

  // --- Clear All Feature ---
  const handleClearAll = async () => {
    if (!confirm("Supprimer tous les chapitres ? Cette action est irréversible.")) return;
    
    const emptyStructure: BookStructure = {
      parts: [{
        id: 'p1',
        title: 'Mon Livre',
        chapters: []
      }]
    };
    
    setBookData(emptyStructure);
    setCurrentSectionId(null);
    
    if (firebaseActive) {
      try {
        await saveBookStructure(emptyStructure);
        console.log("Firebase cleared successfully");
        alert("Tous les chapitres ont ete supprimes.");
      } catch (e) {
        console.error("Failed to clear Firebase", e);
        alert("Erreur lors de la suppression. Veuillez reessayer.");
      }
    }
  };

  // --- Add Chapter Feature ---
  const handleAddChapter = async () => {
    const chapterTitle = prompt("Titre du nouveau chapitre :", "Nouveau chapitre");
    if (!chapterTitle) return;
    
    const newId = `ch-${Date.now()}`;
    const newChapter = {
      id: newId,
      title: chapterTitle,
      content: '<p>Collez votre contenu ici...</p>',
      status: SectionStatus.DRAFT,
      history: [] as BookVersion[]
    };
    
    let newBookData: BookStructure;
    
    // If no parts exist, create one
    if (bookData.parts.length === 0) {
      newBookData = {
        parts: [{
          id: 'p1',
          title: 'Mon Livre',
          chapters: [newChapter]
        }]
      };
    } else {
      newBookData = {
        parts: bookData.parts.map((part, index) => {
          if (index === 0) {
            return {
              ...part,
              chapters: [...part.chapters, newChapter]
            };
          }
          return part;
        })
      };
    }
    
    setBookData(newBookData);
    setCurrentSectionId(newId);
    
    if (firebaseActive) {
      try {
        await saveSectionContent(newId, newChapter.content, newChapter.status);
        await saveBookStructure(newBookData);
        console.log("Chapter saved to Firebase:", chapterTitle);
      } catch (e) {
        console.error("Failed to save new chapter", e);
        alert("Erreur lors de la sauvegarde. Le chapitre est disponible localement.");
      }
    }
  };

  // --- Reorder Chapters Feature ---
  const handleReorderChapter = async (partId: string, oldIndex: number, newIndex: number) => {
    const newBookData: BookStructure = {
      ...bookData,
      parts: bookData.parts.map(part => {
        if (part.id === partId) {
          return {
            ...part,
            chapters: arrayMove(part.chapters, oldIndex, newIndex)
          };
        }
        return part;
      })
    };

    setBookData(newBookData);

    if (firebaseActive) {
      try {
        await saveBookStructure(newBookData);
        console.log("Chapter order saved to Firebase");
      } catch (e) {
        console.error("Failed to save chapter order", e);
      }
    }
  };

  // --- Front Matter Handlers ---
  const handleSelectFrontMatter = (section: FrontMatterSection) => {
    // Deselect any chapter when selecting front matter
    setCurrentSectionId(null);
    setCurrentFrontMatterSection(section);
  };

  const handleSelectSection = (id: string) => {
    // Deselect front matter when selecting a chapter
    setCurrentFrontMatterSection(null);
    setCurrentSectionId(id);
  };

  const handleUpdateFrontMatter = async (newFrontMatter: FrontMatter) => {
    setFrontMatter(newFrontMatter);
    
    if (firebaseActive) {
      try {
        await saveFrontMatter(newFrontMatter);
        console.log("Front matter saved");
      } catch (e) {
        console.error("Failed to save front matter", e);
      }
    }
  };

  const handleUpdateDisclaimer = async (content: string) => {
    const newFrontMatter = { ...frontMatter, disclaimer: content };
    await handleUpdateFrontMatter(newFrontMatter);
  };

  const handleUpdateTitlePage = async (titlePage: TitlePageData) => {
    const newFrontMatter = { ...frontMatter, titlePage };
    await handleUpdateFrontMatter(newFrontMatter);
  };

  // --- Rename Chapter Feature ---
  const handleRenameChapter = async (chapterId: string, newTitle: string) => {
    const newBookData: BookStructure = {
      ...bookData,
      parts: bookData.parts.map(part => ({
        ...part,
        chapters: part.chapters.map(chapter => {
          if (chapter.id === chapterId) {
            return { ...chapter, title: newTitle };
          }
          return chapter;
        })
      }))
    };

    setBookData(newBookData);

    if (firebaseActive) {
      try {
        await saveBookStructure(newBookData);
        console.log("Chapter renamed to:", newTitle);
      } catch (e) {
        console.error("Failed to save chapter rename", e);
      }
    }
  };

  // --- Delete Chapter Feature ---
  const handleDeleteChapter = async () => {
    if (!currentSectionId) return;

    const currentSection = getCurrentSection();
    if (!currentSection) return;

    // Find the chapter's position for undo
    let chapterPartId: string | null = null;
    let chapterIndex: number = -1;
    let nextSectionId: string | null = null;

    for (const part of bookData.parts) {
      for (let i = 0; i < part.chapters.length; i++) {
        if (part.chapters[i].id === currentSectionId) {
          chapterPartId = part.id;
          chapterIndex = i;
          // Try to select next chapter, or previous if at end
          if (i + 1 < part.chapters.length) {
            nextSectionId = part.chapters[i + 1].id;
          } else if (i > 0) {
            nextSectionId = part.chapters[i - 1].id;
          }
          break;
        }
      }
      if (chapterPartId) break;
    }

    if (!chapterPartId || chapterIndex === -1) return;

    // Clear any existing undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Save for undo (make a deep copy of the chapter)
    setDeletedChapter({
      chapter: { ...currentSection },
      partId: chapterPartId,
      index: chapterIndex
    });

    // Auto-clear undo after 10 seconds
    undoTimeoutRef.current = setTimeout(() => {
      setDeletedChapter(null);
    }, 10000);

    // Remove the chapter from structure
    const newBookData: BookStructure = {
      ...bookData,
      parts: bookData.parts.map(part => ({
        ...part,
        chapters: part.chapters.filter(chapter => chapter.id !== currentSectionId)
      }))
    };

    setBookData(newBookData);
    setCurrentSectionId(nextSectionId);

    if (firebaseActive) {
      try {
        await saveBookStructure(newBookData);
        console.log("Chapter deleted:", currentSection.title);
      } catch (e) {
        console.error("Failed to save chapter deletion", e);
      }
    }
  };

  // --- Undo Delete Chapter ---
  const handleUndoDelete = async () => {
    if (!deletedChapter) return;

    // Clear the timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    const { chapter, partId, index } = deletedChapter;

    // Restore the chapter at its original position
    const newBookData: BookStructure = {
      ...bookData,
      parts: bookData.parts.map(part => {
        if (part.id === partId) {
          const newChapters = [...part.chapters];
          // Insert at original index (or at end if index is beyond current length)
          const insertIndex = Math.min(index, newChapters.length);
          newChapters.splice(insertIndex, 0, chapter);
          return { ...part, chapters: newChapters };
        }
        return part;
      })
    };

    setBookData(newBookData);
    setCurrentSectionId(chapter.id);
    setDeletedChapter(null);

    if (firebaseActive) {
      try {
        await saveBookStructure(newBookData);
        await saveSectionContent(chapter.id, chapter.content, chapter.status);
        console.log("Chapter restored:", chapter.title);
      } catch (e) {
        console.error("Failed to restore chapter", e);
      }
    }
  };

  const handleFirebaseConfig = async (config?: any) => {
    try {
      initFirebase(config);
      setFirebaseActive(true);
      
      const remoteStructure = await loadBookStructure();
      
      // Load front matter
      const remoteFrontMatter = await loadFrontMatter();
      if (remoteFrontMatter) {
        setFrontMatter(remoteFrontMatter);
      }
      
      if (remoteStructure) {
        // Load from Firebase - Firebase is the source of truth
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
        
        // Select first chapter if available
        const firstChapter = hydratedStructure.parts[0]?.chapters[0];
        if (firstChapter) {
          setCurrentSectionId(firstChapter.id);
        } else {
          setCurrentSectionId(null);
        }
      } else {
        // First time - start with empty structure
        const emptyStructure: BookStructure = {
          parts: [{
            id: 'p1',
            title: 'Mon Livre',
            chapters: []
          }]
        };
        await saveBookStructure(emptyStructure);
        setBookData(emptyStructure);
        setCurrentSectionId(null);
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

      {/* AI Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        chapter={getCurrentSection() ? {
          title: getCurrentSection()!.title,
          content: getCurrentSection()!.content
        } : null}
      />

      {/* Welcome Guide */}
      {showGuide && <WelcomeGuide onClose={closeGuide} />}

      {/* Main Layout */}
      <Sidebar
        structure={bookData}
        currentSectionId={currentSectionId}
        currentFrontMatterSection={currentFrontMatterSection}
        onSelectSection={handleSelectSection}
        onSelectFrontMatter={handleSelectFrontMatter}
        onAddChapter={handleAddChapter}
        onClearAll={handleClearAll}
        onReorderChapter={handleReorderChapter}
        onRenameChapter={handleRenameChapter}
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

                {/* AI Feedback Button */}
                <button 
                  onClick={() => setShowFeedbackModal(true)}
                  disabled={!currentSectionId}
                  className="flex items-center gap-2 px-3 py-2 text-purple-600 border border-purple-200 hover:bg-purple-50 rounded transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Assistant Editorial IA"
                >
                  <MessageSquareText className="w-4 h-4" />
                  <span className="hidden sm:inline">Assistant IA</span>
                </button>

                <div className="w-px h-6 bg-gray-300 mx-1"></div>

                <label className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded cursor-pointer text-sm font-medium border border-gray-200">
                    <FileUp className="w-4 h-4" />
                    <span className="hidden sm:inline">Importer DOCX</span>
                    <input type="file" accept=".docx" className="hidden" onChange={handleFileUpload} />
                </label>

                {/* Delete Current Chapter */}
                <button
                    onClick={handleDeleteChapter}
                    disabled={!currentSectionId}
                    className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded text-sm font-medium border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Supprimer ce chapitre"
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Supprimer</span>
                </button>

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

                {/* Export Dropdown */}
                <div className="relative">
                  <button 
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      disabled={isExporting}
                      className={`flex items-center gap-2 px-4 py-2 rounded transition-colors text-sm font-medium ${
                        isExporting 
                          ? 'bg-gray-400 text-white cursor-wait' 
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                  >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {Math.round(exportProgress)}%
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Exporter
                          <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                  </button>
                  
                  {showExportMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase">PDF</div>
                        <button 
                          onClick={() => handleExportLaTeX(false)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                        >
                          <FileText className="w-4 h-4 text-red-600" />
                          <div>
                            <div>PDF via Overleaf</div>
                            <div className="text-xs text-gray-400">Qualite professionnelle</div>
                          </div>
                        </button>
                        <button 
                          onClick={() => handleExportLaTeX(true)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                        >
                          <FileDown className="w-4 h-4 text-red-400" />
                          <div>
                            <div>Telecharger .tex</div>
                            <div className="text-xs text-gray-400">Compilation locale</div>
                          </div>
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase">Autres formats</div>
                        <button 
                          onClick={handleExportDOCX}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                        >
                          <FileText className="w-4 h-4 text-blue-600" />
                          Export DOCX (Word)
                        </button>
                        <button 
                          onClick={handleExportHTML}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                        >
                          <FileText className="w-4 h-4 text-orange-600" />
                          Export HTML
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase">Sauvegarde</div>
                        <button 
                          onClick={handleExportBackup}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                        >
                          <Save className="w-4 h-4 text-green-600" />
                          Sauvegarder (JSON)
                        </button>
                        <label className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 cursor-pointer">
                          <FileUp className="w-4 h-4 text-purple-600" />
                          Restaurer sauvegarde
                          <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
                        </label>
                        <div className="border-t border-gray-100 my-1" />
                        <button 
                          onClick={handlePrint}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                        >
                          <Printer className="w-4 h-4 text-gray-600" />
                          Imprimer (navigateur)
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
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
          {currentFrontMatterSection === 'titlePage' ? (
            // Title Page Form Editor
            <div className="flex-1 overflow-hidden">
              <TitlePageEditor 
                data={frontMatter.titlePage}
                onChange={handleUpdateTitlePage}
              />
            </div>
          ) : currentFrontMatterSection === 'disclaimer' ? (
            // Disclaimer Editor - Uses TipTap via EditorPanel with a fake section
            <>
              <BookPreview 
                section={{
                  id: 'disclaimer',
                  title: 'Mise en garde',
                  content: frontMatter.disclaimer,
                  status: SectionStatus.VALIDATED,
                  history: []
                }} 
                theme={viewMode === 'WEB' ? 'web' : 'print'} 
              />
              <EditorPanel 
                section={{
                  id: 'disclaimer',
                  title: 'Mise en garde',
                  content: frontMatter.disclaimer,
                  status: SectionStatus.VALIDATED,
                  history: []
                }} 
                onUpdate={(_id, content) => handleUpdateDisclaimer(content)} 
              />
            </>
          ) : (
            // Regular Chapter Editor
            <>
              <BookPreview section={getCurrentSection()} theme={viewMode === 'WEB' ? 'web' : 'print'} />
              <EditorPanel section={getCurrentSection()} onUpdate={handleUpdateSection} />
            </>
          )}
        </div>
      </div>

      {/* Undo Delete Toast */}
      {deletedChapter && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-4">
            <span className="text-sm">
              Chapitre "{deletedChapter.chapter.title}" supprime
            </span>
            <button
              onClick={handleUndoDelete}
              className="flex items-center gap-1 px-3 py-1 bg-brand-gold text-gray-900 rounded font-medium text-sm hover:bg-yellow-400 transition-colors"
            >
              <Undo className="w-4 h-4" />
              Annuler
            </button>
            <button
              onClick={() => setDeletedChapter(null)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
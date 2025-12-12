import React, { useRef, useEffect } from 'react';
import { STYLES, SEPARATOR_HTML } from '../constants';
import { 
  Heading1, 
  Heading2, 
  Type, 
  Quote, 
  SeparatorHorizontal,
  Undo,
  Redo,
  Code
} from './Icons';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  isCodeMode: boolean;
  toggleCodeMode: () => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  content, 
  onChange, 
  isCodeMode,
  toggleCodeMode
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync content when it changes externally (e.g., from AI or selection change)
  // But be careful not to reset cursor position if we are typing.
  useEffect(() => {
    if (editorRef.current && !isCodeMode) {
      if (editorRef.current.innerHTML !== content) {
        editorRef.current.innerHTML = content;
      }
    }
  }, [content, isCodeMode]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const applyCustomBlock = (tag: string, className: string) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    // Use default execCommand to create the block element first
    document.execCommand('formatBlock', false, tag);

    // Then find the parent element of the selection to apply class
    // This is a bit of a hack because execCommand doesn't support classes
    const anchorNode = selection.anchorNode;
    if (anchorNode) {
      let element = anchorNode.nodeType === 1 ? anchorNode as HTMLElement : anchorNode.parentElement;
      // Traverse up to find the newly created block tag
      while (element && element.tagName.toLowerCase() !== tag.toLowerCase() && element !== editorRef.current) {
        element = element.parentElement;
      }
      
      if (element && element !== editorRef.current) {
        element.className = className;
        handleInput();
      }
    }
  };

  const insertSeparator = () => {
    if (!editorRef.current) return;
    document.execCommand('insertHTML', false, SEPARATOR_HTML);
    handleInput();
  };

  if (isCodeMode) {
    return (
      <div className="flex-1 flex flex-col h-full relative">
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed text-gray-700 bg-gray-50"
          placeholder="Entrez votre code HTML ici..."
        />
        <button 
           onClick={toggleCodeMode}
           className="absolute bottom-4 right-4 bg-white border border-gray-200 px-3 py-1 rounded shadow-sm text-xs flex items-center gap-2 hover:bg-gray-50"
        >
          <Type className="w-3 h-3" />
          Mode Visuel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* WYSIWYG Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-gray-50 flex-wrap">
        <div className="flex gap-1 border-r border-gray-200 pr-2 mr-2">
          <button onClick={() => document.execCommand('undo')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Annuler">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={() => document.execCommand('redo')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Rétablir">
            <Redo className="w-4 h-4" />
          </button>
        </div>

        <button 
          onClick={() => applyCustomBlock('h1', STYLES.H1)}
          className="p-1.5 hover:bg-brand-green hover:text-white rounded text-gray-700 flex items-center gap-1" 
          title="Titre Principal"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        
        <button 
          onClick={() => applyCustomBlock('h2', STYLES.H2)}
          className="p-1.5 hover:bg-brand-gold hover:text-white rounded text-gray-700 flex items-center gap-1"
          title="Sous-titre"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <button 
          onClick={() => applyCustomBlock('p', STYLES.P)}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          title="Paragraphe standard"
        >
          <Type className="w-4 h-4" />
        </button>

        <button 
          onClick={() => applyCustomBlock('blockquote', STYLES.BLOCKQUOTE)}
          className="p-1.5 hover:bg-brand-sage hover:text-white rounded text-gray-700"
          title="Citation / Encadré"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1"></div>

        <button 
          onClick={insertSeparator}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          title="Insérer Séparateur"
        >
          <SeparatorHorizontal className="w-4 h-4" />
        </button>

        <div className="flex-1"></div>
        
        <button 
           onClick={toggleCodeMode}
           className="text-xs text-gray-400 flex items-center gap-1 hover:text-brand-green px-2"
           title="Voir le code HTML"
        >
          <Code className="w-3 h-3" />
          HTML
        </button>
      </div>

      {/* Editable Area */}
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="flex-1 p-8 focus:outline-none overflow-y-auto rich-editor-content"
        style={{ minHeight: '300px' }}
      />
      
      <div className="bg-yellow-50 text-yellow-800 text-xs p-2 text-center border-t border-yellow-100">
        Astuce : Sélectionnez du texte et cliquez sur les icônes pour appliquer le style du livre.
      </div>
    </div>
  );
};

export default RichTextEditor;

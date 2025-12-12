import React, { useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
// Note: Underline is included in StarterKit, no need to import separately
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Undo, 
  Redo,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  Code,
  Type
} from './Icons';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  isCodeMode: boolean;
  toggleCodeMode: () => void;
  editable?: boolean;
  onEditorReady?: (editor: Editor) => void;
}

// Toolbar Button Component
const ToolbarButton: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, isActive, disabled, title, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      isActive 
        ? 'bg-brand-green text-white' 
        : 'text-gray-600 hover:bg-gray-200'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

// Toolbar Divider
const ToolbarDivider: React.FC = () => (
  <div className="h-6 w-px bg-gray-300 mx-1" />
);

// Editor Toolbar Component
const EditorToolbar: React.FC<{ 
  editor: Editor | null; 
  isCodeMode: boolean;
  toggleCodeMode: () => void;
}> = ({ editor, isCodeMode, toggleCodeMode }) => {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 flex-wrap">
      {/* History */}
      <div className="flex gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Annuler (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rétablir (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Text Formatting */}
      <div className="flex gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Gras (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italique (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Souligné (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Alignment */}
      <div className="flex gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Aligner à gauche"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Centrer"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justifier"
        >
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="flex-1" />

      {/* Code Mode Toggle */}
      <button
        onClick={toggleCodeMode}
        className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${
          isCodeMode 
            ? 'bg-brand-green text-white' 
            : 'text-gray-500 hover:text-brand-green hover:bg-gray-100'
        }`}
        title="Basculer en mode HTML"
      >
        <Code className="w-3 h-3" />
        HTML
      </button>
    </div>
  );
};

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  isCodeMode,
  toggleCodeMode,
  editable = true,
  onEditorReady,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Commencez à écrire...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      // Underline is already included in StarterKit
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-stone max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  // Sync content when it changes externally
  useEffect(() => {
    if (editor && !isCodeMode) {
      const currentContent = editor.getHTML();
      if (currentContent !== content) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [content, editor, isCodeMode]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Code mode (raw HTML editing)
  if (isCodeMode) {
    return (
      <div className="flex-1 flex flex-col h-full relative">
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed text-gray-700 bg-gray-50 border-none"
          placeholder="Entrez votre code HTML ici..."
          spellCheck={false}
        />
        <button
          onClick={toggleCodeMode}
          className="absolute bottom-4 right-4 bg-white border border-gray-200 px-3 py-1.5 rounded shadow-sm text-xs flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <Type className="w-3 h-3" />
          Mode Visuel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <EditorToolbar 
        editor={editor} 
        isCodeMode={isCodeMode}
        toggleCodeMode={toggleCodeMode}
      />
      
      <div className="flex-1 overflow-y-auto">
        <EditorContent 
          editor={editor} 
          className="h-full"
        />
      </div>

      <div className="bg-amber-50 text-amber-800 text-xs p-2 text-center border-t border-amber-100">
        Astuce: Utilisez la barre d'outils pour formater le texte. Ctrl+Z pour annuler.
      </div>
    </div>
  );
};

export default TipTapEditor;

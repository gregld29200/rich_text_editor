import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
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
  Type,
  Table2
} from './Icons';
import TablePreviewModal from './TablePreviewModal';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  isCodeMode: boolean;
  toggleCodeMode: () => void;
  editable?: boolean;
  onEditorReady?: (editor: Editor) => void;
}

// Floating button state for list conversion
interface FloatingButtonState {
  visible: boolean;
  x: number;
  y: number;
  listHtml: string;
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
  onConvertList: () => void;
  hasListSelected: boolean;
}> = ({ editor, isCodeMode, toggleCodeMode, onConvertList, hasListSelected }) => {
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
          title="Retablir (Ctrl+Y)"
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
          title="Souligne (Ctrl+U)"
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
          title="Aligner a gauche"
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

      <ToolbarDivider />

      {/* Convert to Table Button - visible when cursor is in a list */}
      <button
        onClick={onConvertList}
        disabled={!hasListSelected}
        title="Convertir la liste en tableau"
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
          hasListSelected
            ? 'bg-brand-gold text-white hover:bg-brand-gold/90'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        <Table2 className="w-3.5 h-3.5" />
        Tableau
      </button>

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
  // Track if cursor is in a list
  const [isInList, setIsInList] = useState(false);
  const [currentListHtml, setCurrentListHtml] = useState('');

  // Table preview modal state
  const [showTableModal, setShowTableModal] = useState(false);
  const [selectedListHtml, setSelectedListHtml] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Commencez a ecrire...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      // Table extensions
      Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
        HTMLAttributes: {
          class: 'styled-table',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'table-cell',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'table-header',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      checkIfInList(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      checkIfInList(editor);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-stone max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  // Check if cursor is inside a list
  const checkIfInList = useCallback((editorInstance: Editor) => {
    const isInBulletList = editorInstance.isActive('bulletList');
    const isInOrderedList = editorInstance.isActive('orderedList');
    const inList = isInBulletList || isInOrderedList;
    
    setIsInList(inList);

    if (inList) {
      // Get the list HTML from the DOM
      const { view } = editorInstance;
      const { from } = view.state.selection;
      const domAtPos = view.domAtPos(from);
      
      if (domAtPos && domAtPos.node) {
        let node: Node | null = domAtPos.node;
        // Traverse up to find ul/ol
        while (node && node.nodeName !== 'UL' && node.nodeName !== 'OL') {
          node = node.parentNode;
        }
        if (node && (node.nodeName === 'UL' || node.nodeName === 'OL')) {
          setCurrentListHtml((node as Element).outerHTML);
        }
      }
    } else {
      setCurrentListHtml('');
    }
  }, []);

  // Initial check when editor is ready
  useEffect(() => {
    if (editor) {
      checkIfInList(editor);
    }
  }, [editor, checkIfInList]);

  // Handle convert to table button click
  const handleConvertToTable = useCallback(() => {
    if (!currentListHtml) return;
    setSelectedListHtml(currentListHtml);
    setShowTableModal(true);
  }, [currentListHtml]);

  // Handle table insertion
  const handleTableAccept = useCallback((tableHtml: string) => {
    if (!editor) return;

    // Find and replace the list with the table
    const { state } = editor;
    const { doc } = state;
    const { from } = state.selection;
    
    let listPos: number | null = null;
    let listNodeSize: number = 0;

    // Find the list containing the cursor
    doc.descendants((node, pos) => {
      if ((node.type.name === 'bulletList' || node.type.name === 'orderedList')) {
        // Check if cursor is within this list
        if (from >= pos && from <= pos + node.nodeSize) {
          listPos = pos;
          listNodeSize = node.nodeSize;
          return false; // Stop traversal
        }
      }
    });

    if (listPos !== null) {
      // Delete the list and insert the table HTML
      editor
        .chain()
        .focus()
        .deleteRange({ from: listPos, to: listPos + listNodeSize })
        .insertContentAt(listPos, tableHtml)
        .run();
    } else {
      // Fallback: insert at current position
      editor
        .chain()
        .focus()
        .insertContent(tableHtml)
        .run();
    }

    setShowTableModal(false);
    setSelectedListHtml('');
    setIsInList(false);
    setCurrentListHtml('');
  }, [editor]);

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
        onConvertList={handleConvertToTable}
        hasListSelected={isInList}
      />
      
      <div className="flex-1 overflow-y-auto">
        <EditorContent 
          editor={editor} 
          className="h-full"
        />
      </div>

      <div className="bg-amber-50 text-amber-800 text-xs p-2 text-center border-t border-amber-100">
        {isInList 
          ? "Liste detectee ! Cliquez sur le bouton 'Tableau' dans la barre d'outils pour convertir."
          : "Astuce: Placez le curseur dans une liste pour la convertir en tableau."
        }
      </div>

      {/* Table Preview Modal */}
      <TablePreviewModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onAccept={handleTableAccept}
        listHtml={selectedListHtml}
      />
    </div>
  );
};

export default TipTapEditor;

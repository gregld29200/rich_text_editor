import React, { useState, useRef, useEffect } from 'react';
import { BookStructure, SectionStatus, FrontMatterSection } from '../types';
import { ChevronRight, ChevronDown, FileText, CheckCircle, Clock, BookOpen, Plus, GripVertical, Check, X, ClipboardList, BookCopy, ListTree } from './Icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SidebarProps {
  structure: BookStructure;
  currentSectionId: string | null;
  currentFrontMatterSection: FrontMatterSection | null;
  onSelectSection: (id: string) => void;
  onSelectFrontMatter: (section: FrontMatterSection) => void;
  onAddChapter: () => void;
  onReorderChapter?: (partId: string, oldIndex: number, newIndex: number) => void;
  onMoveChapter?: (chapterId: string, fromPartId: string, toPartId: string, newIndex: number) => void;
  onRenameChapter?: (chapterId: string, newTitle: string) => void;
}

interface SortableChapterProps {
  chapter: { id: string; title: string; status: SectionStatus };
  isSelected: boolean;
  onSelect: () => void;
  onRename?: (newTitle: string) => void;
  getStatusIcon: (status: SectionStatus) => React.ReactNode;
}

const SortableChapter: React.FC<SortableChapterProps> = ({
  chapter,
  isSelected,
  onSelect,
  onRename,
  getStatusIcon
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(chapter.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(chapter.title);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== chapter.title && onRename) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(chapter.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 group ${isDragging ? 'z-50' : ''}`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing transition-opacity"
        title="Glisser pour réorganiser"
      >
        <GripVertical className="w-3 h-3 text-gray-400" />
      </button>

      {/* Chapter Button/Input */}
      {isEditing ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="flex-1 px-2 py-1 text-sm border border-brand-green rounded focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
          <button
            onClick={handleSave}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
            title="Sauvegarder"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="Annuler"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={onSelect}
          onDoubleClick={handleDoubleClick}
          className={`flex-1 flex items-center justify-between text-left p-2 rounded text-sm transition-colors ${
            isSelected
              ? 'bg-brand-sage text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-brand-green'
          }`}
          title="Double-cliquer pour renommer"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <FileText className="w-3 h-3 flex-shrink-0" />
            <span className="truncate font-body">{chapter.title}</span>
          </div>
          <div title={chapter.status}>
            {getStatusIcon(chapter.status)}
          </div>
        </button>
      )}
    </div>
  );
};

// Helper to find which part a chapter belongs to
const findPartForChapter = (structure: BookStructure, chapterId: string): string | null => {
  for (const part of structure.parts) {
    if (part.chapters.some(c => c.id === chapterId)) {
      return part.id;
    }
  }
  return null;
};

// Droppable wrapper for each part's chapter list
const DroppablePartArea: React.FC<{
  partId: string;
  isOver: boolean;
  children: React.ReactNode;
}> = ({ partId, isOver, children }) => {
  const { setNodeRef } = useDroppable({ id: `part-${partId}` });
  
  return (
    <div
      ref={setNodeRef}
      className={`ml-4 mt-1 space-y-1 border-l pl-2 transition-colors ${
        isOver ? 'border-brand-gold bg-brand-gold/5' : 'border-gray-100'
      }`}
    >
      {children}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  structure,
  currentSectionId,
  currentFrontMatterSection,
  onSelectSection,
  onSelectFrontMatter,
  onAddChapter,
  onReorderChapter,
  onMoveChapter,
  onRenameChapter
}) => {
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({
    'p1': true,
    'p2': true
  });
  const [frontMatterExpanded, setFrontMatterExpanded] = useState(true);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [overPartId, setOverPartId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Get all chapter IDs across all parts for a single SortableContext
  const allChapterIds = structure.parts.flatMap(part => part.chapters.map(c => c.id));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveChapterId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverPartId(null);
      return;
    }

    // Check if hovering over a part drop zone
    const overId = over.id as string;
    if (overId.startsWith('part-')) {
      setOverPartId(overId.replace('part-', ''));
    } else {
      // Hovering over a chapter - find its part
      const partId = findPartForChapter(structure, overId);
      setOverPartId(partId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveChapterId(null);
    setOverPartId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const fromPartId = findPartForChapter(structure, activeId);
    if (!fromPartId) return;

    // Determine target part and position
    let toPartId: string;
    let targetChapterId: string | null = null;

    if (overId.startsWith('part-')) {
      // Dropped on empty part area - add to end
      toPartId = overId.replace('part-', '');
    } else {
      // Dropped on a chapter
      toPartId = findPartForChapter(structure, overId) || fromPartId;
      targetChapterId = overId;
    }

    if (fromPartId === toPartId) {
      // Same part - reorder
      const part = structure.parts.find(p => p.id === fromPartId);
      if (part && onReorderChapter) {
        const oldIndex = part.chapters.findIndex(c => c.id === activeId);
        const newIndex = part.chapters.findIndex(c => c.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          onReorderChapter(fromPartId, oldIndex, newIndex);
        }
      }
    } else {
      // Different part - move chapter
      if (onMoveChapter) {
        const toPart = structure.parts.find(p => p.id === toPartId);
        let newIndex = toPart?.chapters.length || 0;
        
        if (targetChapterId) {
          const targetIndex = toPart?.chapters.findIndex(c => c.id === targetChapterId);
          if (targetIndex !== undefined && targetIndex !== -1) {
            newIndex = targetIndex;
          }
        }
        
        onMoveChapter(activeId, fromPartId, toPartId, newIndex);
      }
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
        {/* Front Matter Section */}
        <div className="select-none">
          <button
            onClick={() => setFrontMatterExpanded(!frontMatterExpanded)}
            className="flex items-center gap-2 w-full text-left p-2 hover:bg-brand-gold/10 rounded text-brand-gold font-semibold"
          >
            {frontMatterExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="truncate">Pages liminaires</span>
          </button>

          {frontMatterExpanded && (
            <div className="ml-4 mt-1 space-y-1 border-l border-brand-gold/30 pl-2">
              {/* Mise en garde (Disclaimer) */}
              <button
                onClick={() => onSelectFrontMatter('disclaimer')}
                className={`w-full flex items-center gap-2 text-left p-2 rounded text-sm transition-colors ${
                  currentFrontMatterSection === 'disclaimer'
                    ? 'bg-brand-gold text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-brand-gold'
                }`}
              >
                <ClipboardList className="w-3 h-3 flex-shrink-0" />
                <span className="truncate font-body">Mise en garde</span>
              </button>

              {/* Page de titre (Title Page) */}
              <button
                onClick={() => onSelectFrontMatter('titlePage')}
                className={`w-full flex items-center gap-2 text-left p-2 rounded text-sm transition-colors ${
                  currentFrontMatterSection === 'titlePage'
                    ? 'bg-brand-gold text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-brand-gold'
                }`}
              >
                <BookCopy className="w-3 h-3 flex-shrink-0" />
                <span className="truncate font-body">Page de titre</span>
              </button>

              {/* Table des matieres (Table of Contents) */}
              <button
                onClick={() => onSelectFrontMatter('tableOfContents')}
                className={`w-full flex items-center gap-2 text-left p-2 rounded text-sm transition-colors ${
                  currentFrontMatterSection === 'tableOfContents'
                    ? 'bg-brand-gold text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-brand-gold'
                }`}
              >
                <ListTree className="w-3 h-3 flex-shrink-0" />
                <span className="truncate font-body">Table des matieres</span>
              </button>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-gray-200"></div>

        {/* Book Parts - Single DndContext for cross-section drag */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={allChapterIds}
            strategy={verticalListSortingStrategy}
          >
            {structure.parts.map((part) => (
              <div key={part.id} className="select-none">
                <button
                  onClick={() => togglePart(part.id)}
                  className={`flex items-center gap-2 w-full text-left p-2 hover:bg-gray-50 rounded font-semibold transition-colors ${
                    overPartId === part.id && activeChapterId && findPartForChapter(structure, activeChapterId) !== part.id
                      ? 'bg-brand-gold/20 text-brand-gold'
                      : 'text-brand-green'
                  }`}
                >
                  {expandedParts[part.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="truncate">{part.title}</span>
                </button>

                {expandedParts[part.id] && (
                  <DroppablePartArea 
                    partId={part.id} 
                    isOver={overPartId === part.id && activeChapterId !== null && findPartForChapter(structure, activeChapterId) !== part.id}
                  >
                    {part.chapters.map((chapter) => (
                      <SortableChapter
                        key={chapter.id}
                        chapter={chapter}
                        isSelected={currentSectionId === chapter.id}
                        onSelect={() => onSelectSection(chapter.id)}
                        onRename={onRenameChapter ? (newTitle) => onRenameChapter(chapter.id, newTitle) : undefined}
                        getStatusIcon={getStatusIcon}
                      />
                    ))}
                  </DroppablePartArea>
                )}
              </div>
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onAddChapter}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-green text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Ajouter un chapitre
        </button>
      </div>

      <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-400 text-center font-body">
        v1.0.0
      </div>
    </div>
  );
};

export default Sidebar;

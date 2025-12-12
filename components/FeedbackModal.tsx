import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Bot, Sparkles } from './Icons';
import { 
  analyzeChapter, 
  continueConversation, 
  FeedbackMessage,
  ChapterContext,
  isFeedbackAvailable
} from '../services/feedbackService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: ChapterContext | null;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, chapter }) => {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset when chapter changes
  useEffect(() => {
    if (chapter && chapter.title !== currentChapterId) {
      setMessages([]);
      setHasAnalyzed(false);
      setCurrentChapterId(chapter.title);
    }
  }, [chapter?.title]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && hasAnalyzed) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, hasAnalyzed]);

  const handleAnalyze = async () => {
    if (!chapter || isLoading) return;
    
    if (!isFeedbackAvailable()) {
      alert('Cle API Gemini non configuree. Allez dans Parametres pour ajouter votre cle API.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Analyse en cours...');
    
    try {
      const feedback = await analyzeChapter(chapter, setLoadingMessage);
      
      setMessages([{
        role: 'assistant',
        content: feedback,
        timestamp: Date.now()
      }]);
      setHasAnalyzed(true);
      
    } catch (error) {
      console.error('Analysis error:', error);
      setMessages([{
        role: 'assistant',
        content: `Erreur lors de l'analyse: ${error instanceof Error ? error.message : 'Erreur inconnue'}. Verifiez votre cle API dans les Parametres.`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !chapter || isLoading) return;
    
    const userMessage: FeedbackMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      const response = await continueConversation(
        chapter,
        [...messages, userMessage],
        userMessage.content
      );
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      }]);
      
    } catch (error) {
      console.error('Conversation error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown rendering for feedback
    return text
      // Headers
      .replace(/^## (.+)$/gm, '<h3 class="text-lg font-semibold text-brand-green mt-4 mb-2">$1</h3>')
      .replace(/^### (.+)$/gm, '<h4 class="text-md font-semibold text-gray-700 mt-3 mb-1">$1</h4>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Lists
      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
      // Code
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br/>');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-brand-green" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Assistant Editorial</h2>
              <p className="text-sm text-gray-500">
                {chapter ? `Analyse: ${chapter.title}` : 'Selectionnez un chapitre'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!hasAnalyzed && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-brand-green" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Analyse du chapitre
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                L'assistant va analyser "{chapter?.title}" et vous fournir des retours sur le style, 
                la grammaire, la structure et le contenu.
              </p>
              <button
                onClick={handleAnalyze}
                disabled={!chapter}
                className="px-6 py-3 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Analyser ce chapitre
              </button>
              <p className="text-xs text-gray-400 mt-4">
                L'analyse utilise l'API Gemini et peut prendre quelques secondes.
              </p>
            </div>
          )}

          {isLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-brand-green animate-spin mb-4" />
              <p className="text-gray-600">{loadingMessage || 'Analyse en cours...'}</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-brand-green text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-green" />
                <span className="text-gray-600 text-sm">Reflexion...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {hasAnalyzed && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez une question sur le chapitre..."
                className="flex-1 resize-none border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green max-h-32"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="p-3 bg-brand-green text-white rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Appuyez sur Entree pour envoyer, Maj+Entree pour un saut de ligne
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;

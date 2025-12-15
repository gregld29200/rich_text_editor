import React, { useState, useEffect } from 'react';
import { X, Loader2, Table2, RefreshCw, AlertCircle } from './Icons';
import { 
  TableData, 
  TableTemplate,
  TableTemplateConfig 
} from '../types';
import {
  analyzeListForTable,
  convertListWithTemplate,
  generateTableHtml,
  TABLE_TEMPLATES,
  isTableConversionAvailable,
  getListItemCount
} from '../services/tableService';

interface TablePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (tableHtml: string) => void;
  listHtml: string;
}

type ModalState = 'loading' | 'preview' | 'fallback' | 'error';

const TablePreviewModal: React.FC<TablePreviewModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  listHtml
}) => {
  const [state, setState] = useState<ModalState>('loading');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Analyse en cours...');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TableTemplate>('2-cols');

  const itemCount = getListItemCount(listHtml);

  // Analyze list when modal opens
  useEffect(() => {
    if (!isOpen || !listHtml) return;

    const analyze = async () => {
      setState('loading');
      setLoadingMessage('Analyse de la structure...');

      // Check if AI is available
      if (!isTableConversionAvailable()) {
        setState('fallback');
        return;
      }

      try {
        const data = await analyzeListForTable(listHtml, setLoadingMessage);
        setTableData(data);
        setState('preview');
      } catch (error) {
        console.error('Analysis failed:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue');
        setState('fallback');
      }
    };

    analyze();
  }, [isOpen, listHtml]);

  // Handle retry with AI
  const handleRetry = async () => {
    setState('loading');
    setLoadingMessage('Nouvelle tentative...');

    try {
      const data = await analyzeListForTable(listHtml, setLoadingMessage);
      setTableData(data);
      setState('preview');
    } catch (error) {
      console.error('Retry failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue');
      setState('fallback');
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: TableTemplate) => {
    setSelectedTemplate(template);
    try {
      const data = convertListWithTemplate(listHtml, template);
      setTableData(data);
      setState('preview');
    } catch (error) {
      console.error('Template conversion failed:', error);
      setErrorMessage('Erreur lors de la conversion');
    }
  };

  // Handle accept
  const handleAccept = () => {
    if (!tableData) return;
    const html = generateTableHtml(tableData);
    onAccept(html);
    onClose();
  };

  // Reset state on close
  const handleClose = () => {
    setState('loading');
    setTableData(null);
    setErrorMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-sage/20 flex items-center justify-center">
              <Table2 className="w-5 h-5 text-brand-green" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {state === 'fallback' ? 'Choisir un format' : 'Apercu du tableau'}
              </h2>
              <p className="text-sm text-gray-500">
                {itemCount} element{itemCount > 1 ? 's' : ''} detecte{itemCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading State */}
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="w-10 h-10 text-brand-green animate-spin mb-4" />
              <p className="text-gray-600">{loadingMessage}</p>
              <p className="text-xs text-gray-400 mt-2">
                Utilisation de Gemini pour analyser la structure...
              </p>
            </div>
          )}

          {/* Fallback State - Template Selection */}
          {state === 'fallback' && (
            <div className="space-y-6">
              {errorMessage && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800 font-medium">
                      L'analyse automatique a echoue
                    </p>
                    <p className="text-xs text-amber-600 mt-1">{errorMessage}</p>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="ml-auto flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reessayer
                  </button>
                </div>
              )}

              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Choisissez un format de tableau :
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {TABLE_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`p-4 border-2 rounded-lg transition-all hover:border-brand-green hover:bg-brand-green/5 ${
                      selectedTemplate === template.id
                        ? 'border-brand-green bg-brand-green/5'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-semibold text-gray-800 mb-1">
                        {template.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {template.description}
                      </div>
                      {/* Mini preview */}
                      <div className="mt-3 flex justify-center">
                        <div className="flex gap-0.5">
                          {Array.from({ length: template.columns }).map((_, i) => (
                            <div
                              key={i}
                              className="w-6 h-8 bg-brand-sage/30 border border-brand-sage/50 rounded-sm"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview State */}
          {state === 'preview' && tableData && (
            <div className="space-y-4">
              {/* Info bar */}
              <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                <span>
                  {tableData.headers.length} colonnes • {tableData.rows.length} lignes
                </span>
                <button
                  onClick={() => setState('fallback')}
                  className="text-brand-green hover:underline text-xs"
                >
                  Changer de format
                </button>
              </div>

              {/* Table Preview */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="styled-table w-full">
                    <thead>
                      <tr>
                        {tableData.headers.map((header, i) => (
                          <th key={i} scope="col">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.cells.map((cell, cellIndex) => (
                            <td key={cellIndex}>
                              {cell.subtitle ? (
                                <>
                                  <span className="cell-title">{cell.content}</span>
                                  <br />
                                  <span className="cell-subtitle">{cell.subtitle}</span>
                                </>
                              ) : (
                                <span className="cell-content">{cell.content}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Annuler
          </button>
          {(state === 'preview' || (state === 'fallback' && tableData)) && (
            <button
              onClick={handleAccept}
              disabled={!tableData}
              className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Table2 className="w-4 h-4" />
              Inserer le tableau
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TablePreviewModal;

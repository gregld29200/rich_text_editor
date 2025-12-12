import React, { useState, useEffect } from 'react';
import { Save, X, RotateCcw, Key, CheckCircle, AlertCircle, Loader2 } from './Icons';
import { 
  getApiKey, 
  saveApiKey, 
  clearApiKey, 
  getMaskedApiKey, 
  isValidApiKeyFormat,
  testApiKey 
} from '../utils/apiKeyManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFirebase: (config: any) => void;
  hasFirebase: boolean;
  onResetContent: () => void;
  onApiKeyChange?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSaveFirebase, 
  hasFirebase, 
  onResetContent,
  onApiKeyChange 
}) => {
  const [configStr, setConfigStr] = useState('');
  const [error, setError] = useState('');
  
  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'none' | 'saved' | 'testing' | 'valid' | 'invalid'>('none');
  const [apiKeyError, setApiKeyError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Check if we have a saved API key
      const existingKey = getApiKey();
      if (existingKey) {
        setApiKeyStatus('saved');
        setApiKey(''); // Don't show the actual key
      } else {
        setApiKeyStatus('none');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveFirebase = () => {
    try {
      let cleanStr = configStr.trim();
      
      // Remove import statements
      cleanStr = cleanStr.replace(/import\s+.*?;/gs, '');
      
      // Remove comments
      cleanStr = cleanStr.replace(/\/\/.*$/gm, '');
      cleanStr = cleanStr.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // Remove everything before firebaseConfig = 
      const configMatch = cleanStr.match(/firebaseConfig\s*=\s*(\{[\s\S]*?\});?/);
      if (configMatch) {
        cleanStr = configMatch[1];
      } else if (cleanStr.includes('{')) {
        // Try to extract just the object
        const startIdx = cleanStr.indexOf('{');
        const endIdx = cleanStr.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          cleanStr = cleanStr.substring(startIdx, endIdx + 1);
        }
      }
      
      // Remove trailing semicolon
      cleanStr = cleanStr.trim();
      if (cleanStr.endsWith(';')) {
        cleanStr = cleanStr.slice(0, -1);
      }
      
      // Remove const app = ... and other code after the object
      cleanStr = cleanStr.replace(/\}\s*;?\s*(const|let|var|\/\/)[\s\S]*/g, '}');

      // Convert JS object to valid JSON (add quotes to keys)
      cleanStr = cleanStr.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
      
      // Remove trailing commas before closing braces
      cleanStr = cleanStr.replace(/,(\s*})/g, '$1');

      const config = JSON.parse(cleanStr);
      
      // Validate that we have required Firebase fields
      if (!config.apiKey || !config.projectId) {
        throw new Error('Missing required fields');
      }
      
      onSaveFirebase(config);
      onClose();
    } catch (e) {
      console.error('Firebase config parse error:', e);
      setError("Format invalide. Copiez le bloc de configuration Firebase complet ou juste l'objet { apiKey: ..., projectId: ... }");
    }
  };

  const handleSaveApiKey = async () => {
    setApiKeyError('');
    
    if (!apiKey.trim()) {
      setApiKeyError('Veuillez entrer une clé API');
      return;
    }

    if (!isValidApiKeyFormat(apiKey)) {
      setApiKeyError('Format de clé invalide. Les clés Gemini commencent par "AIza"');
      return;
    }

    setApiKeyStatus('testing');

    // Test the API key
    const result = await testApiKey(apiKey);
    
    if (result.valid) {
      saveApiKey(apiKey);
      setApiKeyStatus('valid');
      setApiKey('');
      onApiKeyChange?.();
      
      // Reset to saved state after a delay
      setTimeout(() => {
        setApiKeyStatus('saved');
      }, 2000);
    } else {
      setApiKeyStatus('invalid');
      setApiKeyError(result.error || 'Clé API invalide');
    }
  };

  const handleClearApiKey = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer la clé API ?')) {
      clearApiKey();
      setApiKeyStatus('none');
      setApiKey('');
      onApiKeyChange?.();
    }
  };

  const getApiKeyStatusDisplay = () => {
    switch (apiKeyStatus) {
      case 'saved':
        return (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Clé enregistrée: {getMaskedApiKey()}</span>
          </div>
        );
      case 'testing':
        return (
          <div className="flex items-center gap-2 text-blue-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Test de la clé en cours...</span>
          </div>
        );
      case 'valid':
        return (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Clé valide et enregistrée!</span>
          </div>
        );
      case 'invalid':
        return (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{apiKeyError}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Aucune clé configurée</span>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-title font-bold text-brand-green">Paramètres & Connexion</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {/* API Key Section */}
          <div className="mb-6 pb-6 border-b border-gray-100">
            <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-brand-gold" />
              Clé API Gemini (IA & Audio)
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Nécessaire pour les fonctionnalités IA et la lecture audio.
              <a 
                href="https://aistudio.google.com/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand-green hover:underline ml-1"
              >
                Obtenir une clé
              </a>
            </p>
            
            {/* Status Display */}
            <div className="mb-3">
              {getApiKeyStatusDisplay()}
            </div>
            
            {/* Input Field */}
            <div className="flex gap-2">
              <input 
                type={showApiKey ? "text" : "password"}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm font-mono bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-sage"
                placeholder="AIza..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setApiKeyError('');
                  if (apiKeyStatus === 'invalid') setApiKeyStatus('none');
                }}
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 text-sm"
              >
                {showApiKey ? 'Masquer' : 'Voir'}
              </button>
            </div>
            
            {apiKeyError && apiKeyStatus !== 'invalid' && (
              <p className="text-red-500 text-xs mt-1">{apiKeyError}</p>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSaveApiKey}
                disabled={apiKeyStatus === 'testing' || !apiKey.trim()}
                className="flex-1 bg-brand-green text-white px-4 py-2 rounded hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {apiKeyStatus === 'testing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {apiKeyStatus === 'testing' ? 'Test...' : 'Enregistrer'}
              </button>
              
              {apiKeyStatus === 'saved' && (
                <button
                  onClick={handleClearApiKey}
                  className="px-4 py-2 border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors"
                >
                  Supprimer
                </button>
              )}
            </div>
            
            <p className="text-xs text-gray-400 mt-2">
              La clé est stockée localement dans votre navigateur.
            </p>
          </div>

          {/* Firebase Section */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${hasFirebase ? 'bg-green-500' : 'bg-red-500'}`}></span>
              Firebase (Backend)
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              Allez dans votre console Firebase {'>'} Project Settings {'>'} General {'>'} Web App.
              <br/>
              Copiez le bloc de configuration complet et collez-le ci-dessous.
            </p>
            <textarea 
              className="w-full h-32 border border-gray-300 rounded p-2 text-xs font-mono bg-gray-50"
              placeholder='const firebaseConfig = { ... };'
              value={configStr}
              onChange={(e) => setConfigStr(e.target.value)}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            
            <button 
              onClick={handleSaveFirebase}
              className="mt-2 px-4 py-2 bg-brand-green text-white rounded hover:bg-opacity-90 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Connecter Firebase
            </button>
          </div>
          
          <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 mb-6">
            <strong>Note sur les données :</strong> Une fois connecté, la structure du livre et le contenu des chapitres seront synchronisés dans le cloud (Firestore).
          </div>

          <div className="border-t border-gray-100 pt-4">
             <h3 className="font-bold text-gray-700 mb-2">Actions de maintenance</h3>
             <button 
               onClick={onResetContent}
               className="w-full border border-red-200 bg-red-50 text-red-600 px-4 py-3 rounded flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
             >
               <RotateCcw className="w-4 h-4" />
               Réinitialiser le contenu par défaut
             </button>
             <p className="text-xs text-gray-400 mt-1 text-center">Écrase le contenu de la base de données avec le modèle initial.</p>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-100 flex justify-end">
           <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
             Fermer
           </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

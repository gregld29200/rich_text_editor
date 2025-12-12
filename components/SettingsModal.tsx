import React, { useState, useEffect } from 'react';
import { Save, X, RotateCcw } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFirebase: (config: any) => void;
  hasFirebase: boolean;
  onResetContent: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSaveFirebase, hasFirebase, onResetContent }) => {
  const [configStr, setConfigStr] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      let cleanStr = configStr.trim();
      
      // 1. Remove "const firebaseConfig =" or "var config =" if present
      if (cleanStr.includes('=')) {
        cleanStr = cleanStr.substring(cleanStr.indexOf('=') + 1);
      }
      
      // 2. Remove trailing semicolon
      if (cleanStr.endsWith(';')) {
        cleanStr = cleanStr.slice(0, -1);
      }

      // 3. Try to make it valid JSON if keys aren't quoted (standard JS object)
      // This is a simple regex to quote unquoted keys
      cleanStr = cleanStr.replace(/(\w+):/g, '"$1":');
      // Remove trailing commas which are valid in JS but not JSON
      cleanStr = cleanStr.replace(/,(\s*})/g, '$1');

      const config = JSON.parse(cleanStr);
      onSaveFirebase(config);
      onClose();
    } catch (e) {
      console.error(e);
      setError("Format invalide. Copiez simplement l'objet { ... } ou le bloc de code complet fourni par Firebase.");
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
              className="w-full h-40 border border-gray-300 rounded p-2 text-xs font-mono bg-gray-50"
              placeholder='const firebaseConfig = { ... };'
              value={configStr}
              onChange={(e) => setConfigStr(e.target.value)}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
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
        
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
           <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Annuler</button>
           <button onClick={handleSave} className="px-4 py-2 bg-brand-green text-white rounded hover:bg-opacity-90 flex items-center gap-2">
             <Save className="w-4 h-4" />
             Connecter
           </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
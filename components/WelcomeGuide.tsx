import React, { useState, useEffect } from 'react';
import { X, BookOpen, Edit3, Eye, Settings, Volume2, Download, ChevronRight } from './Icons';

interface WelcomeGuideProps {
  onClose: () => void;
}

const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Bienvenue dans l'Éditeur",
      icon: <BookOpen className="w-8 h-8 text-brand-gold" />,
      content: (
        <div className="space-y-3 text-gray-600">
          <p>
            Cet éditeur vous permet de <strong>visualiser</strong>, <strong>modifier</strong> et <strong>exporter</strong> votre livre 
            "La Santé dans l'Assiette".
          </p>
          <p>
            Toutes vos modifications sont <strong>automatiquement sauvegardées</strong> dans le cloud.
          </p>
        </div>
      )
    },
    {
      title: "Navigation",
      icon: <BookOpen className="w-8 h-8 text-brand-gold" />,
      content: (
        <div className="space-y-3 text-gray-600">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-semibold text-brand-green mb-2">Barre latérale (gauche)</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Cliquez sur une <strong>partie</strong> pour la déplier</li>
              <li>Cliquez sur un <strong>chapitre</strong> pour le sélectionner</li>
              <li>Le chapitre actif est surligné en vert</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Modes d'affichage",
      icon: <Eye className="w-8 h-8 text-brand-gold" />,
      content: (
        <div className="space-y-3 text-gray-600">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-semibold text-brand-green mb-1">Vue Riche</p>
              <p className="text-sm">Affichage web avec couleurs, dégradés et effets visuels.</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-semibold text-brand-green mb-1">Vue Impression</p>
              <p className="text-sm">Aperçu pour Kindle/PDF au format 6×9 pouces.</p>
            </div>
          </div>
          <p className="text-sm">
            Utilisez les boutons en haut à gauche pour basculer entre les deux modes.
          </p>
        </div>
      )
    },
    {
      title: "Édition du contenu",
      icon: <Edit3 className="w-8 h-8 text-brand-gold" />,
      content: (
        <div className="space-y-3 text-gray-600">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-semibold text-brand-green mb-2">Panneau d'édition (droite)</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Barre d'outils</strong> : Gras, italique, alignement...</li>
              <li><strong>Blocs sémantiques</strong> : Ajoutez des encadrés (hadith, conseil, info...)</li>
              <li><strong>Mode HTML</strong> : Pour les modifications avancées</li>
            </ul>
          </div>
          <p className="text-sm">
            Les modifications apparaissent instantanément dans l'aperçu central.
          </p>
        </div>
      )
    },
    {
      title: "Fonctionnalités avancées",
      icon: <Settings className="w-8 h-8 text-brand-gold" />,
      content: (
        <div className="space-y-3 text-gray-600">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Volume2 className="w-5 h-5 text-brand-sage mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Écouter</p>
                <p className="text-xs">Lecture audio du chapitre (nécessite clé API Gemini)</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Download className="w-5 h-5 text-brand-sage mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Export PDF</p>
                <p className="text-xs">Génère un PDF optimisé pour l'impression</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Settings className="w-5 h-5 text-brand-sage mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Paramètres</p>
                <p className="text-xs">Configuration de la clé API et options avancées</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-green to-brand-sage p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            {steps[currentStep].icon}
            <div>
              <p className="text-white/70 text-sm">Étape {currentStep + 1} sur {steps.length}</p>
              <h2 className="text-xl font-title font-bold">{steps[currentStep].title}</h2>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div 
            className="h-full bg-brand-gold transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 min-h-[200px]">
          {steps[currentStep].content}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Précédent
          </button>
          
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep ? 'bg-brand-green' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          {isLastStep ? (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-brand-green text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
            >
              Commencer
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(s => s + 1)}
              className="px-4 py-2 text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors flex items-center gap-1"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook to manage first-time visit
export const useWelcomeGuide = () => {
  const STORAGE_KEY = 'sante-editor-welcomed';
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenGuide) {
      setShowGuide(true);
    }
  }, []);

  const closeGuide = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowGuide(false);
  };

  const reopenGuide = () => {
    setShowGuide(true);
  };

  return { showGuide, closeGuide, reopenGuide };
};

export default WelcomeGuide;

import React from 'react';
import { TitlePageData } from '../types';

interface TitlePageEditorProps {
  data: TitlePageData;
  onChange: (data: TitlePageData) => void;
}

const TitlePageEditor: React.FC<TitlePageEditorProps> = ({ data, onChange }) => {
  const handleFieldChange = (field: keyof TitlePageData, value: string) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-brand-white">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-title font-bold text-brand-green mb-2">
            Page de Titre
          </h2>
          <p className="text-sm text-gray-500 font-body">
            Ces informations apparaitront sur la page de couverture du livre lors de l'export.
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label 
              htmlFor="title" 
              className="block text-sm font-semibold text-brand-green mb-2"
            >
              Titre principal
            </label>
            <input
              id="title"
              type="text"
              value={data.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="La Sante dans l'assiette"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-sage focus:border-transparent text-lg font-title"
            />
          </div>

          {/* Subtitle 1 */}
          <div>
            <label 
              htmlFor="subtitle1" 
              className="block text-sm font-semibold text-brand-green mb-2"
            >
              Sous-titre 1
            </label>
            <input
              id="subtitle1"
              type="text"
              value={data.subtitle1}
              onChange={(e) => handleFieldChange('subtitle1', e.target.value)}
              placeholder="30 Jours pour se soigner"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-sage focus:border-transparent"
            />
          </div>

          {/* Subtitle 2 */}
          <div>
            <label 
              htmlFor="subtitle2" 
              className="block text-sm font-semibold text-brand-green mb-2"
            >
              Sous-titre 2
            </label>
            <input
              id="subtitle2"
              type="text"
              value={data.subtitle2}
              onChange={(e) => handleFieldChange('subtitle2', e.target.value)}
              placeholder="Ramadan, ma guerison"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-sage focus:border-transparent"
            />
          </div>

          <hr className="border-gray-200 my-6" />

          {/* Author */}
          <div>
            <label 
              htmlFor="author" 
              className="block text-sm font-semibold text-brand-green mb-2"
            >
              Auteur
            </label>
            <input
              id="author"
              type="text"
              value={data.author}
              onChange={(e) => handleFieldChange('author', e.target.value)}
              placeholder="Oum Soumayya"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-sage focus:border-transparent font-medium"
            />
          </div>

          {/* Credentials */}
          <div>
            <label 
              htmlFor="credentials" 
              className="block text-sm font-semibold text-brand-green mb-2"
            >
              Qualifications
            </label>
            <textarea
              id="credentials"
              value={data.credentials}
              onChange={(e) => handleFieldChange('credentials', e.target.value)}
              placeholder="Praticienne en Hijama - Naturopathie - Acupuncture - Reflexologie - Massotherapie - Micronutrition - Therapie par la chaleur"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-sage focus:border-transparent resize-none text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">
              Separez les qualifications par des tirets (-)
            </p>
          </div>

          {/* Contact */}
          <div>
            <label 
              htmlFor="contact" 
              className="block text-sm font-semibold text-brand-green mb-2"
            >
              Contact
            </label>
            <input
              id="contact"
              type="email"
              value={data.contact}
              onChange={(e) => handleFieldChange('contact', e.target.value)}
              placeholder="monremede@gmail.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-sage focus:border-transparent"
            />
          </div>
        </div>

        {/* Preview Card */}
        <div className="mt-10 p-6 bg-white border-2 border-brand-gold rounded-lg shadow-sm">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-4">Apercu</p>
          <div className="text-center py-4">
            {data.title && (
              <h1 className="text-2xl font-title font-bold text-brand-green mb-2">
                {data.title}
              </h1>
            )}
            {data.subtitle1 && (
              <p className="text-lg text-gray-600 italic mb-1">{data.subtitle1}</p>
            )}
            {data.subtitle2 && (
              <p className="text-lg text-gray-600 italic mb-4">{data.subtitle2}</p>
            )}
            <div className="w-16 h-0.5 bg-brand-gold mx-auto my-4"></div>
            {data.author && (
              <p className="text-lg font-medium text-brand-green mb-1">{data.author}</p>
            )}
            {data.credentials && (
              <p className="text-xs text-gray-500 max-w-md mx-auto">{data.credentials}</p>
            )}
            {data.contact && (
              <p className="text-sm text-brand-gold mt-3">{data.contact}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TitlePageEditor;

import { GoogleGenAI, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION, SEPARATOR_HTML } from '../constants';
import { AIRequestOptions } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please select an API Key.");
  }
  return new GoogleGenAI({ apiKey });
};

export const processContentWithAI = async (
  currentContent: string,
  options: AIRequestOptions
): Promise<string> => {
  try {
    const ai = getAiClient();
    
    let prompt = "";
    
    switch (options.type) {
      case 'FORMAT':
        prompt = `Formatez le texte brut suivant en HTML selon la charte graphique définie dans l'instruction système. 
        N'oubliez pas d'insérer le séparateur visuel '${SEPARATOR_HTML}' si le texte semble changer de sous-section.
        
        Texte à traiter :
        ${currentContent}`;
        break;
      case 'CORRECT':
        prompt = `Corrigez l'orthographe, la grammaire et la typographie du contenu HTML suivant sans casser la structure HTML ni les classes CSS. Améliorez la fluidité si nécessaire.
        
        Contenu :
        ${currentContent}`;
        break;
      case 'REWRITE':
        prompt = `Reformulez le passage suivant pour le rendre plus inspirant, professionnel et chaleureux (ton naturopathique). Conservez ou appliquez le formatage HTML correct.
        Instructions spécifiques : ${options.instructions || 'Aucune'}
        
        Contenu :
        ${currentContent}`;
        break;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
      }
    });

    if (response.text) {
      return response.text.replace(/```html/g, '').replace(/```/g, '').trim();
    }
    
    throw new Error("No response from AI");

  } catch (error) {
    console.error("AI Error:", error);
    throw error;
  }
};

// --- Text To Speech Helpers ---

// Helper to strip HTML for TTS reading
const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || "";
};

// Base64 decoding
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// PCM Audio Decoding (from System Instructions)
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateChapterAudio = async (htmlContent: string, audioContext: AudioContext): Promise<AudioBuffer> => {
  const ai = getAiClient();
  const cleanText = stripHtml(htmlContent);

  if (!cleanText.trim()) {
    throw new Error("No text content found to read.");
  }

  // Use the specialized TTS model
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: cleanText }] }],
    config: {
      responseModalities: [Modality.AUDIO], 
      speechConfig: {
        voiceConfig: {
          // 'Kore' is a good fit for a calm, naturopathic book
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!base64Audio) {
    throw new Error("No audio data returned from Gemini.");
  }

  // Decode raw PCM data (24kHz is standard for this model)
  const audioBuffer = await decodeAudioData(
    decode(base64Audio),
    audioContext,
    24000, 
    1,
  );

  return audioBuffer;
};
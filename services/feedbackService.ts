import { GoogleGenAI } from "@google/genai";
import { getApiKey, hasApiKey } from '../utils/apiKeyManager';

// ============================================
// AI FEEDBACK SERVICE
// Provides editorial feedback on book chapters
// ============================================

export interface FeedbackMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChapterContext {
  title: string;
  content: string;
}

const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Cle API manquante. Veuillez configurer votre cle API Gemini dans les Parametres.");
  }
  return new GoogleGenAI({ apiKey });
};

// Check if AI features are available
export const isFeedbackAvailable = (): boolean => {
  return hasApiKey();
};

// Strip HTML tags for analysis
const stripHtml = (html: string): string => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// System instruction for the feedback assistant
const FEEDBACK_SYSTEM_INSTRUCTION = `Tu es un editeur professionnel francophone specialise dans les livres de sante, bien-etre et naturopathie.

Ton role est d'analyser le contenu des chapitres et de fournir des retours constructifs pour ameliorer la qualite du livre.

Principes:
- Sois bienveillant mais honnete dans tes retours
- Fournis des suggestions concretes et actionnables
- Respecte le ton chaleureux et professionnel du livre (naturopathie)
- Reponds toujours en francais
- Ne reecris jamais le contenu toi-meme, suggere seulement des ameliorations
- Cite des passages specifiques quand tu fais des suggestions

Domaines d'expertise:
- Style d'ecriture et clarte
- Grammaire et orthographe francaise
- Structure et flux du texte
- Coherence du contenu
- Exactitude des informations de sante (dans la limite de tes connaissances)
- Engagement du lecteur`;

// Initial analysis prompt
const getAnalysisPrompt = (title: string, content: string): string => {
  const plainText = stripHtml(content);
  const wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;
  
  return `Analyse ce chapitre et fournis un feedback editorial complet.

**Titre du chapitre:** ${title}

**Statistiques:**
- Nombre de mots: ~${wordCount}

**Contenu:**
${plainText.substring(0, 15000)}${plainText.length > 15000 ? '\n\n[... contenu tronque pour l\'analyse ...]' : ''}

---

Fournis ton analyse structuree avec:

## Resume
Un bref resume du chapitre (2-3 phrases)

## Points forts
- Liste 2-3 points positifs du chapitre

## Suggestions d'amelioration
- Liste 3-5 suggestions concretes avec citations du texte si pertinent

## Style et lisibilite
- Evaluation du style (clair, fluide, engageant?)
- Note de lisibilite /10

## Grammaire et orthographe
- Signale les erreurs detectees (si tu en vois)
- Suggestions de corrections

## Structure
- Le chapitre est-il bien organise?
- Y a-t-il des transitions manquantes?

## Questions pour l'auteur
- 2-3 questions pour clarifier ou approfondir certains points`;
};

// Analyze a chapter and return initial feedback
export const analyzeChapter = async (
  chapter: ChapterContext,
  onProgress?: (message: string) => void
): Promise<string> => {
  try {
    onProgress?.('Connexion a l\'assistant...');
    const ai = getAiClient();
    
    onProgress?.('Analyse du chapitre en cours...');
    const prompt = getAnalysisPrompt(chapter.title, chapter.content);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction: FEEDBACK_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    if (response.text) {
      return response.text;
    }
    
    throw new Error("Pas de reponse de l'assistant");
    
  } catch (error) {
    console.error("Feedback analysis error:", error);
    throw error;
  }
};

// Continue conversation with context
export const continueConversation = async (
  chapter: ChapterContext,
  conversationHistory: FeedbackMessage[],
  newMessage: string
): Promise<string> => {
  try {
    const ai = getAiClient();
    const plainText = stripHtml(chapter.content);
    
    // Build conversation context
    const contextPrompt = `**Contexte - Chapitre en cours d'analyse:**
Titre: ${chapter.title}
Contenu (extrait): ${plainText.substring(0, 8000)}${plainText.length > 8000 ? '...' : ''}

---

**Historique de la conversation:**
${conversationHistory.map(msg => 
  `${msg.role === 'user' ? 'Auteur' : 'Assistant'}: ${msg.content}`
).join('\n\n')}

---

**Nouvelle question de l'auteur:**
${newMessage}

---

Reponds a la question de l'auteur en te basant sur le contexte du chapitre et l'historique de la conversation. Sois precis et constructif.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: contextPrompt,
      config: {
        systemInstruction: FEEDBACK_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    if (response.text) {
      return response.text;
    }
    
    throw new Error("Pas de reponse de l'assistant");
    
  } catch (error) {
    console.error("Conversation error:", error);
    throw error;
  }
};

// Quick feedback on specific aspect
export const getQuickFeedback = async (
  chapter: ChapterContext,
  aspect: 'grammar' | 'style' | 'structure' | 'clarity'
): Promise<string> => {
  try {
    const ai = getAiClient();
    const plainText = stripHtml(chapter.content);
    
    const aspectPrompts: Record<string, string> = {
      grammar: `Analyse uniquement la grammaire et l'orthographe de ce texte. Liste toutes les erreurs que tu detectes avec les corrections suggerees.`,
      style: `Analyse uniquement le style d'ecriture de ce texte. Est-il engageant? Professionnel? Chaleureux? Donne des suggestions pour l'ameliorer.`,
      structure: `Analyse uniquement la structure de ce chapitre. Est-il bien organise? Les transitions sont-elles fluides? Suggere des ameliorations.`,
      clarity: `Analyse uniquement la clarte du texte. Y a-t-il des passages confus ou ambigus? Suggere des reformulations.`
    };
    
    const prompt = `${aspectPrompts[aspect]}

**Titre:** ${chapter.title}

**Contenu:**
${plainText.substring(0, 12000)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction: FEEDBACK_SYSTEM_INSTRUCTION,
        temperature: 0.5,
      }
    });

    if (response.text) {
      return response.text;
    }
    
    throw new Error("Pas de reponse de l'assistant");
    
  } catch (error) {
    console.error("Quick feedback error:", error);
    throw error;
  }
};

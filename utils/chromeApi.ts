// api-services.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Service for language detection, translation, and summarization operations
 * using browser built-in AI capabilities when available, with robust fallbacks
 * shey you see how fancy it sounds lmao, i was stuck while doing the fallbacks and i didnt have time, so i used ai for that kind of choppy but it does the job 
 */

import { LANGUAGES } from './data/language-data';

interface DetectionResult {
  detectedLanguage: string;
  confidence: number;
}

interface BrowserAI {
  languageDetector?: {
    capabilities(): Promise<{
      available: 'no' | 'readily' | 'after-download';
      languageAvailable(lang: string): 'no' | 'readily' | 'after-download';
    }>;
    create(options?: any): Promise<{
      ready: Promise<void>;
      detect(text: string): Promise<DetectionResult[]>;
    }>;
  };
  translator?: {
    capabilities(): Promise<{
      available: 'no' | 'readily' | 'after-download';
      languagePairAvailable(source: string, target: string): 'no' | 'readily' | 'after-download';
    }>;
    create(options: {
      sourceLanguage: string;
      targetLanguage: string;
      monitor?(m: any): void;
    }): Promise<{
      ready: Promise<void>;
      translate(text: string): Promise<string>;
    }>;
  };
  summarizer?: {
    capabilities(): Promise<{
      available: 'no' | 'readily' | 'after-download';
    }>;
    create(options?: {
      type?: 'key-points' | 'tl;dr' | 'teaser' | 'headline';
      format?: 'markdown' | 'plain-text';
      length?: 'short' | 'medium' | 'long';
      monitor?(m: any): void;
    }): Promise<{
      ready: Promise<void>;
      summarize(text: string, options?: { context?: string }): Promise<string>;
    }>;
  };
}

/**
 * Initialize browser AI capabilities
 * @returns Object containing initialized detector, translator, and summarizer if available
 */
export const initializeAICapabilities = async () => {
  const ai = (typeof self !== 'undefined' && 'ai' in self) ? (self as any).ai as BrowserAI : null;
  const capabilities = {
    detector: null as any,
    translator: null as any,
    summarizer: null as any
  };

  // Initialize language detector 
  if (ai?.languageDetector) {
    try {
      const detectorCapabilities = await ai.languageDetector.capabilities();
      if (detectorCapabilities.available !== 'no') {
        const detector = await ai.languageDetector.create({
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Language detector download: ${Math.round((e.loaded / e.total) * 100)}%`);
            });
          }
        });
        await detector.ready;
        capabilities.detector = detector;
      }
    } catch (error) {
      console.warn("Failed to initialize language detector:", error);
    }
  }

  // Initialize summarizer 
  if (ai?.summarizer) {
    try {
      const summarizerCapabilities = await ai.summarizer.capabilities();
      if (summarizerCapabilities.available !== 'no') {
        const summarizer = await ai.summarizer.create({
          type: 'key-points',
          format: 'markdown',
          length: 'medium',
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Summarizer download: ${Math.round((e.loaded / e.total) * 100)}%`);
            });
          }
        });
        await summarizer.ready;
        capabilities.summarizer = summarizer;
      }
    } catch (error) {
      console.warn("Failed to initialize summarizer:", error);
    }
  }

  return capabilities;
};

// Singleton for AI capabilities
let aiCapabilities: any = null;
const getAICapabilities = async () => {
  if (!aiCapabilities) {
    aiCapabilities = await initializeAICapabilities();
  }
  return aiCapabilities;
};

/**
 * Detects the language of the given text using browser AI when available
 * with multiple fallback strategies
 * @param text Text to detect language for
 * @returns Promise with detected language code
 */
export const detectLanguage = async (text: string): Promise<string> => {
  if (!text || !text.trim()) return 'en';
  
  try {
    const capabilities = await getAICapabilities();
    
    // Use browser's built-in AI language detector if available
    if (capabilities.detector) {
      try {
        const results = await capabilities.detector.detect(text);
        if (results && results.length > 0) {
          // Filter by minimum confidence threshold
          const confidenceThreshold = 0.7;
          const highConfidenceResult = results.find((result: { confidence: number; detectedLanguage: string; }) => 
            result.confidence > confidenceThreshold && 
            LANGUAGES.some(lang => lang.code === result.detectedLanguage)
          );
          
          if (highConfidenceResult) {
            return highConfidenceResult.detectedLanguage;
          }
          
          // If no high confidence result but we have results with supported languages
          const supportedResult = results.find((result: { detectedLanguage: string; }) => 
            LANGUAGES.some(lang => lang.code === result.detectedLanguage)
          );
          
          if (supportedResult) {
            return supportedResult.detectedLanguage;
          }
        }
      } catch (error) {
        console.warn("Browser AI language detection failed:", error);
      }
    }
    
    // Try external API detection service, this is one of the fallbacks just in case 
    try {
      const response = await fetch(`https://ws.detectlanguage.com/0.2/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo' 
        },
        body: JSON.stringify({ q: text.slice(0, 500) })
      });
      
      const data = await response.json();
      if (data?.data?.detections && data.data.detections.length > 0) {
        const detectedCode = data.data.detections[0].language;
        // Verify the detected language is supported
        if (LANGUAGES.some(lang => lang.code === detectedCode)) {
          return detectedCode;
        }
      }
    } catch (apiError) {
      console.warn("External language detection API failed:", apiError);
    }
    
    // Fallback to regex-based detection for longer text,
    if (text.length > 20) {
      const detectedLang = detectLanguageWithPatterns(text);
      if (detectedLang) return detectedLang;
    }
    
    // Default to browser's language or English
    return navigator.language.split('-')[0] || 'en';
    
  } catch (error) {
    console.error("Language detection failed:", error);
    return 'en';
  }
};

/**
 * Helper function to detect language using regex patterns
 * @param text Text to analyze
 * @returns Detected language code or null
 */
function detectLanguageWithPatterns(text: string): string | null {
  // Script-based detection (highest confidence)
  const scriptPatterns: {[key: string]: RegExp} = {
    ru: /[А-Яа-я]{4,}/g,                                    // Cyrillic
    ja: /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]{2,}/g,   // Japanese 
    zh: /[\u4E00-\u9FFF\u3400-\u4DBF]{2,}/g,                // Chinese
    ko: /[\uAC00-\uD7AF\u1100-\u11FF]{2,}/g,                // Korean
    ar: /[\u0600-\u06FF]{4,}/g,                             // Arabic
    el: /[\u0370-\u03FF]{4,}/g,                             // Greek
    he: /[\u0590-\u05FF]{4,}/g,                             // Hebrew
    th: /[\u0E00-\u0E7F]{4,}/g,                             // Thai
  };
  
  // Check for script-specific patterns first
  for (const [code, pattern] of Object.entries(scriptPatterns)) {
    const matches = text.match(pattern);
    if (matches && matches.length > 1) {
      return code;
    }
  }
  
  // Common word detection (lower confidence)
  const commonWordPatterns: {[key: string]: RegExp} = {
    de: /\b(und|der|die|das|mit|für|ist|ich|zu|von|nicht)\b/gi,
    es: /\b(el|la|los|las|y|en|que|con|por|para|como|esto)\b/gi,
    fr: /\b(le|la|les|un|une|des|et|en|que|qui|dans|pour|pas|ce)\b/gi,
    it: /\b(il|la|lo|gli|e|di|che|un|una|per|non|con|sono|mi)\b/gi,
    pt: /\b(o|a|os|as|e|de|que|um|uma|para|com|não|se|na)\b/gi,
    tr: /\b(ve|bu|için|bir|ne|gibi|ben|sen|o|biz|var|yok|çok)\b/gi,
    nl: /\b(de|het|een|in|van|en|is|dat|op|zijn|voor|met|niet)\b/gi,
  };
  
  const langScores: {[key: string]: number} = {};
  
  
  for (const [code, pattern] of Object.entries(commonWordPatterns)) {
    const matches = text.match(pattern);
    if (matches) {
     
      langScores[code] = (matches.length / Math.sqrt(text.length)) * 100;
    }
  }
  
  // Find language with highest score above threshold
  const entries = Object.entries(langScores);
  if (entries.length > 0) {
    const threshold = 0.5;
    const [topLang, topScore] = entries.reduce(
      (max, current) => current[1] > max[1] ? current : max,
      ['', 0]
    );
    
    if (topScore > threshold) {
      return topLang;
    }
  }
  
  return null;
}

/**
 * Initializes a translator for a specific language pair
 * @param sourceLang Source language code
 * @param targetLang Target language code 
 * @returns Promise with translator or null if unavailable
 */
export const initializeTranslator = async (sourceLang: string, targetLang: string) => {
  if (sourceLang === targetLang) return null;
  
  try {
    // Access browser AI capabilities
    const ai = (typeof self !== 'undefined' && 'ai' in self && 'translator' in (self as any).ai) 
      ? (self as any).ai.translator 
      : null;
      
    if (!ai) return null;
    
    const capabilities = await ai.capabilities();
    const pairAvailable = await capabilities.languagePairAvailable(sourceLang, targetLang);
    
    if (pairAvailable === 'no') {
      return null;
    }
    
    const translator = await ai.create({
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      monitor(m: any) {
        m.addEventListener('downloadprogress', (e: any) => {
          console.log(`Translator download (${sourceLang}->${targetLang}): ${Math.round((e.loaded / e.total) * 100)}%`);
        });
      }
    });
    
    await translator.ready;
    return translator;
    
  } catch (error) {
    console.warn(`Failed to initialize translator (${sourceLang}->${targetLang}):`, error);
    return null;
  }
};

/**
 * Translates text from one language to another using browser AI with fallbacks
 * @param text Text to translate
 * @param sourceLang Source language code
 * @param targetLang Target language code
 * @returns Promise with translated text
 */
export const translateText = async (
  text: string, 
  sourceLang: string, 
  targetLang: string
): Promise<string> => {
  if (!text || sourceLang === targetLang) return text;
  
  try {
    // Try browser AI translator
    let browserTranslator = null;
    
    try {
      browserTranslator = await initializeTranslator(sourceLang, targetLang);
      if (browserTranslator) {
        const translatedText = await browserTranslator.translate(text);
        if (translatedText) {
          return translatedText;
        }
      }
    } catch (browserError) {
      console.warn("Browser translator failed:", browserError);
    }
    
    // Fallback to external translation services
    const services = [
      // MyMemory translation API
      async () => {
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
        );
        const data = await response.json();
        if (data?.responseData?.translatedText) {
          // Parse HTML entities if needed
          const tempElement = document.createElement('div');
          tempElement.innerHTML = data.responseData.translatedText;
          return tempElement.textContent || tempElement.innerText;
        }
        throw new Error("No translation result");
      },
      
      // LibreTranslate API - fallback
      async () => {
        const response = await fetch(`https://libretranslate.com/translate`, {
          method: "POST",
          body: JSON.stringify({
            q: text,
            source: sourceLang,
            target: targetLang,
          }),
          headers: { "Content-Type": "application/json" }
        });
        const data = await response.json();
        if (data?.translatedText) {
          return data.translatedText;
        }
        throw new Error("No translation result");
      }
    ];
    
    // Try each service in order until one works
    for (const service of services) {
      try {
        return await service();
      } catch (serviceError) {
        console.warn("Translation service failed, trying next...", serviceError);
      }
    }
    
    // If all services fail, return fallback message
    const fallbackTranslations: {[key: string]: {[key: string]: string}} = {
      'en': {
        'es': 'Lo siento, no se pudo traducir el texto.',
        'fr': 'Désolé, impossible de traduire le texte.',
        'de': 'Entschuldigung, der Text konnte nicht übersetzt werden.',
        'pt': 'Desculpe, não foi possível traduzir o texto.',
        'ru': 'Извините, не удалось перевести текст.',
        'it': 'Spiacenti, impossibile tradurre il testo.',
        'tr': 'Üzgünüm, metin çevirilemedi.'
      }
    };
    
    if (fallbackTranslations[sourceLang]?.[targetLang]) {
      return fallbackTranslations[sourceLang][targetLang];
    }
    
    return `[${sourceLang}->${targetLang} translation unavailable]`;
  } catch (error) {
    console.error("Translation failed:", error);
    return `[Translation Error: ${(error as Error).message}]`;
  }
};

/**
 * Summarizes the given text using browser AI or fallback algorithms
 * @param text Text to summarize
 * @param options Additional options for summarization
 * @returns Promise with summarized text
 */
export const summarizeText = async (
  text: string,
  options: {
    type?: 'key-points' | 'tl;dr' | 'teaser' | 'headline';
    format?: 'markdown' | 'plain-text';
    length?: 'short' | 'medium' | 'long';
    context?: string;
  } = {}
): Promise<string> => {
  if (!text || text.length < 100) return text;
  
  const defaultOptions = {
    type: 'key-points',
    format: 'markdown',
    length: 'medium',
    context: ''
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    // Try to use browser AI capabilities
    const capabilities = await getAICapabilities();
    
    if (capabilities.summarizer) {
      try {
        return await capabilities.summarizer.summarize(text, {
          context: mergedOptions.context
        });
      } catch (error) {
        console.warn("Browser AI summarization failed:", error);
      }
    }
    
    // Fallback to external summarization API
    try {
      const response = await fetch('https://api.meaningcloud.com/summarization-1.0', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          key: 'demo', // Use demo key
          txt: text.substring(0, 5000), // API limit
          sentences: mergedOptions.length === 'short' ? '3' : 
                    mergedOptions.length === 'medium' ? '5' : '7'
        })
      });
      
      const data = await response.json();
      if (data?.summary) {
        return data.summary;
      }
    } catch (apiError) {
      console.warn("External summarization API failed:", apiError);
    }
    
    // Final fallback to local algorithm
    return createFallbackSummary(text, mergedOptions);
    
  } catch (error) {
    console.error("Summarization failed:", error);
    return `Failed to summarize text. Error: ${(error as Error).message}`;
  }
};

/**
 * Creates a simple summary when AI capabilities aren't available
 * @param text Text to summarize
 * @param options Summarization options
 * @returns A simple summary based on the requested format and type
 */
function createFallbackSummary(
  text: string, 
  options: {
    type: string;
    format: string;
    length: string;
    context?: string;
  }
): string {
  // Split text into sentences
  const sentences = text
    .replace(/([.!?])\s*(?=[A-Z])/g, "$1|")
    .split("|")
    .filter(s => s.trim().length > 10);
  
  if (sentences.length === 0) return text;
  
  // Determine number of sentences to include
  const sentenceCount = 
    options.length === 'short' ? Math.min(3, sentences.length) :
    options.length === 'medium' ? Math.min(5, sentences.length) :
    Math.min(7, sentences.length);
  
  // Handle different summary types
  switch (options.type) {
    case 'headline':
      return sentences[0].trim();
      
    case 'teaser':
      return sentences.slice(0, 2).join(' ');
      
    case 'tl;dr':
      // First sentence and last sentence approach for tl;dr
      if (sentences.length <= 3) {
        return sentences.join(' ');
      } else {
        return `${sentences[0]} ${sentences[sentences.length - 1]}`;
      }
      
    case 'key-points':
    default:
      // Extract key sentences
      const keyPoints = extractKeyPoints(text, sentenceCount);
      
      // Format according to requested format
      if (options.format === 'markdown') {
        return keyPoints.map(point => `- ${point}`).join('\n');
      } else {
        return keyPoints.join('. ');
      }
  }
}

/**
 * Extracts key points from text using a basic extraction algorithm
 * @param text Text to analyze
 * @param count Number of points to extract
 * @returns Array of key sentences
 */
function extractKeyPoints(text: string, count: number): string[] {
  const sentences = text
    .replace(/([.!?])\s*(?=[A-Z])/g, "$1|")
    .split("|")
    .filter(s => s.trim().length > 10);
  
  if (sentences.length <= count) {
    return sentences;
  }
  
  
  const keyPoints = [sentences[0]];
  
  // Find important terms
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  const wordFreq: {[key: string]: number} = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  // Filter out common stopwords
  const stopwords = ['this', 'that', 'these', 'those', 'they', 'their', 'there', 
    'about', 'would', 'could', 'should', 'from', 'have', 'been', 'were', 'when'];
  
  const importantTerms = Object.entries(wordFreq)
    .filter(([word]) => !stopwords.includes(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  

  const scoredSentences = sentences.slice(1).map((sentence, index) => {
  
    const termScore = importantTerms.reduce((score, term) => {
      return score + (sentence.toLowerCase().includes(term) ? 1 : 0);
    }, 0);
    
   
    const positionScore = 1 - (index / sentences.length);
    
   
    const lengthScore = Math.min(1, sentence.length / 100);
    
    // Combined score
    const score = (termScore * 0.6) + (positionScore * 0.3) + (lengthScore * 0.1);
    
    return { sentence, score };
  });
  
  // Sort by score and take top sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, count - 1)
    .map(item => item.sentence);
  
  // Combine with first sentence and sort by original position
  const allSelectedSentences = [...keyPoints, ...topSentences];
  const sentenceIndices = allSelectedSentences.map(s => sentences.indexOf(s));
  
  // Return sentences in their original order
  return sentenceIndices
    .sort((a, b) => a - b)
    .map(index => sentences[index]);
}
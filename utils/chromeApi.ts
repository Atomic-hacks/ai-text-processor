/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * service for language detection, translation, and summarization
 * using Chrome's AI capabilities with robust fallbacks when unavailable, i know this was'nt required but i added it while coding becasue of some issues i encountered while using the chrome api
 * i am sorry if it goes against the instructions but as per my own understanding i dont suppose it should.
 */

import { LANGUAGES } from './data/language-data';

// Type definitions for Chrome AI interfaces
interface LanguageDetectorCapabilities {
  available: 'no' | 'readily' | 'after-download';
  languageAvailable(lang: string): 'no' | 'readily' | 'after-download';
}

interface LanguageDetector {
  ready: Promise<void>;
  detect(text: string): Promise<Array<{detectedLanguage: string, confidence: number}>>;
}

interface TranslatorCapabilities {
  available: 'no' | 'readily' | 'after-download';
  languagePairAvailable(source: string, target: string): 'no' | 'readily' | 'after-download';
}

interface Translator {
  ready: Promise<void>;
  translate(text: string): Promise<string>;
}

interface SummarizerCapabilities {
  available: 'no' | 'readily' | 'after-download';
}

interface Summarizer {
  ready: Promise<void>;
  summarize(text: string, options?: { context?: string }): Promise<string>;
}

interface DownloadProgressEvent extends Event {
  loaded: number;
  total: number;
}

interface BrowserAI {
  languageDetector?: {
    capabilities(): Promise<LanguageDetectorCapabilities>;
    create(options?: {
      monitor?(m: { addEventListener(event: string, listener: (e: DownloadProgressEvent) => void): void }): void;
    }): Promise<LanguageDetector>;
  };
  translator?: {
    capabilities(): Promise<TranslatorCapabilities>;
    create(options: {
      sourceLanguage: string;
      targetLanguage: string;
      monitor?(m: { addEventListener(event: string, listener: (e: DownloadProgressEvent) => void): void }): void;
    }): Promise<Translator>;
  };
  summarizer?: {
    capabilities(): Promise<SummarizerCapabilities>;
    create(options?: {
      type?: 'key-points' | 'tl;dr' | 'teaser' | 'headline';
      format?: 'markdown' | 'plain-text';
      length?: 'short' | 'medium' | 'long';
      monitor?(m: { addEventListener(event: string, listener: (e: DownloadProgressEvent) => void): void }): void;
    }): Promise<Summarizer>;
  };
}

// Cache for initialized capabilities to avoid redundant initialization
let aiCapabilitiesCache: {
  detector: LanguageDetector | null;
  translator: Record<string, Translator>;
  summarizer: Summarizer | null;
} | null = null;

/**
 * Checks if Chrome AI is available in the current environment
 */
const isChromeAIAvailable = (): BrowserAI | null => {
  return (typeof self !== 'undefined' && 'ai' in self) ? (self as any).ai as BrowserAI : null;
};

/**
 * Initializes Chrome AI capabilities with proper error handling and progress tracking
 */
export const initializeAICapabilities = async () => {
  const ai = isChromeAIAvailable();
  
  if (!ai) {
    console.info("Chrome AI capabilities not available in this browser");
    return {
      detector: null,
      translator: {},
      summarizer: null
    };
  }

  const capabilities = {
    detector: null as LanguageDetector | null,
    translator: {} as Record<string, Translator>,
    summarizer: null as Summarizer | null
  };

  // Initialize language detector with proper error handling
  if (ai.languageDetector) {
    try {
      const detectorCapabilities = await ai.languageDetector.capabilities();
      if (detectorCapabilities.available !== 'no') {
        const detector = await ai.languageDetector.create({
          monitor(m) {
            m.addEventListener('downloadprogress', (e: DownloadProgressEvent) => {
              console.info(`Language detector download: ${Math.round((e.loaded / e.total) * 100)}%`);
            });
          }
        });
        await detector.ready;
        capabilities.detector = detector;
        console.info("Chrome AI language detector initialized successfully");
      } else {
        console.info("Chrome AI language detector not available on this device");
      }
    } catch (error) {
      console.warn("Failed to initialize Chrome AI language detector:", error);
    }
  }

  // Initialize summarizer with proper error handling
  if (ai.summarizer) {
    try {
      const summarizerCapabilities = await ai.summarizer.capabilities();
      if (summarizerCapabilities.available !== 'no') {
        const summarizer = await ai.summarizer.create({
          type: 'key-points',
          format: 'markdown',
          length: 'medium',
          monitor(m) {
            m.addEventListener('downloadprogress', (e: DownloadProgressEvent) => {
              console.info(`Summarizer download: ${Math.round((e.loaded / e.total) * 100)}%`);
            });
          }
        });
        await summarizer.ready;
        capabilities.summarizer = summarizer;
        console.info("Chrome AI summarizer initialized successfully");
      } else {
        console.info("Chrome AI summarizer not available on this device");
      }
    } catch (error) {
      console.warn("Failed to initialize Chrome AI summarizer:", error);
    }
  }

  return capabilities;
};

/**
 * Gets cached AI capabilities or initializes them if not already cached
 */
const getAICapabilities = async () => {
  if (!aiCapabilitiesCache) {
    aiCapabilitiesCache = await initializeAICapabilities();
  }
  return aiCapabilitiesCache;
};

/**
 * Validates and normalizes a language code
 */
const normalizeLanguageCode = (code: string): string => {
  // Handle language codes like 'en-US' by extracting the primary language
  const primaryCode = code.split('-')[0].toLowerCase();
  // Verify it's in our supported languages list
  return LANGUAGES.some(lang => lang.code === primaryCode) ? primaryCode : 'en';
};

/**
 * Detects the language of text using Chrome AI Language Detector
 * with sophisticated fallback strategies
 * 
 * @param text Text to detect language for
 * @returns Promise with the detected language code
 */
export const detectLanguage = async (text: string): Promise<string> => {
  if (!text || !text.trim()) return 'en';
  
  // Normalize text for processing
  const processedText = text.trim().slice(0, 5000); // Limit text length for API compatibility
  
  try {
    const capabilities = await getAICapabilities();
    
    // 1. Use Chrome AI language detector if available (primary method)
    if (capabilities.detector) {
      try {
        console.info("Using Chrome AI Language Detector");
        const results = await capabilities.detector.detect(processedText);
        
        if (results && results.length > 0) {
          // Applies confidence threshold for high quality detection
          const confidenceThreshold = 0.7;
          const highConfidenceResult = results.find(result => 
            result.confidence > confidenceThreshold && 
            LANGUAGES.some(lang => lang.code === result.detectedLanguage)
          );
          
          if (highConfidenceResult) {
            console.info(`Detected language with high confidence: ${highConfidenceResult.detectedLanguage} (${highConfidenceResult.confidence.toFixed(2)})`);
            return highConfidenceResult.detectedLanguage;
          }
          
          // If no high confidence result but there is supported results
          const supportedResult = results.find(result => 
            LANGUAGES.some(lang => lang.code === result.detectedLanguage)
          );
          
          if (supportedResult) {
            console.info(`Detected language: ${supportedResult.detectedLanguage} (${supportedResult.confidence.toFixed(2)})`);
            return supportedResult.detectedLanguage;
          }
          
          console.info("No supported language detected with Chrome AI, using fallbacks");
        }
      } catch (error) {
        console.warn("Chrome AI language detection failed:", error);
      }
    } else {
      console.info("Chrome AI Language Detector not available, using fallbacks");
    }
    
    // 2. Try for external API detection service as fallback
    try {
      console.info("Attempting external language detection API");
      const response = await fetch(`https://ws.detectlanguage.com/0.2/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo' 
        },
        body: JSON.stringify({ q: processedText.slice(0, 500) })
      });
      
      const data = await response.json();
      if (data?.data?.detections && data.data.detections.length > 0) {
        const detectedCode = data.data.detections[0].language;
        // Verify the detected language is supported
        if (LANGUAGES.some(lang => lang.code === detectedCode)) {
          console.info(`External API detected language: ${detectedCode}`);
          return detectedCode;
        }
      }
    } catch (apiError) {
      console.warn("External language detection API failed:", apiError);
    }
    
    // 3. Fallback to regex-based detection for longer text
    if (text.length > 20) {
      console.info("Attempting pattern-based language detection");
      const detectedLang = detectLanguageWithPatterns(text);
      if (detectedLang) {
        console.info(`Pattern detection found language: ${detectedLang}`);
        return detectedLang;
      }
    }
    
    const browserLang = normalizeLanguageCode(navigator.language);
    console.info(`Using browser language as fallback: ${browserLang}`);
    return browserLang;
    
  } catch (error) {
    console.error("All language detection methods failed:", error);
    return 'en'; // Default to English in case of complete failure
  }
};

/**
 * Helper function using script and word patterns for language detection
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
  
  // Check for script-specific patterns first (high confidence)
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
  
  // Score each language based on word frequency
  for (const [code, pattern] of Object.entries(commonWordPatterns)) {
    const matches = text.match(pattern);
    if (matches) {
      // Normalize score by text length to avoid bias towards longer texts
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
 * Gets or initializes a translator for a specific language pair using Chrome AI
 * 
 * @param sourceLang Source language code
 * @param targetLang Target language code
 * @returns Promise with the translator instance or null if unavailable
 */
export const getTranslator = async (sourceLang: string, targetLang: string): Promise<Translator | null> => {
  if (sourceLang === targetLang) return null;
  
  // Normalize language codes
  const normalizedSource = normalizeLanguageCode(sourceLang);
  const normalizedTarget = normalizeLanguageCode(targetLang);
  
  // Generate a cache key for this language pair
  const cacheKey = `${normalizedSource}_${normalizedTarget}`;
  
  try {
    // Check if we already have this translator in cache
    const capabilities = await getAICapabilities();
    if (capabilities.translator && capabilities.translator[cacheKey]) {
      return capabilities.translator[cacheKey];
    }
    
    // Access Chrome AI translator capability
    const ai = isChromeAIAvailable();
    if (!ai?.translator) {
      console.info("Chrome AI Translator not available");
      return null;
    }
    
    // Check if this language pair is supported
    const translatorCapabilities = await ai.translator.capabilities();
    const pairAvailability = await translatorCapabilities.languagePairAvailable(
      normalizedSource, 
      normalizedTarget
    );
    
    if (pairAvailability === 'no') {
      console.info(`Language pair ${normalizedSource}->${normalizedTarget} not supported by Chrome AI`);
      return null;
    }
    
    console.info(`Initializing Chrome AI Translator for ${normalizedSource}->${normalizedTarget}`);
    console.info(`Availability status: ${pairAvailability}`);
    
    // Create the translator with download progress tracking
    const translator = await ai.translator.create({
      sourceLanguage: normalizedSource,
      targetLanguage: normalizedTarget,
      monitor(m) {
        m.addEventListener('downloadprogress', (e: DownloadProgressEvent) => {
          console.info(`Translator download (${normalizedSource}->${normalizedTarget}): ${Math.round((e.loaded / e.total) * 100)}%`);
        });
      }
    });
    
    // Wait for the translator to be ready
    await translator.ready;
    console.info(`Chrome AI Translator ready for ${normalizedSource}->${normalizedTarget}`);
    
    // Cache the translator for future use
    if (aiCapabilitiesCache) {
      aiCapabilitiesCache.translator[cacheKey] = translator;
    }
    
    return translator;
    
  } catch (error) {
    console.warn(`Failed to initialize Chrome AI Translator (${normalizedSource}->${normalizedTarget}):`, error);
    return null;
  }
};

/**
 * Translates text using Chrome AI Translator with fallback mechanisms
 * 
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
  
  const normalizedSource = normalizeLanguageCode(sourceLang);
  const normalizedTarget = normalizeLanguageCode(targetLang);
  
  try {
    // 1. Try Chrome AI Translator (primary method)
    const translator = await getTranslator(normalizedSource, normalizedTarget);
    if (translator) {
      try {
        console.info(`Using Chrome AI Translator for ${normalizedSource}->${normalizedTarget}`);
        const translatedText = await translator.translate(text);
        if (translatedText) {
          return translatedText;
        }
      } catch (chromeError) {
        console.warn("Chrome AI translation failed:", chromeError);
      }
    }
    
    console.info("Chrome AI Translator unavailable, using fallbacks");
    
    // 2. Fallback to external translation services
    const services = [
      // MyMemory translation API
      async () => {
        console.info("Attempting MyMemory translation API");
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=${normalizedSource}|${normalizedTarget}`
        );
        const data = await response.json();
        if (data?.responseData?.translatedText) {
          // Parse HTML entities if needed
          const tempElement = document.createElement('div');
          tempElement.innerHTML = data.responseData.translatedText;
          return tempElement.textContent || tempElement.innerText;
        }
        throw new Error("No translation result from MyMemory");
      },
      
      // LibreTranslate API - secondary fallback
      async () => {
        console.info("Attempting LibreTranslate API");
        const response = await fetch(`https://libretranslate.com/translate`, {
          method: "POST",
          body: JSON.stringify({
            q: text.slice(0, 1000),
            source: normalizedSource,
            target: normalizedTarget,
          }),
          headers: { "Content-Type": "application/json" }
        });
        const data = await response.json();
        if (data?.translatedText) {
          return data.translatedText;
        }
        throw new Error("No translation result from LibreTranslate");
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
    
    // 3. If all services fail, return appropriate fallback message
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
    
    if (fallbackTranslations[normalizedSource]?.[normalizedTarget]) {
      return fallbackTranslations[normalizedSource][normalizedTarget];
    }
    
    return `[${normalizedSource}->${normalizedTarget} translation unavailable]`;
  } catch (error) {
    console.error("All translation methods failed:", error);
    return `[Translation Error: ${(error as Error).message}]`;
  }
};

/**
 * Summarizes text using Chrome AI Summarizer with fallback options
 * 
 * @param text Text to summarize
 * @param options Additional summarization options
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
  } as const;
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    // 1. Try Chrome AI Summarizer (primary method)
    const capabilities = await getAICapabilities();
    
    if (capabilities.summarizer) {
      try {
        console.info(`Using Chrome AI Summarizer (${mergedOptions.type}, ${mergedOptions.length})`);
        return await capabilities.summarizer.summarize(text, {
          context: mergedOptions.context || undefined
        });
      } catch (error) {
        console.warn("Chrome AI summarization failed:", error);
      }
    } else {
      console.info("Chrome AI Summarizer not available, using fallbacks");
    }
    
    
    // 2. Final fallback to local algorithm
    console.info("Using local summarization algorithm as final fallback");
    return createFallbackSummary(text, mergedOptions);
    
  } catch (error) {
    console.error("All summarization methods failed:", error);
    return `Failed to summarize text. Error: ${(error as Error).message}`;
  }
};

/**
 * Creates a basic summary using local algorithms when AI capabilities aren't available
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
  // Split text into sentences with regex
  const sentences = text
    .replace(/([.!?])\s*(?=[A-Z])/g, "$1|")
    .split("|")
    .filter(s => s.trim().length > 10);
  
  if (sentences.length === 0) return text;
  
  // Determine number of sentences to include based on requested length
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
        return `${sentences[0]} ${sentences[Math.floor(sentences.length / 2)]} ${sentences[sentences.length - 1]}`;
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
 * Improved with TF-IDF-like scoring
 */
function extractKeyPoints(text: string, count: number): string[] {
  const sentences = text
    .replace(/([.!?])\s*(?=[A-Z])/g, "$1|")
    .split("|")
    .filter(s => s.trim().length > 10);
  
  if (sentences.length <= count) {
    return sentences;
  }
  
  
  //const keyPoints = [sentences[0]];
  
  // Find important terms with improved algorithm
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  // Count word frequency
  const wordFreq: {[key: string]: number} = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  // Expanded stopwords list
  const stopwords = [
    'this', 'that', 'these', 'those', 'they', 'their', 'there', 'about',
    'would', 'could', 'should', 'from', 'have', 'been', 'were', 'when',
    'what', 'where', 'which', 'while', 'with', 'your', 'yours', 'also',
    'because', 'however', 'therefore', 'although', 'many', 'some', 'then'
  ];
  
  // Calculate TF-IDF-like scores, i am not really sure how this operataes
  const sentenceCount = sentences.length;
  const wordScores: {[key: string]: number} = {};
  
  Object.entries(wordFreq).forEach(([word, freq]) => {
    if (stopwords.includes(word)) return;
    
    // Count how many sentences contain this word
    const sentencesWithWord = sentences.filter(sentence => 
      sentence.toLowerCase().includes(word)
    ).length;
    
    // Term frequency * inverse document frequency
    const tf = freq / words.length;
    const idf = Math.log(sentenceCount / (1 + sentencesWithWord));
    wordScores[word] = tf * idf;
  });
  
  // Get top scoring words
  const importantTerms = Object.entries(wordScores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, 15)
    .map(([word]) => word);
  
  // Score sentences based on important terms and position
  const scoredSentences = sentences.slice(1).map((sentence, index) => {
    // Term score - how many important terms it contains
    const termScore = importantTerms.reduce((score, term) => {
      return score + (sentence.toLowerCase().includes(term) ? wordScores[term] : 0);
    }, 0);
    
    // Position score - earlier sentences tend to be more important
    const positionScore = 1 - (index / sentences.length);
    
    // Length score - penalize very short or very long sentences
    const idealLength = 20; // words
    const sentenceWords = sentence.split(/\s+/).length;
    const lengthScore = 1 - Math.min(1, Math.abs(sentenceWords - idealLength) / idealLength);
    
    // Combined score with weights
    const score = (termScore * 0.6) + (positionScore * 0.3) + (lengthScore * 0.1);
    
    return { sentence, score, index: index + 1 };
  });
  
  // Sort by score and take top sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, count - 1);
  
  // Combine with first sentence and sort by original position
  const allSelectedSentences = [
    { sentence: sentences[0], index: 0 },
    ...topSentences
  ].sort((a, b) => a.index - b.index);
  
  // Return sentences in their original order
  return allSelectedSentences.map(item => item.sentence);
}

/**
 * Initialize all AI capabilities at app startup
 * This will allow the models download in the background
 */
export const preloadAICapabilities = (): void => {
  console.info("Preloading Chrome AI capabilities...");
  getAICapabilities()
    .then(capabilities => {
      const status = {
        languageDetector: capabilities.detector ? "Available" : "Unavailable",
        translator: Object.keys(capabilities.translator).length > 0 ? "Available" : "Not yet initialized",
        summarizer: capabilities.summarizer ? "Available" : "Unavailable"
      };
      console.info("Chrome AI capabilities loaded:", status);
    })
    .catch(err => {
      console.warn("Failed to preload Chrome AI capabilities:", err);
    });
};
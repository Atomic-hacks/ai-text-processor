/* eslint-disable @typescript-eslint/no-explicit-any */
//import { LANGUAGES } from './data/language-data';

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

interface BrowserAI {
  languageDetector?: {
    capabilities(): Promise<LanguageDetectorCapabilities>;
    create(): Promise<LanguageDetector>;
  };
  translator?: {
    capabilities(): Promise<TranslatorCapabilities>;
    create(options: {
      sourceLanguage: string;
      targetLanguage: string;
    }): Promise<Translator>;
  };
  summarizer?: {
    capabilities(): Promise<SummarizerCapabilities>;
    create(options?: {
      type?: 'key-points' | 'tl;dr' | 'teaser' | 'headline';
      format?: 'markdown' | 'plain-text';
      length?: 'short' | 'medium' | 'long';
    }): Promise<Summarizer>;
  };
}

// Check for Chrome AI availability
const isChromeAIAvailable = (): BrowserAI | null => {
  return (typeof self !== 'undefined' && 'ai' in self) ? (self as any).ai as BrowserAI : null;
};

// Language detector implementation
export async function detectLanguage(text: string): Promise<string> {
  if (!text?.trim()) {
    return 'en';
  }

  const ai = isChromeAIAvailable();
  if (!ai?.languageDetector) {
    throw new Error('Language detection not available');
  }

  const capabilities = await ai.languageDetector.capabilities();
  if (capabilities.available === 'no') {
    throw new Error('Language detection not supported on this device');
  }

  const detector = await ai.languageDetector.create();
  await detector.ready;

  const results = await detector.detect(text);
  if (!results?.length) {
    throw new Error('No language detected');
  }

  return results[0].detectedLanguage;
}

// Translator implementation
export async function translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
  if (!text || sourceLang === targetLang) {
    return text;
  }

  const ai = isChromeAIAvailable();
  if (!ai?.translator) {
    throw new Error('Translation not available');
  }

  const capabilities = await ai.translator.capabilities();
  const availability = await capabilities.languagePairAvailable(sourceLang, targetLang);
  
  if (availability === 'no') {
    throw new Error(`Translation not supported for ${sourceLang} to ${targetLang}`);
  }

  const translator = await ai.translator.create({
    sourceLanguage: sourceLang,
    targetLanguage: targetLang
  });
  await translator.ready;

  return await translator.translate(text);
}

// Summarizer implementation
export async function summarizeText(
  text: string,
  options: {
    type?: 'key-points' | 'tl;dr' | 'teaser' | 'headline';
    format?: 'markdown' | 'plain-text';
    length?: 'short' | 'medium' | 'long';
    context?: string;
  } = {}
): Promise<string> {
  if (!text || text.length < 100) {
    return text;
  }

  const ai = isChromeAIAvailable();
  if (!ai?.summarizer) {
    throw new Error('Summarization not available');
  }

  const capabilities = await ai.summarizer.capabilities();
  if (capabilities.available === 'no') {
    throw new Error('Summarization not supported on this device');
  }

  const summarizer = await ai.summarizer.create({
    type: options.type || 'key-points',
    format: options.format || 'markdown',
    length: options.length || 'medium'
  });
  await summarizer.ready;

  return await summarizer.summarize(text, {
    context: options.context
  });
}

// Initialize Chrome AI features
export async function initializeChromeAI(): Promise<void> {
  const ai = isChromeAIAvailable();
  if (!ai) {
    throw new Error('Chrome AI not available in this browser');
  }

  const capabilities = {
    detector: (await ai.languageDetector?.capabilities())?.available || 'no',
    translator: (await ai.translator?.capabilities())?.available || 'no',
    summarizer: (await ai.summarizer?.capabilities())?.available || 'no'
  };

  if (Object.values(capabilities).every(cap => cap === 'no')) {
    throw new Error('No Chrome AI capabilities available on this device');
  }
}
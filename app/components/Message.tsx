 'use client';

import React, { useState } from 'react';
import {  Loader2, Sparkles, Type, ChevronDown, X,} from 'lucide-react';
import { motion } from 'framer-motion';
import { translateText, summarizeText } from '../../utils/chromeApi';
import { LANGUAGES, getLanguageByCode } from '@/utils/data/language-data';

interface ProcessedItem {
  id: string;
  type: 'summary' | 'translation';
  content: string;
  language?: string;
  timestamp: number;
}

export interface Message {
  id: number;
  text: string;
  language: string;
  processed: ProcessedItem[];
  timestamp: number;
}

interface MessageComponentProps {
  message: Message;
  onUpdate: (updatedMessage: Message) => void;
}

const MessageComponent: React.FC<MessageComponentProps> = ({ message, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [processingType, setProcessingType] = useState<string | null>(null);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSummarize = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setProcessingType('summary');
    
    try {
      const [summary] = await Promise.all([
        summarizeText(message.text),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);
      
      const updatedMessage = {
        ...message,
        processed: [...message.processed, {
          id: `sum-${Date.now()}`,
          type: 'summary' as const,
          content: summary,
          timestamp: Date.now()
        }]
      };
      
      onUpdate(updatedMessage);
    } catch (error) {
      console.error("Error summarizing text:", error);
    } finally {
      setIsLoading(false);
      setProcessingType(null);
    }
  };

  const handleTranslate = async (targetLang: string) => {
    // Avoid translating to the same language
    if (message.language === targetLang || isLoading) return;

    setIsLoading(true);
    setProcessingType(`translate-${targetLang}`);

    try {
      
      const [translation] = await Promise.all([
        translateText(message.text, message.language, targetLang),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);
      
      const updatedMessage = {
        ...message,
        processed: [...message.processed, {
          id: `tr-${targetLang}-${Date.now()}`,
          type: 'translation' as const,
          content: translation,
          language: targetLang,
          timestamp: Date.now()
        }]
      };
      
      onUpdate(updatedMessage);
    } catch (error) {
      console.error("Error translating text:", error);
    } finally {
      setIsLoading(false);
      setProcessingType(null);
    }
  };

  const removeProcessedItem = (itemId: string) => {
    const updatedMessage = {
      ...message,
      processed: message.processed.filter(item => item.id !== itemId)
    };
    onUpdate(updatedMessage);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      className="group relative bg-gray-800/90 border border-gray-700 rounded-xl overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-black to-blue-600"></div>
      
      <div className="p-3 sm:p-5 bg-black/35">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gray-700 rounded-md">
              {getLanguageByCode(message.language).flag || '🌐'}
            </div>
            <span className="text-xs text-gray-400">{formatTimestamp(message.timestamp)}</span>
          </div>
        </div>
        
        <p className="text-base sm:text-lg text-gray-100 leading-relaxed whitespace-pre-line break-words">{message.text}</p>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <button 
            onClick={handleSummarize}
            disabled={isLoading && processingType === 'summary'}
            className={`${
              isLoading && processingType === 'summary'
                ? 'bg-emerald-600/50 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
            } text-white rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 transition-colors`}
          >
            {isLoading && processingType === 'summary' ? (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
            <span className="hidden xs:inline">Summarize</span>
            <span className="xs:hidden">Sum</span>
          </button>
          
          <div className="relative group/translate">
            <button 
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
            >
              <Type className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Translate</span>
              <span className="xs:hidden">Trans</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            
            <div className="hidden group-hover/translate:block absolute top-full left-0 mt-1 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden w-40 sm:w-48 max-h-60 overflow-y-auto">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  disabled={isLoading && processingType === `translate-${lang.code}` || message.language === lang.code}
                  onClick={() => handleTranslate(lang.code)}
                  className={`w-full text-left px-2 sm:px-3 py-2 flex items-center gap-2 text-xs sm:text-sm ${
                    isLoading && processingType === `translate-${lang.code}`
                      ? 'bg-gray-700/50 cursor-not-allowed'
                      : message.language === lang.code
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-700 active:bg-gray-600 text-white'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                  {isLoading && processingType === `translate-${lang.code}` && (
                    <Loader2 className="w-3 h-3 ml-auto animate-spin" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {message.processed.length > 0 && (
        <div className="border-t border-gray-700 bg-gray-850">
          <div className="divide-y divide-gray-700/70">
            {message.processed.map((proc) => (
              <motion.div
                key={proc.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="p-3 sm:p-4 relative group/result"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    {proc.type === 'summary' ? (
                      <div className="p-1 bg-emerald-500/20 rounded text-emerald-400">
                        <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                    ) : (
                      <div className="p-1 bg-blue-500/20 rounded text-blue-400">
                        <Type className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                    )}
                    <p className="text-xs font-medium text-gray-300">
                      {proc.type === 'translation' 
                        ? `Translation (${getLanguageByCode(proc.language || 'en').flag} ${getLanguageByCode(proc.language || 'en').name})` 
                        : 'Key Points Summary'}
                    </p>
                    <span className="text-xs text-gray-500">{formatTimestamp(proc.timestamp)}</span>
                  </div>
                  
                  <button
                    onClick={() => removeProcessedItem(proc.id)}
                    className="opacity-0 group-hover/result:opacity-100 p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-opacity"
                    aria-label="Remove"
                  >
                    <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
                
                <div className="text-sm sm:text-base text-gray-200 leading-relaxed pl-3 sm:pl-6 whitespace-pre-line break-words">
                  {proc.content}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MessageComponent;
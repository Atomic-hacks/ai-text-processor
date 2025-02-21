'use client'
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, Type, ChevronDown, X, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translateText, summarizeText } from '../../utils/chromeApi';
import { LANGUAGES, getLanguageByCode } from '@/utils/data/language-data';

/**
 * Types for processed items (translations/summaries) within a message
 */
interface ProcessedItem {
  id: string;
  type: 'summary' | 'translation';
  content: string;
  language?: string;
  timestamp: number;
  text: string;
}

/**
 * Message interface representing chat messages with their processed variants
 */
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

/**
 * MessageComponent displays a chat message with translation and summarization capabilities
 * using Chrome AI API integration
 */
const MessageComponent: React.FC<MessageComponentProps> = ({ message, onUpdate }) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [processingType, setProcessingType] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showTranslateDropdown, setShowTranslateDropdown] = useState(false);

  // Refs for handling click outside behavior
  const translateButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the translation dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node) && 
          !translateButtonRef.current?.contains(event.target as Node)) {
        setShowTranslateDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Formats a timestamp into a localized time string
   */
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  /**
   * Handles text summarization using Chrome AI API
   * Includes minimum loading time to prevent UI flashing
   */
  const handleSummarize = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setProcessingType('summary');
    
    try {
      const [summary] = await Promise.all([
        summarizeText(message.text),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);
      
      const newProcessedItem: ProcessedItem = {
        id: `sum-${Date.now()}`,
        type: 'summary',
        content: summary,
        timestamp: Date.now(),
        text: ''
      };

      onUpdate({
        ...message,
        processed: [...message.processed, newProcessedItem]
      });
    } catch (error) {
      console.error("Error summarizing text:", error);
    } finally {
      setIsLoading(false);
      setProcessingType(null);
    }
  };

  /**
   * Handles text translation using Chrome AI API
   * Includes minimum loading time to prevent UI flashing
   */
  const handleTranslate = async (targetLang: string) => {
    if (message.language === targetLang || isLoading) return;
    
    setIsLoading(true);
    setProcessingType(`translate-${targetLang}`);
    setShowTranslateDropdown(false);

    try {
      const [translation] = await Promise.all([
        translateText(message.text, message.language, targetLang),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);
      
      const newProcessedItem: ProcessedItem = {
        id: `tr-${targetLang}-${Date.now()}`,
        type: 'translation',
        content: translation,
        language: targetLang,
        timestamp: Date.now(),
        text: ''
      };

      onUpdate({
        ...message,
        processed: [...message.processed, newProcessedItem]
      });
    } catch (error) {
      console.error("Error translating text:", error);
    } finally {
      setIsLoading(false);
      setProcessingType(null);
    }
  };

  /**
   * Removes a processed item (translation/summary) from the message
   */
  const removeProcessedItem = (itemId: string) => {
    onUpdate({
      ...message,
      processed: message.processed.filter(item => item.id !== itemId)
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      className="group relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 border border-gray-700 rounded-xl overflow-hidden shadow-lg"
    >
      {/* Gradient header bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
      
      <div className="p-4 sm:p-5">
        {/* Message header with language and timestamp */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gray-700/50 backdrop-blur-sm rounded-lg shadow-inner">
              {getLanguageByCode(message.language).flag || '🌐'}
            </div>
            <span className="text-xs font-medium text-gray-400">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          
          <button
            onClick={() => setShowActions(!showActions)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-700/30 transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        
        {/* Message content */}
        <p className="text-base sm:text-lg text-gray-100 leading-relaxed whitespace-pre-line break-words">
          {message.text}
        </p>
        
        {/* Action buttons */}
        <div className={`mt-4 flex flex-wrap gap-2 ${showActions || 'md:flex'} ${showActions ? 'flex' : 'hidden'}`}>
          {/* Summarize button */}
          <button
            onClick={handleSummarize}
            disabled={isLoading && processingType === 'summary'}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-300"
          >
            {isLoading && processingType === 'summary' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Summarize
          </button>
          
          {/* Translate dropdown */}
          <div className="relative z-50">
            <button
              ref={translateButtonRef}
              onClick={() => setShowTranslateDropdown(!showTranslateDropdown)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 shadow-lg transition-all duration-300"
            >
              <Type className="w-4 h-4" />
              Translate
              <ChevronDown className={`w-3 h-3 transition-transform ${showTranslateDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Language selection dropdown */}
            {showTranslateDropdown && (
              <div
                ref={dropdownRef}
                className="fixed overflow-scroll transform translate-y-2 w-48 rounded-lg bg-gray-800 border border-gray-700 shadow-xl"
                style={{
                  maxHeight: '60vh',
                  top: translateButtonRef.current?.getBoundingClientRect().bottom ?? 0,
                  left: translateButtonRef.current?.getBoundingClientRect().left ?? 0,
                }}
              >
                <div className="py-1 overflow-y-auto">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      disabled={isLoading && processingType === `translate-${lang.code}` || message.language === lang.code}
                      onClick={() => handleTranslate(lang.code)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm
                        ${isLoading && processingType === `translate-${lang.code}`
                          ? 'bg-gray-700/50 cursor-not-allowed'
                          : message.language === lang.code
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'hover:bg-gray-700/50 active:bg-gray-600 text-white'
                        } transition-colors`}
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
            )}
          </div>
        </div>
      </div>
      
      {/* Processed items section (translations/summaries) */}
      <AnimatePresence>
        {message.processed.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-700/50 bg-gray-800/50 backdrop-blur-sm"
          >
            <div className="divide-y divide-gray-700/30">
              {message.processed.map((proc) => (
                <motion.div
                  key={proc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 relative group/result"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {proc.type === 'summary' ? (
                        <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                          <Type className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <p className="text-xs font-medium text-gray-300">
                        {proc.type === 'translation' 
                          ? `${getLanguageByCode(proc.language || 'en').flag} ${getLanguageByCode(proc.language || 'en').name}` 
                          : 'Summary'}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(proc.timestamp)}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => removeProcessedItem(proc.id)}
                      className="opacity-0 group-hover/result:opacity-100 p-1.5 rounded-lg hover:bg-gray-700/30 text-gray-400 hover:text-gray-200 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="text-sm sm:text-base text-gray-200 leading-relaxed pl-4 sm:pl-6 whitespace-pre-line break-words">
                    {proc.content}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MessageComponent;
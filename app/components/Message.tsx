'use client'
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, Type, ChevronDown, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translateText, summarizeText } from '../../utils/chromeApi';
import { LANGUAGES, getLanguageByCode } from '@/utils/data/language-data';

/**
 * Represents a processed item (translation or summary) within a message
 * @interface ProcessedItem
 * @property {string} id - Unique identifier for the processed item
 * @property {'summary' | 'translation'} type - Type of processing performed
 * @property {string} content - The processed content
 * @property {string} [language] - Target language code for translations
 * @property {number} timestamp - Processing timestamp
 * @property {string} text - Original text that was processed
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
 * Represents a message with its metadata and processed variants
 * @interface Message
 * @property {number} id - Unique identifier for the message
 * @property {string} text - Original message content
 * @property {string} language - Source language code
 * @property {ProcessedItem[]} processed - Array of processed variants
 * @property {number} timestamp - Message creation timestamp
 */
export interface Message {
  id: number;
  text: string;
  language: string;
  processed: ProcessedItem[];
  timestamp: number;
}

/**
 * Props for the MessageComponent
 * @interface MessageComponentProps
 * @property {Message} message - The message to display
 * @property {function} onUpdate - Callback for message updates
 * @property {function} [onClearMessages] - Optional callback for clearing messages
 */
interface MessageComponentProps {
  message: Message;
  onUpdate: (updatedMessage: Message) => void;
  onClearMessages?: () => void;
}

/**
 * A component that displays a message with translation and summarization capabilities
 * Supports mobile-responsive design with a floating clear button
 * 
 * @component
 * @param {MessageComponentProps} props - Component props
 * @returns {JSX.Element} Rendered message component
 */
const MessageComponent: React.FC<MessageComponentProps> = ({ message, onUpdate, onClearMessages }) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [processingType, setProcessingType] = useState<string | null>(null);
  const [showTranslateDropdown, setShowTranslateDropdown] = useState(false);
  
  // Refs for handling click outside behavior
  const translateButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Handles clicks outside the translation dropdown to close it
   * @effect
   */
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
   * @param {number} timestamp - Unix timestamp to format
   * @returns {string} Formatted time string
   */
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  /**
   * Handles text summarization request
   * Includes minimum loading time to prevent UI flashing
   * @async
   */
  const handleSummarize = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setProcessingType('summary');
    
    try {
      const [summary] = await Promise.all([
        summarizeText(message.text),
        new Promise(resolve => setTimeout(resolve, 800)) // Minimum loading time
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
   * Handles text translation request
   * @async
   * @param {string} targetLang - Target language code
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
   * Removes a processed item from the message
   * @param {string} itemId - ID of the item to remove
   */
  const removeProcessedItem = (itemId: string) => {
    onUpdate({
      ...message,
      processed: message.processed.filter(item => item.id !== itemId)
    });
  };

  return (
    <section className="relative flex flex-col items-start justify-center w-full h-full p-4">
      {/* Main message container with animation */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 border border-gray-700 rounded-xl overflow-hidden shadow-lg"
      >
        {/* Gradient header bar */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-black" />
        
        <div className="p-4">
          {/* Message header with language indicator and timestamp */}
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 bg-gray-700/50 rounded-lg text-sm">
              {getLanguageByCode(message.language).flag}
            </div>
            <span className="text-xs text-gray-400">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          
          {/* Message content */}
          <p className="text-base z-10 text-gray-100 leading-relaxed break-words">
            {message.text}
          </p>
          
          {/* Action buttons container */}
          <div className="mt-4 flex flex-wrap gap-2">
            {/* Summarize button */}
            <button
              onClick={handleSummarize}
              disabled={isLoading && processingType === 'summary'}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
            >
              {isLoading && processingType === 'summary' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Summarize
            </button>
            
            {/* Translation dropdown container */}
            <div className="relative">
              <button
                ref={translateButtonRef}
                onClick={() => setShowTranslateDropdown(!showTranslateDropdown)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 shadow-md transition-all"
              >
                <Type className="w-3.5 h-3.5" />
                Translate
                <ChevronDown className={`w-3 h-3 transition-transform ${showTranslateDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Language selection dropdown */}
              {showTranslateDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute z-50 mt-2 w-44 rounded-lg bg-gray-800 border border-gray-700 shadow-xl max-h-60 overflow-y-auto"
                >
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      disabled={isLoading && processingType === `translate-${lang.code}` || message.language === lang.code}
                      onClick={() => handleTranslate(lang.code)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm
                        ${message.language === lang.code
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'hover:bg-gray-700/50 text-white'
                        } transition-colors`}
                    >
                      {lang.flag} {lang.name}
                      {isLoading && processingType === `translate-${lang.code}` && (
                        <Loader2 className="w-3 h-3 ml-auto animate-spin" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Processed items section with animations */}
        <AnimatePresence>
          {message.processed.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-gray-700/50 bg-gray-800/50 backdrop-blur-sm"
            >
              {message.processed.map((proc) => (
                <motion.div
                  key={proc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 relative group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {proc.type === 'summary' ? (
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Type className="w-3.5 h-3.5 text-blue-400" />
                      )}
                      <span className="text-xs text-gray-300">
                        {proc.type === 'translation' 
                          ? getLanguageByCode(proc.language || 'en').flag
                          : 'Summary'}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => removeProcessedItem(proc.id)}
                      className="p-1 rounded-lg hover:bg-gray-700/30 text-gray-400 hover:text-gray-200 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-200 leading-relaxed pl-4 break-words">
                    {proc.content}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Mobile-only floating clear button with bounce animation */}
      <motion.button
        onClick={onClearMessages}
        className="fixed bottom-6 right-6 p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg md:hidden z-50"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: [0.8, 1, 0.8],
          opacity: 1
        }}
        transition={{
          scale: {
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut"
          },
          opacity: {
            duration: 0.3
          }
        }}
      >
        <Trash2 className="w-6 h-6 text-white" />
      </motion.button>
    </section>
  );
};

export default MessageComponent;
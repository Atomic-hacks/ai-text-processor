//omo my code is messy so i used ai for comments cause whenever i asked to clean it just kept messing my code up so yea, my designnis original and i did everything myself you can proof as much as you want
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Languages, ArrowRight, Loader2, Sparkles, Send, MessageSquare, ChevronDown, Check, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LANGUAGES } from '../../utils/data/language-data';
import MessageComponent, { Message } from './Message';
import { detectLanguage } from '../../utils/chromeApi';

const TextProcessor = () => {
  // State management
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAutoDetect, setIsAutoDetect] = useState(true);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle outside clicks for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  // Focus input when intro is closed
  useEffect(() => {
    if (!showIntro && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showIntro]);

  // Auto-detect language when input changes and auto-detect is enabled
  useEffect(() => {
    const detectInputLanguage = async () => {
      if (isAutoDetect && inputText.trim().length > 5) {
        try {
          const detectedCode = await detectLanguage(inputText);
          const detectedLang = LANGUAGES.find(lang => lang.code === detectedCode);
          if (detectedLang && detectedLang.code !== language.code) {
            setLanguage(detectedLang);
          }
        } catch (error) {
          console.error("Language detection failed:", error);
        }
      }
    };

    // Use debounce to avoid excessive API calls
    const timeoutId = setTimeout(detectInputLanguage, 500);
    return () => clearTimeout(timeoutId);
  }, [inputText, isAutoDetect, language.code]);


  const handleSendMessage = async () => {
    if (inputText.trim() === '' || isLoading) return;
    
    setIsLoading(true);
    
    try {
      let msgLanguage = language.code;
      
      // Final language detection check
      if (isAutoDetect) {
        try {
          const detectedCode = await detectLanguage(inputText);
          if (detectedCode && LANGUAGES.some(lang => lang.code === detectedCode)) {
            msgLanguage = detectedCode;
          }
        } catch (error) {
          console.warn("Send-time language detection failed:", error);
        }
      }
      
      const newMessage: Message = {
        id: Date.now(),
        text: inputText,
        language: msgLanguage,
        processed: [],
        timestamp: Date.now()
      };
      
      setMessages([...messages, newMessage]);
      setInputText('');
      
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const updateMessage = (updatedMessage: Message) => {
    setMessages(prev => 
      prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col items-center">
      <AnimatePresence>
        {showIntro && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative w-full max-w-2xl mx-4 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700 p-1"
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gMjAgMCBMIDAgMCAwIDIwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
              <div className="relative bg-gray-900 rounded-xl overflow-hidden p-8">
                <div className="absolute top-0 left-0 w-full h-1">
                  <div className="h-full bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-500"></div>
                </div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 mb-5 rounded-full bg-emerald-500/20 text-emerald-400">
                    <Languages className="w-10 h-10" />
                  </div>
                  
                  <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
                    Atomic did Something
                  </h1>
                  
                  <p className="mt-4 text-gray-300 max-w-lg">
                    I really have no idea what it does just click the button and find out
                  </p>
                  
                  <div className="mt-8 w-full max-w-lg">
                    <motion.div 
                      className="flex flex-col space-y-3"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: {
                            staggerChildren: 0.15
                          }
                        }
                      }}
                    >
                      <motion.div 
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 }
                        }}
                        className="flex items-center p-4 bg-gray-800/60 rounded-lg"
                      >
                        <div className="p-2 mr-4 bg-emerald-500/20 rounded-full text-emerald-400">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-200">Smart Summarization</h3>
                          <p className="text-sm text-gray-400">I think it just shortens text and makes it more concise and comprehensive</p>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 }
                        }}
                        className="flex items-center p-4 bg-gray-800/60 rounded-lg"
                      >
                        <div className="p-2 mr-4 bg-blue-500/20 rounded-full text-blue-400">
                          <Type className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-200">Multilingual Translation</h3>
                          <p className="text-sm text-gray-400">No igbo and hausa are not available, but i have spansih (Hola senorita)</p>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 }
                        }}
                        className="flex items-center p-4 bg-gray-800/60 rounded-lg"
                      >
                        <div className="p-2 mr-4 bg-purple-500/20 rounded-full text-purple-400">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-200">Intuitive Interface</h3>
                          <p className="text-sm text-gray-400">you probably thought i spelt spanish wrong and if you didnt notice you just checked, anyways i dont even know what intuitive means lmao just see what that does yourself, i have deadline can&apos;t be googling the meaning of these words</p>
                        </div>
                      </motion.div>
                    </motion.div>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowIntro(false)}
                      className="mt-8 w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-medium flex items-center justify-center group"
                    >
                      Click the button Unc/aunt 
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.5 }} 
        className="sticky top-0 w-full bg-gray-900/90 backdrop-blur-md z-10 border-b border-gray-800"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-500/20 rounded-md text-emerald-400">
              <Languages className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
              AI Text Processor
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center mr-3">
              <input
                type="checkbox"
                id="autoDetect"
                checked={isAutoDetect}
                onChange={(e) => setIsAutoDetect(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-700 bg-gray-800 accent-emerald-500 mr-2"
              />
              <label htmlFor="autoDetect" className="text-sm text-gray-300">Auto-detect</label>
            </div>
            <div className="text-sm text-gray-400">Language:</div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-750 text-sm"
                disabled={isAutoDetect}
              >
                <span>{language.flag}</span>
                <span>{language.name}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {dropdownOpen && (
                <div className="absolute right-0 mt-1 py-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-700 ${
                        lang.code === language.code ? 'bg-gray-700/50 text-emerald-400' : 'text-gray-200'
                      }`}
                      onClick={() => {
                        setLanguage(lang);
                        setDropdownOpen(false);
                      }}
                    >
                      <span className="w-6 text-center">{lang.flag}</span>
                      <span>{lang.name}</span>
                      {lang.code === language.code && (
                        <Check className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="w-full max-w-4xl mx-auto px-4 pt-6 pb-32">
        <AnimatePresence>
          {messages.length === 0 && !showIntro && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center h-[60vh] text-center"
            >
              <div className="p-4 mb-6 rounded-full bg-gray-800/80 border border-gray-700">
                <MessageSquare className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-medium text-gray-200 mb-2">Start a new conversation</h2>
              <p className="text-gray-400 max-w-md">
                Enter text below to begin. You can summarize or translate your text with just a click.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="space-y-6">
          {messages.map((message) => (
            <MessageComponent 
              key={message.id} 
              message={message} 
              onUpdate={updateMessage} 
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="fixed bottom-0 w-full bg-gray-900/95 backdrop-blur-md border-t border-gray-800 py-4 px-4"
      >
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-700 bg-gray-800/80 backdrop-blur-sm">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type your message in ${isAutoDetect ? 'any language' : language.name}...`}
              className="w-full bg-transparent text-white px-4 py-3 resize-none min-h-[60px] max-h-[200px] outline-none"
              rows={1}
              disabled={isLoading}
            />
            
            <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendMessage}
                disabled={inputText.trim() === '' || isLoading}
                className={`${
                  inputText.trim() === '' || isLoading
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400'
                } text-white rounded-lg p-2 flex items-center transition-all`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </motion.button>
            </div>
          </div>
          
          <div className="flex justify-center mt-3">
            <p className="text-xs text-gray-400">
              {isAutoDetect ? '🪄 Auto-detecting language' : `${language.flag} Typing in ${language.name}`} • Press Enter to send
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TextProcessor;
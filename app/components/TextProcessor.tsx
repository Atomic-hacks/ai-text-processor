"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Languages,
  ArrowRight,
  Loader2,
  Sparkles,
  Send,
  MessageSquare,
  ChevronDown,
  Check,
  Type,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LANGUAGES } from "../../utils/data/language-data";
import MessageComponent, { Message } from "./Message";
import {
  detectLanguage,
  translateText,
  summarizeText,
} from "../../utils/chromeApi";

const TextProcessor = () => {
  // Core state management
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [isAutoDetect, setIsAutoDetect] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle textarea auto-resize
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(
        inputRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [inputText]);

  // Focus input after intro closes
  useEffect(() => {
    if (!showIntro && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showIntro]);

  // Auto-detect language with debounce
  useEffect(() => {
    const detectInputLanguage = async () => {
      if (!isAutoDetect || inputText.trim().length <= 5) return;

      try {
        const detectedCode = await detectLanguage(inputText);
        const detectedLang = LANGUAGES.find(
          (lang) => lang.code === detectedCode
        );

        if (detectedLang && detectedLang.code !== selectedLanguage.code) {
          setSelectedLanguage(detectedLang);
        }
      } catch (error) {
        console.error("Language detection failed:", error);
      }
    };

    const debounceTimeout = setTimeout(detectInputLanguage, 500);
    return () => clearTimeout(debounceTimeout);
  }, [inputText, isAutoDetect, selectedLanguage.code]);

  const handleSendMessage = async () => {
    if (inputText.trim() === "" || isLoading) return;
    setIsLoading(true);

    try {
      let messageLanguage = selectedLanguage.code;

      if (isAutoDetect) {
        try {
          const detectedCode = await detectLanguage(inputText);
          if (
            detectedCode &&
            LANGUAGES.some((lang) => lang.code === detectedCode)
          ) {
            messageLanguage = detectedCode;
          }
        } catch (error) {
          console.warn("Send-time language detection failed:", error);
        }
      }

      const newMessage: Message = {
        id: Date.now(),
        text: inputText,
        language: messageLanguage,
        processed: [],
        timestamp: Date.now(),
      };

      // Process translations and summaries concurrently
      const [translatedText, summarizedText] = await Promise.all([
        translateText(inputText, messageLanguage, selectedLanguage.code),
        summarizeText(inputText, { type: "key-points", format: "markdown" }),
      ]);

      newMessage.processed = [
        {
          type: "translation",
          text: translatedText,
          id: "",
          content: "",
          timestamp: 0,
        },
        {
          type: "summary",
          text: summarizedText,
          id: "",
          content: "",
          timestamp: 0,
        },
      ];

      setMessages((prev) => [...prev, newMessage]);
      setInputText("");

      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Message processing failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const updateMessage = (updatedMessage: Message) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
    );
  };

  return (
    <div className="relative bg-gradient-to-br from-black via-neutral-950 to-gray-900 text-white flex flex-col items-center min-h-screen">
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -70 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-md p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative w-full max-w-md mx-auto my-4 rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700"
            >
              <div className="relative bg-black/90 rounded-xl overflow-hidden p-5 sm:p-8">
                <div className="absolute top-0 left-0 w-full h-1">
                  <div className="h-full bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-500"></div>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="p-3 mb-4 rounded-full bg-emerald-500/20 text-emerald-400">
                    <Languages className="w-8 h-8" />
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
                    Atomic did Something
                  </h1>

                  <p className="mt-3 text-gray-300 text-sm sm:text-base">
                    I really have no idea what it does just click the button and
                    find out
                  </p>

                  <div className="mt-6 w-full">
                    <motion.div
                      className="flex flex-col space-y-3"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: { staggerChildren: 0.15 },
                        },
                      }}
                    >
                      <motion.div
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        className="flex items-start p-3 bg-black/50 opacity-80 backdrop-blur-xl rounded-lg"
                      >
                        <div className="p-2 mr-3 bg-emerald-500/20 rounded-full text-emerald-400 flex-shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm sm:text-base text-gray-200 text-start">
                            Smart Summarization
                          </h3>
                          <p className="text-xs sm:text-sm text-left text-gray-400">
                            I&apos;m not really sure what this does, probably
                            makes it more concise and comprehensive idk
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        className="flex items-start p-3 bg-black/50 opacity-80 backdrop-blur-xl rounded-lg"
                      >
                        <div className="p-2 mr-3 bg-blue-500/20 rounded-full text-blue-400 flex-shrink-0 mt-0.5">
                          <Type className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm sm:text-base text-gray-200 text-start">
                            Multilingual Translation
                          </h3>
                          <p className="text-xs sm:text-sm text-start text-gray-400">
                            no there is no yoruba, there is spanish tho (bonjour
                            senorita 🙃)
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        className="flex items-start p-3 bg-black/50 opacity-40 backdrop-blur-3xl rounded-lg"
                      >
                        <div className="p-2 mr-3 bg-purple-500/20 rounded-full text-purple-400 flex-shrink-0 mt-0.5">
                          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm sm:text-base text-gray-200 text-start">
                            Intuitive Interface and Language detection
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-400 text-start">
                            My designs are the best argue with yourself, also
                            the languages you type in are auto detetcted (You
                            can turn it off if you don&apos;t want it na my
                            fault say i add innovative features)
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowIntro(false)}
                      className="mt-6 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-medium flex items-center justify-center group text-sm sm:text-base"
                    >
                      Click the button Unc/aunt
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 w-full bg-gradient-to-t from-black/50 to-emerald-900 backdrop-blur-xl z-10 border-b border-gray-800"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 rounded-md text-emerald-400">
              <Languages className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
              Atomic did Something
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center mr-2">
              <input
                type="checkbox"
                id="autoDetect"
                checked={isAutoDetect}
                onChange={(e) => setIsAutoDetect(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-700 bg-gray-800 accent-emerald-500 mr-2"
              />
              <label
                htmlFor="autoDetect"
                className="text-xs sm:text-sm text-gray-300"
              >
                Auto-detect
              </label>
            </div>
            <div className="text-xs sm:text-sm text-gray-400 hidden xs:block">
              Lang:
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-750 text-sm"
                disabled={isAutoDetect}
              >
                <span>{selectedLanguage.flag}</span>
                <span>{selectedLanguage.name}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-1 py-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-700 ${
                        lang.code === selectedLanguage.code
                          ? "bg-gray-700/50 text-emerald-400"
                          : "text-gray-200"
                      }`}
                      onClick={() => {
                        setSelectedLanguage(lang);
                        setDropdownOpen(false);
                      }}
                    >
                      <span className="w-6 text-center">{lang.flag}</span>
                      <span>{lang.name}</span>
                      {lang.code === selectedLanguage.code && (
                        <Check className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="block sm:hidden ml-1">
              <input
                type="checkbox"
                id="autoDetectMobile"
                checked={isAutoDetect}
                onChange={(e) => setIsAutoDetect(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-700 bg-gray-800 accent-emerald-500"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-24 sm:pb-32">
        <AnimatePresence>
          {messages.length === 0 && !showIntro && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center h-[60vh] text-center"
            >
              <div className="p-3 sm:p-4 mb-4 sm:mb-6 rounded-full bg-gray-800/80 border border-gray-700">
                <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-medium text-gray-200 mb-2">
                Start a new conversation
              </h2>
              <p className="text-sm text-gray-400 max-w-md px-4">
                Enter your text below to begin. You can summarize or translate
                your text by tapping the send button or hitting enter since you
                are lazy. Keep prompts simple for best results. If you like nor
                keep am simple na you sabi!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4 sm:space-y-6">
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

      {/* Input Area */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="fixed bottom-0 w-full bg-gradient-to-b from-black/50 to-emerald-900 backdrop-blur-2xl border-t border-gray-800 py-3 px-3 sm:py-4 sm:px-4"
      >
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-700 bg-black backdrop-blur-sm">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type your message${
                isAutoDetect
                  ? " in any language (na you sabi if you type yoruba here)"
                  : ""
              }...`}
              className="w-full bg-transparent text-white px-3 py-2 sm:px-4 sm:py-3 resize-none min-h-[50px] sm:min-h-[60px] max-h-[150px] sm:max-h-[200px] outline-none text-sm sm:text-base"
              rows={1}
              disabled={isLoading}
            />

            <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendMessage}
                disabled={inputText.trim() === "" || isLoading}
                className={`${
                  inputText.trim() === "" || isLoading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400"
                } text-white rounded-lg p-1.5 sm:p-2 flex items-center transition-all`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </motion.button>
            </div>
          </div>

          <div className="flex justify-center mt-2">
            <p className="text-[10px] sm:text-xs text-gray-400">
              {isAutoDetect
                ? "🪄 Auto-detecting"
                : `${selectedLanguage.flag} ${selectedLanguage.name}`}{" "}
              • Press Enter to send
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TextProcessor;

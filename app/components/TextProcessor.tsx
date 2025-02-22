"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Languages,
  ArrowRight,
  Loader2,
  Sparkles,
  Send,
  MessageSquare,
  
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
import LanguageSelector from "./LanguageSelector";

const TextProcessor = () => {
  // State management
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [isAutoDetect, setIsAutoDetect] = useState(true);


  //Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  

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
    <div className="relative bg-gradient-to-br from-black via-neutral-950 to-gray-900 text-white flex flex-col min-h-screen">
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -70 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full max-w-md mx-auto rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700 shadow-2xl"
            >
              <div className="relative bg-black/90 rounded-xl p-6 sm:p-8">
                <div className="absolute top-0 left-0 w-full h-1.5 rounded-t-xl overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-500"
                    animate={{ x: ["0%", "100%"] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </div>

                <div className="flex flex-col items-center text-center space-y-6">
                  <motion.div
                    className="p-4 rounded-full bg-emerald-500/20 text-emerald-400"
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Languages className="w-10 h-10" />
                  </motion.div>

                  <div className="space-y-3">
                    <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
                      Atomic did Something
                    </h1>
                    <p className="text-gray-300">
                      I really have no idea what it does just click the button
                      and find out
                    </p>
                  </div>

                  <div className="w-full space-y-4">
                    {[
                      {
                        icon: <Sparkles className="w-5 h-5" />,
                        title: "Smart Summarization",
                        description:
                          "I'm not really sure what this does, probably makes it more concise and comprehensive idk",
                        color: "emerald",
                      },
                      {
                        icon: <Type className="w-5 h-5" />,
                        title: "Multilingual Translation",
                        description:
                          "no there is no yoruba, there is spanish tho (bonjour senorita 🙃)",
                        color: "blue",
                      },
                      {
                        icon: <MessageSquare className="w-5 h-5" />,
                        title: "Intuitive Interface",
                        description:
                          "My designs are the best argue with yourself, also the languages you type in are auto detected",
                        color: "purple",
                      },
                    ].map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.2 }}
                        className="group p-4 bg-black/50 rounded-xl border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-2 rounded-lg bg-${feature.color}-500/20 text-${feature.color}-400 group-hover:scale-110 transition-transform duration-300`}
                          >
                            {feature.icon}
                          </div>
                          <div className="text-left">
                            <h3 className="font-medium text-gray-200">
                              {feature.title}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowIntro(false)}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-medium shadow-lg hover:shadow-emerald-500/20 transition-all duration-300"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Click the button Unc/aunt
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 w-full z-20 backdrop-blur-xl border-b border-gray-800"
      >
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              >
                <Languages className="w-5 h-5" />
              </motion.div>
              <h1 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
                Atomic did Something
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <label className="hidden sm:flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={isAutoDetect}
                  onChange={(e) => setIsAutoDetect(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-500"
                />
                Auto-detect
              </label>

              <LanguageSelector
                languages={LANGUAGES}
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
                isAutoDetect={isAutoDetect}
                onAutoDetectChange={setIsAutoDetect}
              />
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 pb-32">
        <AnimatePresence>
          {messages.length === 0 && !showIntro && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }}
                className="p-5 mb-6 rounded-full bg-gray-800/80 border border-gray-700 shadow-lg"
              >
                <MessageSquare className="w-8 h-8 text-blue-400" />
              </motion.div>
              <h2 className="text-2xl font-semibold text-gray-200 mb-3">
                Start a new conversation
              </h2>
              <p className="text-gray-400 max-w-md">
                Enter your text below to begin. You can summarize or translate
                your text by tapping the send button or hitting enter since you
                are lazy. Keep prompts simple for best results. If you like nor
                keep am simple na you sabi!
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

      {/* Input Area */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 w-full bg-gradient-to-t from-emerald-900 to-black/50 backdrop-blur-xl border-t border-gray-800 p-4"
      >
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-700 bg-black/80">
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
              className="text-sm md:text-base w-full bg-transparent text-white px-4 py-3 pr-12 resize-none min-h-[60px] max-h-[200px] outline-none placeholder:text-gray-500"
              disabled={isLoading}
            />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                y: [30, 0, 0],
              }}
              transition={{
                repeat: Infinity, 
                repeatType: "reverse",
                duration: 0.7, 
                ease: "easeInOut", 
              }}
              onClick={handleSendMessage}
              disabled={inputText.trim() === "" || isLoading}
              className={`absolute right-3 bottom-1/3 ${
                inputText.trim() === "" || isLoading
                  ? "bg-gray-600"
                  : "bg-gradient-to-r from-emerald-500 to-blue-500 hover:shadow-lg hover:shadow-emerald-500/20"
              } text-white rounded-lg p-3 transition-all duration-200`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </motion.button>
          </div>

          <div className="flex justify-center mt-2">
            <p className="text-sm text-gray-400">
              {isAutoDetect
                ? "🪄 Auto-detecting language"
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

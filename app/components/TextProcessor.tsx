'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Languages, MessageSquare, Sparkles, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

  interface Message {
    id: string;
    text: string;
    type: 'user' | 'ai';
    aiType?: 'translation' | 'summary' | 'detection';
    translatedText?: string;
    detectedLanguage?: string;
  }
  
  interface AICapabilities {
    detector: boolean;
    translator: boolean;
    summarizer: boolean;
  }
  
  const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
  ];
  
  const ChromeAIChat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [showIntro, setShowIntro] = useState(true);
    const [capabilities, setCapabilities] = useState<AICapabilities>({
      detector: false,
      translator: false,
      summarizer: false,
    });
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [mode, setMode] = useState<'translate' | 'summarize' | 'detect'>('translate');
    const messagesEndRef = useRef<HTMLDivElement>(null);
  
    // Initialize Chrome AI capabilities
    useEffect(() => {
      const initAI = async () => {
        const ai = (typeof self !== 'undefined' && 'ai' in self) ? (self as any).ai : null;
        if (ai) {
          const detectorAvailable = ai.languageDetector ? 
            (await ai.languageDetector.capabilities()).available !== 'no' : false;
          const translatorAvailable = ai.translator ? 
            (await ai.translator.capabilities()).available !== 'no' : false;
          const summarizerAvailable = ai.summarizer ? 
            (await ai.summarizer.capabilities()).available !== 'no' : false;
  
          setCapabilities({
            detector: detectorAvailable,
            translator: translatorAvailable,
            summarizer: summarizerAvailable,
          });
        }
      };
      initAI();
    }, []);
  
    // Scroll to bottom on new messages
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim()) return;
  
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText,
        type: 'user',
      };
  
      setMessages(prev => [...prev, newMessage]);
      setInputText('');
  
      try {
        const ai = (typeof self !== 'undefined' && 'ai' in self) ? (self as any).ai : null;
        if (!ai) throw new Error('Chrome AI not available');
  
        const response: Message = {
          id: (Date.now() + 1).toString(),
          text: '',
          type: 'ai',
          aiType: mode === 'translate' ? 'translation' : mode === 'summarize' ? 'summary' : 'detection'
        };
  
        switch (mode) {
          case 'translate': {
            const translator = await ai.translator.create({
              sourceLanguage: 'en',
              targetLanguage: selectedLanguage
            });
            await translator.ready;
            response.translatedText = await translator.translate(inputText);
            response.text = `Translation: ${response.translatedText}`;
            break;
          }
          case 'summarize': {
            const summarizer = await ai.summarizer.create({
              type: 'key-points',
              format: 'markdown',
              length: 'medium'
            });
            await summarizer.ready;
            response.text = await summarizer.summarize(inputText);
            break;
          }
          case 'detect': {
            const detector = await ai.languageDetector.create();
            await detector.ready;
            const result = await detector.detect(inputText);
            response.detectedLanguage = result[0].detectedLanguage;
            response.text = `Detected language: ${response.detectedLanguage}`;
            break;
          }
        }
  
        setMessages(prev => [...prev, response]);
      } catch (error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Error: ${(error as Error).message}`,
          type: 'ai'
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    };

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-black to-neutral-900">
      <Dialog open={showIntro} onOpenChange={setShowIntro}>
        <DialogContent className="sm:max-w-md animate-in slide-in-from-bottom duration-500 bg-gradient-to-b from-emerald-900 to-neutral-900 border-none text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-black bg-clip-text text-transparent">
              Atomic Did Something
            </DialogTitle>
            <DialogDescription className="text-lg text-white">
              Experience the power of Chrome&apos;s built-in AI capabilities, that Atomic definitely did himself without using ChatGpt (nah seriously chatgpt sucks)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {[
              { icon: Languages, text: "Translate between languages" },
              { icon: MessageSquare, text: "Summarize long text" },
              { icon: Sparkles, text: "Detect text language" }
            ].map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-emerald-500 to-blacktransform hover:scale-105 transition-all duration-300"
              >
                <feature.icon className="w-6 h-6 text-white " />
                <span className="font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
          <Button 
            onClick={() => setShowIntro(false)}
            className="w-full bg-gradient-to-r from-emerald-600 to-neutral-800 hover:from-emerald-700 hover:to-black transform hover:scale-105 transition-all duration-300"
          >
            Get Started
          </Button>
        </DialogContent>
      </Dialog>

      {/* Error Alert */}
      {!capabilities.detector && !capabilities.translator && !capabilities.summarizer && (
        <Alert variant="destructive" className="m-4 animate-in slide-in-from-top duration-500">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Chrome AI is unvailable (in Davido&apos;s voice)</AlertTitle>
          <AlertDescription>
            Please make sure you&apos;re using a supported version of Chrome with required flags enabled, or it wont work
          </AlertDescription>
        </Alert>
      )}

      {/* Mode Selection Header */}
      <div className="sticky top-0 bg-black backdrop-blur-xl border-b border-gray-500  p-4 space-y-3">
        <div className="flex gap-2 max-w-md mx-auto text-white">
          <Select value={mode} onValueChange={(value: any) => setMode(value)}>
            <SelectTrigger className="bg-transparent border-2 hover:border-cyan-500 transition-colors">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="translate">Translate</SelectItem>
              <SelectItem value="summarize">Summarize</SelectItem>
              <SelectItem value="detect">Detect Language</SelectItem>
            </SelectContent>
          </Select>

          {mode === 'translate' && (
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="bg-transparent border-2 hover:border-cyan-500 transition-colors">
                <SelectValue placeholder="Target language" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[85%] p-4 rounded-2xl shadow-sm
                ${message.type === 'user' 
                  ? 'bg-gradient-to-br from-emerald-500 to-neutral-600 text-white' 
                  : 'bg-black text-white'
                }
                transform transition-all duration-300
                animate-in slide-in-from-${message.type === 'user' ? 'right' : 'left'}
                hover:scale-[1.02]
              `}
            >
              <p className="text-[15px] leading-relaxed">{message.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="sticky bottom-0 text-white bg-gradient-to-tr from-emerald-600 to-black backdrop-blur-3xl border-t border-gray-500 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-transparent border-2 focus:border-neutral-500 transition-colors rounded-full px-6"
          />
          <Button 
            type="submit" 
            disabled={!inputText.trim()}
            className="rounded-full w-12 h-12 p-0 bg-gradient-to-r from-cyan-600 to-black hover:from-cyan-800 hover:to-black transform hover:scale-110 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChromeAIChat;
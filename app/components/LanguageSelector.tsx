'use client'
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";

interface Language {
  code: string;
  name: string;
  flag: string;
}

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  isAutoDetect: boolean;
  onAutoDetectChange: (isAutoDetect: boolean) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  languages, 
  selectedLanguage, 
  onLanguageChange, 
  isAutoDetect, 
  onAutoDetectChange
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.flag.includes(searchQuery)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageSelect = (language: Language) => {
    onLanguageChange(language);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative" ref={dropdownRef} style={{ zIndex: 999 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isAutoDetect}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          ${isAutoDetect 
            ? 'bg-gray-800/40 cursor-not-allowed opacity-70' 
            : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
          }
        `}
      >
        <span className="text-xl">{selectedLanguage.flag}</span>
        <span className="hidden sm:inline text-sm font-medium text-gray-200">
          {selectedLanguage.name}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden"
          style={{ zIndex: 9999 }}
        >
          <div className="p-2 border-b border-gray-700">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages..."
                className="w-full px-3 py-2 bg-gray-900 rounded-lg text-sm text-gray-200 placeholder-gray-400 outline-none"
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setSearchQuery("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {filteredLanguages.map((language) => (
              <button
                key={language.code}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleLanguageSelect(language);
                }}
                className={`
                  w-full px-3 py-2.5 flex items-center gap-3
                  hover:bg-gray-700/50
                  ${language.code === selectedLanguage.code 
                    ? 'bg-gray-700/50 text-emerald-400' 
                    : 'text-gray-200'
                  }
                `}
              >
                <span className="text-xl">{language.flag}</span>
                <span className="text-sm font-medium">{language.name}</span>
                {language.code === selectedLanguage.code && (
                  <Check className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-gray-700">
            <label 
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-300 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isAutoDetect}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  e.stopPropagation();
                  onAutoDetectChange(e.target.checked);
                  if (e.target.checked) setIsOpen(false);
                }}
                className="h-4 w-4 rounded accent-emerald-500"
              />
              Auto-detect language
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
interface Chrome {
    languageDetection?: {
      detectLanguage(text: string): Promise<{
        languages: Array<{ language: string; percentage: number }>
      }>;
    };
    summarization?: {
      summarize(text: string): Promise<{
        summary: string;
      }>;
    };
    translation?: {
      translate(text: string, targetLanguage: string): Promise<{
        translatedText: string;
      }>;
    };
  }
  
  declare global {
    interface Window {
      chrome?: Chrome;
    }
  }
  
  export {};
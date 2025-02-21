export interface Message {
    id: number;
    text: string;
    language: string;
    processed: ProcessedContent[];
  }
  
  export interface ProcessedContent {
    type: 'summary' | 'translation';
    content: string;
    language?: string;
  }
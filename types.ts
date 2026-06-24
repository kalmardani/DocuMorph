export enum ConversionMode {
  PDF_TO_WORD = 'PDF_TO_WORD',
  WORD_TO_PDF = 'WORD_TO_PDF',
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  READING = 'READING',
  CONVERTING = 'CONVERTING',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export interface ConversionResult {
  text: string;
  originalFileName: string;
}

export interface DragDropState {
  isDragActive: boolean;
}
import React, { useRef, useState } from 'react';
import { Upload, FileText, File as FileIcon } from 'lucide-react';
import { ConversionMode } from '../types';

interface DropzoneProps {
  mode: ConversionMode;
  onFileSelected: (file: File) => void;
  disabled: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ mode, onFileSelected, disabled }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcess(e.target.files[0]);
    }
  };

  const validateAndProcess = (file: File) => {
    const validPdf = mode === ConversionMode.PDF_TO_WORD && file.type === 'application/pdf';
    const validWord = mode === ConversionMode.WORD_TO_PDF && (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.name.endsWith('.docx')
    );

    if (validPdf || validWord) {
      onFileSelected(file);
    } else {
      alert(`Invalid file type. Please upload a ${mode === ConversionMode.PDF_TO_WORD ? 'PDF' : 'Word (.docx)'} file.`);
    }
  };

  const triggerSelect = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div
      onClick={triggerSelect}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative overflow-hidden rounded-2xl border-2 border-dashed p-12 transition-all duration-300 cursor-pointer
        ${isDragActive 
          ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' 
          : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        className="hidden"
        accept={mode === ConversionMode.PDF_TO_WORD ? ".pdf" : ".docx"}
      />
      
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className={`
          p-4 rounded-full shadow-lg transition-colors
          ${isDragActive ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-slate-500'}
        `}>
          {mode === ConversionMode.PDF_TO_WORD ? (
            <FileText className="w-10 h-10" />
          ) : (
            <FileIcon className="w-10 h-10" />
          )}
        </div>
        
        <div>
            <h3 className="text-xl font-semibold text-slate-900">
                {isDragActive ? "Drop file here" : `Upload ${mode === ConversionMode.PDF_TO_WORD ? "PDF" : "Word"}`}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
                Drag and drop or click to browse
            </p>
        </div>
        
        <div className="text-xs text-slate-400 font-medium px-3 py-1 bg-slate-100 rounded-full">
            Max size: 10MB
        </div>
      </div>
    </div>
  );
};

export default Dropzone;
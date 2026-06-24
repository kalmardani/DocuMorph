import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, ArrowRightLeft, FileType, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ConversionMode, ProcessingStatus, ConversionResult } from './types';
import Dropzone from './components/Dropzone';
import { convertPdfToMarkdown, optimizeTextForPdf } from './services/gemini';
import { fileToBase64, readDocxText, generateDocxFromMarkdown, generatePdfFromText, saveFile } from './services/docUtils';

const App: React.FC = () => {
  const [mode, setMode] = useState<ConversionMode>(ConversionMode.PDF_TO_WORD);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Toggle Mode
  const toggleMode = () => {
    setMode(prev => prev === ConversionMode.PDF_TO_WORD ? ConversionMode.WORD_TO_PDF : ConversionMode.PDF_TO_WORD);
    resetState();
  };

  const resetState = () => {
    setStatus(ProcessingStatus.IDLE);
    setResult(null);
    setErrorMessage(null);
  };

  const handleFileSelect = async (file: File) => {
    resetState();
    setStatus(ProcessingStatus.READING);

    try {
      if (mode === ConversionMode.PDF_TO_WORD) {
        // PDF -> Word Flow
        const base64 = await fileToBase64(file);
        
        setStatus(ProcessingStatus.CONVERTING);
        const markdown = await convertPdfToMarkdown(base64);
        
        setResult({
          text: markdown,
          originalFileName: file.name,
        });
        setStatus(ProcessingStatus.COMPLETE);

      } else {
        // Word -> PDF Flow
        const rawText = await readDocxText(file);
        
        setStatus(ProcessingStatus.CONVERTING);
        // We use AI to "Clean up" the extracted text before making it a PDF
        const optimizedText = await optimizeTextForPdf(rawText);
        
        setResult({
          text: optimizedText,
          originalFileName: file.name,
        });
        setStatus(ProcessingStatus.COMPLETE);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("An error occurred while processing the document.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    
    setStatus(ProcessingStatus.GENERATING);
    try {
      if (mode === ConversionMode.PDF_TO_WORD) {
        const blob = await generateDocxFromMarkdown(result.text);
        saveFile(blob, result.originalFileName.replace(".pdf", ".docx"));
      } else {
        const blob = generatePdfFromText(result.text);
        saveFile(blob, result.originalFileName.replace(".docx", ".pdf").replace(".doc", ".pdf"));
      }
      setStatus(ProcessingStatus.COMPLETE);
    } catch (e) {
      console.error(e);
      setErrorMessage("Failed to generate download file.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <RefreshCw className="w-5 h-5 animate-spin-slow" style={{ animationDuration: '10s' }} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              DocuMorph AI
            </h1>
          </div>
          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Powered by Gemini 3.0 Pro
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12 flex flex-col items-center">
        
        {/* Mode Switcher */}
        <div className="w-full bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-8 flex relative">
           <div 
             className={`absolute top-1.5 bottom-1.5 rounded-xl bg-indigo-600 shadow-sm transition-all duration-300 ease-in-out z-0`}
             style={{ 
               left: mode === ConversionMode.PDF_TO_WORD ? '0.375rem' : '50%', 
               width: 'calc(50% - 0.375rem)'
             }}
           />
           <button 
             onClick={() => mode !== ConversionMode.PDF_TO_WORD && toggleMode()}
             className={`flex-1 relative z-10 py-3 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2
               ${mode === ConversionMode.PDF_TO_WORD ? 'text-white' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <FileType className="w-4 h-4" />
             <span>PDF to Word</span>
           </button>
           <button 
             onClick={() => mode !== ConversionMode.WORD_TO_PDF && toggleMode()}
             className={`flex-1 relative z-10 py-3 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2
               ${mode === ConversionMode.WORD_TO_PDF ? 'text-white' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <ArrowRightLeft className="w-4 h-4" />
             <span>Word to PDF</span>
           </button>
        </div>

        {/* Status Messages */}
        {status === ProcessingStatus.ERROR && (
          <div className="w-full mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            <p>{errorMessage}</p>
            <button onClick={resetState} className="ml-auto text-sm font-medium hover:underline">Try Again</button>
          </div>
        )}

        {/* Content Area */}
        <div className="w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          
          {/* Step 1: Upload */}
          {!result && status !== ProcessingStatus.READING && status !== ProcessingStatus.CONVERTING && (
             <Dropzone mode={mode} onFileSelected={handleFileSelect} disabled={false} />
          )}

          {/* Step 2: Processing */}
          {(status === ProcessingStatus.READING || status === ProcessingStatus.CONVERTING) && (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {status === ProcessingStatus.READING ? "Reading Document..." : "AI Processing..."}
                </h3>
                <p className="text-slate-500 mt-2 max-w-md mx-auto">
                   Gemini is analyzing the content structure to ensure the best possible conversion quality.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Result & Preview */}
          {result && status === ProcessingStatus.COMPLETE && (
            <div className="flex flex-col h-[600px]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-slate-700">Ready to download</span>
                </div>
                <button 
                  onClick={resetState}
                  className="text-sm text-slate-500 hover:text-indigo-600 font-medium"
                >
                  Convert another
                </button>
              </div>

              <div className="flex-1 p-6 overflow-hidden flex flex-col">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    AI Extracted Preview
                </p>
                <div className="flex-1 bg-slate-50 rounded-xl p-4 overflow-y-auto border border-slate-200 font-mono text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {result.text}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-white">
                 <button
                   onClick={handleDownload}
                   className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2 hover:scale-[1.01] active:scale-[0.99]"
                 >
                   <Download className="w-5 h-5" />
                   <span>Download {mode === ConversionMode.PDF_TO_WORD ? ".docx" : ".pdf"}</span>
                 </button>
              </div>
            </div>
          )}
          
           {/* Step 4: Generating File Loading State */}
           {status === ProcessingStatus.GENERATING && (
              <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
                 <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                 <h3 className="text-lg font-medium text-slate-700">Generating your file...</h3>
              </div>
           )}

        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-slate-400">
        <p>&copy; {new Date().getFullYear()} DocuMorph AI. Privacy First - Files are processed in memory.</p>
      </footer>
    </div>
  );
};

export default App;
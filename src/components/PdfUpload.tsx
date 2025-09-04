import React, { useCallback, useState } from 'react';

export const PdfUpload = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if(e.dataTransfer.files[0].type === 'application/pdf') {
        onFileSelect(e.dataTransfer.files[0]);
      } else {
        // Invalid file type - PDF required
      }
      e.dataTransfer.clearData();
    }
  }, [onFileSelect]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div 
        className={`w-full max-w-2xl h-full max-h-[500px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors ${isDragging ? 'border-sky-400 bg-sky-500/10' : 'border-slate-600 bg-slate-800/20'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 mb-4 transition-colors ${isDragging ? 'text-sky-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-4-4V6a2 2 0 012-2h10a2 2 0 012 2v6a4 4 0 01-4 4H7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m3-3H7" />
        </svg>
        <h2 className="text-2xl font-bold mb-2">Upload P&ID Drawing</h2>
        <p className="text-slate-400 mb-6">Drag & drop a PDF file here, or click to select.</p>
        <label htmlFor="file-upload" className="cursor-pointer px-6 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900">
          Select File
        </label>
        <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
        <p className="text-xs text-slate-500 mt-6 max-w-md">All processing is done in your browser. Your files are never uploaded to a server, ensuring complete privacy.</p>
      </div>
    </div>
  );
};
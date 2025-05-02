import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  helpText?: string;
  isLoading?: boolean;
}

export default function FileUpload({
  onFilesSelected,
  accept = ".pdf,.docx,.txt",
  maxFiles = 10,
  maxSize = 10485760, // 10MB
  helpText = "Supported formats: PDF, DOCX, TXT (Max 10MB each)",
  isLoading = false
}: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.length > 0) {
      onFilesSelected(acceptedFiles);
    }
  }, [onFilesSelected]);
  
  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: accept.split(',').reduce((acc, curr) => {
      acc[curr] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles,
    maxSize,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false),
    noClick: true,
    noKeyboard: true
  });
  
  return (
    <div
      {...getRootProps()}
      className={`upload-area rounded-lg p-6 text-center cursor-pointer ${
        isDragActive ? "dragover" : ""
      }`}
    >
      <input {...getInputProps()} disabled={isLoading} />
      
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      
      <p className="text-gray-700 font-medium mb-1">Drag and drop files here</p>
      <p className="text-gray-500 text-sm mb-3">or</p>
      
      <Button
        type="button"
        onClick={open}
        disabled={isLoading}
        className="bg-primary hover:bg-primary-dark text-white"
      >
        {isLoading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </span>
        ) : (
          "Browse Files"
        )}
      </Button>
      
      <p className="text-xs text-gray-500 mt-3">{helpText}</p>
    </div>
  );
}

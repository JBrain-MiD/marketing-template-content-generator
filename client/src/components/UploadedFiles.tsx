import { Progress } from "@/components/ui/progress";

interface UploadedFilesProps {
  files: File[];
  onRemove: (index: number) => void;
  isUploading?: boolean;
  isAnalyzing?: boolean;
  uploadProgress?: number;
}

export default function UploadedFiles({ 
  files, 
  onRemove, 
  isUploading = false, 
  isAnalyzing = false,
  uploadProgress = 0
}: UploadedFilesProps) {
  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  
  if (files.length === 0) {
    return null;
  }
  
  // Debug output
  console.log('UploadedFiles props:', { 
    filesCount: files.length, 
    isUploading, 
    isAnalyzing, 
    uploadProgress 
  });
  
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files</h4>
      
      {files.map((file, index) => (
        <div 
          key={index} 
          className="bg-gray-50 rounded-md mb-2 overflow-hidden"
        >
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center overflow-hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="truncate">
                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                <span className="text-xs text-gray-500 ml-2">({formatFileSize(file.size)})</span>
              </div>
            </div>
            <button 
              className="text-gray-500 hover:text-red-500 ml-2 flex-shrink-0"
              onClick={() => onRemove(index)}
              aria-label="Remove file"
              disabled={isUploading || isAnalyzing}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {(isUploading || isAnalyzing) && (
            <div className="px-3 pb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">
                  {uploadProgress < 100 
                    ? "Uploading..." 
                    : "Analyzing template..."}
                </span>
                {uploadProgress < 100 && (
                  <span className="text-xs font-medium text-gray-700">{uploadProgress}%</span>
                )}
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
              
              {uploadProgress === 100 && isAnalyzing && (
                <div className="flex items-center mt-2">
                  <svg className="animate-spin h-3 w-3 text-primary mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-xs text-primary">Processing template...</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface UploadedFilesProps {
  files: File[];
  onRemove: (index: number) => void;
}

export default function UploadedFiles({ files, onRemove }: UploadedFilesProps) {
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
  
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files</h4>
      
      {files.map((file, index) => (
        <div 
          key={index} 
          className="flex items-center justify-between bg-gray-50 p-3 rounded-md mb-2"
        >
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
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import StepProgress from "@/components/StepProgress";
import FileUpload from "@/components/FileUpload";
import UploadedFiles from "@/components/UploadedFiles";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";

export default function TemplateStep() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setTemplate } = useStore();
  
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedTemplate, setUploadedTemplate] = useState<File | null>(null);
  const [templateAnalysis, setTemplateAnalysis] = useState<any>(null);
  
  const handleTemplateUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0]; // Only accept one template file
    console.log("Received file:", file.name, "Type:", file.type, "Size:", file.size);
    
    // Check file type
    const validPdfTypes = ["application/pdf"];
    if (!validPdfTypes.includes(file.type)) {
      console.log("Invalid file type:", file.type);
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive"
      });
      return;
    }
    
    // Set file for display
    setUploadedTemplate(file);
    
    // Upload to server
    try {
      setIsUploading(true);
      setIsAnalyzing(true);
      
      // Create a new FormData instance
      const formData = new FormData();
      
      // Append the file with the correct field name
      formData.append("templateFile", file);
      
      // Debug FormData
      console.log("FormData created with file:", file.name);
      
      // Use XMLHttpRequest for more direct control and debugging
      return new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.open("POST", "/api/templates/upload", true);
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              console.log("Upload succeeded:", result);
              
              // Update state with result
              setTemplateAnalysis(result);
              setTemplate(result);
              
              toast({
                title: "Template uploaded successfully",
                description: `${result.sections.length} sections detected`
              });
              
              resolve(result);
            } catch (error) {
              console.error("Error parsing response:", error);
              reject(error);
            }
          } else {
            console.error("Upload failed with status:", xhr.status);
            toast({
              title: "Upload failed",
              description: `Server returned status: ${xhr.status}`,
              variant: "destructive"
            });
            reject(new Error(`Server returned status: ${xhr.status}`));
          }
          setIsUploading(false);
          setIsAnalyzing(false);
          setUploadProgress(0);
        };
        
        xhr.onerror = function() {
          console.error("XHR error occurred");
          toast({
            title: "Upload failed",
            description: "Network error occurred",
            variant: "destructive"
          });
          setIsUploading(false);
          setIsAnalyzing(false);
          setUploadProgress(0);
          reject(new Error("Network error"));
        };
        
        xhr.upload.onprogress = function(e) {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            console.log(`Upload progress: ${percentComplete}%`);
            setUploadProgress(percentComplete);
          }
        };
        
        console.log("Sending XHR request to /api/templates/upload");
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Template upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload template",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
      setUploadProgress(0);
    }
  };
  
  const removeTemplate = () => {
    setUploadedTemplate(null);
    setTemplateAnalysis(null);
    setIsUploading(false);
    setIsAnalyzing(false);
    setUploadProgress(0);
  };
  
  const goToNextStep = () => {
    if (!templateAnalysis) {
      toast({
        title: "Template required",
        description: "Please upload a template before proceeding",
        variant: "destructive"
      });
      return;
    }
    
    navigate("/company-info");
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <StepProgress currentStep={1} />
      
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Upload Template</h2>
        <p className="text-gray-600 mb-8">
          Start by uploading your marketing template PDF. We'll analyze its structure to help generate tailored content.
        </p>
        
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="font-medium text-lg mb-4 text-gray-800">Template PDF</h3>
            
            {!uploadedTemplate ? (
              <FileUpload
                onFilesSelected={handleTemplateUpload}
                isLoading={isUploading}
                accept=".pdf"
                maxFiles={1}
                helpText="Upload your marketing template PDF (Max 10MB)"
              />
            ) : (
              <>
                <UploadedFiles
                  files={[uploadedTemplate]}
                  onRemove={removeTemplate}
                />
                
                <div className="mt-4">
                  {(isUploading || isAnalyzing) ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {uploadProgress < 100 
                            ? "Uploading template" 
                            : "Analyzing template"}
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {uploadProgress < 100 
                            ? `${uploadProgress}%` 
                            : "Processing..."}
                        </span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-gray-500 mt-2">
                        {uploadProgress < 100 
                          ? "Uploading your template..." 
                          : "Analyzing template structure..."}
                      </p>
                      {uploadProgress === 100 && (
                        <div className="flex items-center mt-3">
                          <svg className="animate-spin h-4 w-4 text-primary mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-sm text-primary">This may take a minute...</span>
                        </div>
                      )}
                    </>
                  ) : templateAnalysis ? (
                    <div className="py-2 text-sm text-green-600 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Template ready for next step
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {templateAnalysis && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="font-medium text-lg mb-4 text-gray-800">Template Analysis</h3>
              
              <div className="border border-gray-200 rounded-md">
                <div className="p-4 border-b border-gray-200 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{templateAnalysis.name}</div>
                    <div className="text-xs text-gray-500">
                      {templateAnalysis.numPages} pages • {templateAnalysis.sections.length} content sections detected
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Slide-by-Slide Analysis:</h4>
                  <Accordion type="single" collapsible className="w-full">
                    {templateAnalysis.sections.map((section: any, index: number) => (
                      <AccordionItem key={index} value={`slide-${index}`} className="border border-gray-200 rounded-md mb-3 overflow-hidden">
                        <AccordionTrigger className="px-4 py-3 bg-gray-50 hover:bg-gray-100">
                          <div className="flex items-center text-left">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="text-primary text-sm font-medium">{section.slideNumber || index+1}</span>
                            </div>
                            <div className="flex-grow">
                              <h5 className="text-sm font-medium text-gray-800">{section.title}</h5>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <Badge variant="outline" className="text-xs bg-gray-100">
                                  {section.format}
                                </Badge>
                                <Badge variant="outline" className="text-xs bg-gray-100">
                                  {section.expectedLength}
                                </Badge>
                                {section.needsContent !== undefined && (
                                  <Badge 
                                    variant={section.needsContent ? "default" : "secondary"} 
                                    className="text-xs"
                                  >
                                    {section.needsContent ? "Needs Content" : "No Content Needed"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-3 bg-white border-t border-gray-200">
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h6 className="text-xs font-semibold text-gray-500 mb-1">Purpose:</h6>
                                <p className="text-sm text-gray-700">{section.purpose || "Not specified"}</p>
                              </div>
                              <div>
                                <h6 className="text-xs font-semibold text-gray-500 mb-1">Format Details:</h6>
                                <p className="text-sm text-gray-700">{section.formatDetails || section.format || "Not specified"}</p>
                              </div>
                            </div>
                            
                            {section.originalText && (
                              <div className="mt-4">
                                <h6 className="text-xs font-semibold text-gray-500 mb-1">Original Text:</h6>
                                <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 max-h-32 overflow-y-auto whitespace-pre-wrap">
                                  {section.originalText}
                                </div>
                              </div>
                            )}
                            
                            {section.examples && (
                              <div className="mt-3">
                                <h6 className="text-xs font-semibold text-gray-500 mb-1">Examples/Placeholders:</h6>
                                <p className="text-sm text-gray-700">{section.examples}</p>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="flex justify-end">
          <Button
            onClick={goToNextStep}
            className="bg-primary hover:bg-primary-dark text-white rounded-md px-6 py-2 text-sm font-medium transition flex items-center"
            disabled={isUploading || isAnalyzing}
          >
            Next: Company Info
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

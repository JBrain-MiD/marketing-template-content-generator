import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";

export default function Home() {
  const [, navigate] = useLocation();
  const { resetState } = useStore();
  
  const startNewProject = () => {
    resetState();
    navigate("/template");
  };
  
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Marketing Template Generator</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Create professional marketing content tailored to your template, company, and strategy in minutes.
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        <Card className="overflow-hidden">
          <div className="h-48 bg-gradient-to-r from-primary/80 to-primary flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <CardContent className="p-6">
            <h2 className="text-2xl font-semibold mb-3">Upload Your Template</h2>
            <p className="text-gray-600 mb-4">
              Start by uploading your marketing template PDF. Our system will analyze its structure and identify content requirements.
            </p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <div className="h-48 bg-gradient-to-r from-secondary to-secondary/80 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <CardContent className="p-6">
            <h2 className="text-2xl font-semibold mb-3">Generate Content</h2>
            <p className="text-gray-600 mb-4">
              Provide company information and strategy details, then let our AI generate tailored content for each section.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="text-center">
        <Button 
          onClick={startNewProject}
          className="bg-primary hover:bg-primary-dark text-white px-8 py-6 text-lg rounded-md transition-colors"
        >
          Start New Project
        </Button>
      </div>
      
      {/* Features section */}
      <div className="mt-20">
        <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Template Analysis</h3>
            <p className="text-gray-600">
              Upload your marketing template PDF and our system will analyze its structure, identifying sections and content requirements.
            </p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Company Information</h3>
            <p className="text-gray-600">
              Provide company details and upload documents to create a comprehensive profile for content generation.
            </p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Content</h3>
            <p className="text-gray-600">
              Our AI generates professional marketing content tailored to your template, company information, and strategic goals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      
      {/* Main process steps */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
        
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Process connecting line */}
          <div className="hidden md:block absolute top-8 left-0 right-0 h-1 bg-gray-200 -z-10"></div>
          
          {/* Step 1 */}
          <div className="text-center p-6 bg-white rounded-lg shadow-md relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-xl font-bold">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload Your Template</h3>
            <p className="text-gray-600">
              Upload your marketing template PDF and our system will analyze its structure, identifying sections and content requirements.
            </p>
          </div>
          
          {/* Step 2 */}
          <div className="text-center p-6 bg-white rounded-lg shadow-md relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-xl font-bold">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Provide Strategic Input</h3>
            <p className="text-gray-600">
              Provide company details and marketing strategy. You can also upload relevant documents to enhance content quality.
            </p>
          </div>
          
          {/* Step 3 */}
          <div className="text-center p-6 bg-white rounded-lg shadow-md relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-xl font-bold">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Generate Content</h3>
            <p className="text-gray-600">
              Our AI generates professional marketing content tailored to your template, company information, and strategic goals.
            </p>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-8 mb-16">
        <Button 
          onClick={startNewProject}
          className="bg-primary hover:bg-primary-dark text-white px-8 py-6 text-lg rounded-md transition-colors"
        >
          Start New Project
        </Button>
      </div>
    </div>
  );
}

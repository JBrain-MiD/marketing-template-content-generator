import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export default function Home() {
  const [, navigate] = useLocation();
  const { resetState } = useStore();
  
  const startNewProject = () => {
    resetState();
    navigate("/template");
  };
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Marketing Template Generator</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Create professional marketing content tailored to your needs.
        </p>
      </div>
      
      <div className="text-center mt-8 mb-6">
        <Button 
          onClick={startNewProject}
          className="bg-primary hover:bg-primary-dark text-white px-8 py-3 text-lg"
        >
          Start New Project
        </Button>
      </div>
      
      <div className="text-center mt-6">
        <p>Having issues? Try these direct links:</p>
        <div className="space-x-4 mt-4">
          <Button variant="outline" onClick={() => navigate("/template")}>
            Template Step
          </Button>
          <Button variant="outline" onClick={() => navigate("/company-info")}>
            Company Info Step
          </Button>
          <Button variant="outline" onClick={() => navigate("/strategy")}>
            Strategy Step
          </Button>
          <Button variant="outline" onClick={() => navigate("/generate")}>
            Generate Step
          </Button>
        </div>
      </div>
    </div>
  );
}

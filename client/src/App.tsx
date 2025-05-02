import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import TemplateStep from "@/pages/TemplateStep";
import CompanyInfoStep from "@/pages/CompanyInfoStep";
import StrategyStep from "@/pages/StrategyStep";
import GenerateStep from "@/pages/GenerateStep";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/template" component={TemplateStep} />
      <Route path="/company-info" component={CompanyInfoStep} />
      <Route path="/strategy" component={StrategyStep} />
      <Route path="/generate" component={GenerateStep} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            <Router />
          </main>
          <Footer />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

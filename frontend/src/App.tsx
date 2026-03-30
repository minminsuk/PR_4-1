import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ComparisonProvider } from "./contexts/ComparisonContext";
import Home from "./pages/Home";
import PricePredictor from "./pages/PricePredictor";
import Comparison from "./pages/Comparison";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/predict" component={PricePredictor} />
      <Route path="/comparison" component={Comparison} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ComparisonProvider>
        <ThemeProvider
          defaultTheme="light"
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </ComparisonProvider>
    </ErrorBoundary>
  );
}

export default App;

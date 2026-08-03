import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import LifeStageForm from "./pages/LifeStageForm";
import LifestyleForm from "./pages/LifestyleForm";
import NetWorthForm from "./pages/NetWorthForm";
// import RecordHistory from "./pages/RecordHistory"; // TODO: 實作記錄歷史頁面

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/life-stage"} component={LifeStageForm} />
      <Route path={"/lifestyle"} component={LifestyleForm} />
      <Route path={"/net-worth"} component={NetWorthForm} />
      <Route path={"/history"} component={Dashboard} /> {/* TODO: 改為 RecordHistory */}
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

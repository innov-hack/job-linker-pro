import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/Header";
import { JobsProvider } from "@/context/JobsContext";
import Landing from "./pages/Landing";
import CreateJob from "./pages/CreateJob";
import Dashboard from "./pages/Dashboard";
import JobDetail from "./pages/JobDetail";
import Settings from "./pages/Settings";
import Apply from "./pages/Apply";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <JobsProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Candidate-facing apply page (no header) */}
            <Route path="/apply/:jobId" element={<Apply />} />
            
            {/* Recruiter-facing pages (with header) */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex flex-col">
                  <Header />
                  <main className="flex-1">
                    <Routes>
                      <Route path="/" element={<Landing />} />
                      <Route path="/create" element={<CreateJob />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/job/:jobId" element={<JobDetail />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      </JobsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

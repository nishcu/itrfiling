import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/context/SessionContext";
import { DraftProvider } from "@/context/DraftContext";
import AppLayout from "@/components/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TokenGate from "@/pages/TokenGate";
import Dashboard from "@/pages/Dashboard";
import UploadPage from "@/pages/UploadPage";
import ReviewPage from "@/pages/ReviewPage";
import PreviewPage from "@/pages/PreviewPage";
import SuccessPage from "@/pages/SuccessPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" />
      <SessionProvider>
        <DraftProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <AppLayout>
                <Routes>
                <Route path="/" element={<TokenGate />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/review" element={<ReviewPage />} />
                <Route path="/preview" element={<PreviewPage />} />
                <Route path="/file" element={<SuccessPage />} />
                <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </ErrorBoundary>
          </BrowserRouter>
        </DraftProvider>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

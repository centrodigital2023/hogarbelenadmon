import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import PageMetadata from "@/components/PageMetadata";
import PageLoader from "@/components/PageLoader";
import ReleaseAppShell from "@/components/ReleaseAppShell";

// The public install page does not need the database, so it opens without downloading it
const Install = lazy(() => import("./pages/Install"));
const SignedArea = lazy(() => import("./app/SignedArea"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <PageMetadata />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/instalar" element={<><Install /><ReleaseAppShell /></>} />
            <Route path="*" element={<SignedArea />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;

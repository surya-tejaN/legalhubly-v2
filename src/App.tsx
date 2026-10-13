import { lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import PageLoader from "@/components/PageLoader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SupportChat from "@/components/SupportChat";
import { queryClient } from "@/lib/queryClient";
import { features } from "@/config/features";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));

const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const VerifyEmailSuccess = lazy(() => import("./pages/auth/VerifyEmailSuccess"));

const ClientDashboard = lazy(() => import("./pages/client/ClientDashboard"));
const FindLawyers = lazy(() => import("./pages/client/FindLawyers"));
const LawyerProfile = lazy(() => import("./pages/client/LawyerProfile"));
const AccountSettings = lazy(() => import("./pages/client/AccountSettings"));
const SavedLawyers = lazy(() => import("./pages/client/SavedLawyers"));
const ClientMessages = lazy(() => import("./pages/client/ClientMessages"));
const ClientDocuments = lazy(() => import("./pages/client/ClientDocuments"));
const MyCases = lazy(() => import("./pages/client/MyCases"));
const ClientConsultations = lazy(() => import("./pages/client/ClientConsultations"));
const ClientPayments = lazy(() => import("./pages/client/ClientPayments"));
const ClientProfile = lazy(() => import("./pages/client/ClientProfile"));

const LawyerDashboard = lazy(() => import("./pages/lawyer/LawyerDashboard"));
const LawyerLeads = lazy(() => import("./pages/lawyer/LawyerLeads"));
const LawyerMessages = lazy(() => import("./pages/lawyer/LawyerMessages"));
const LawyerCases = lazy(() => import("./pages/lawyer/LawyerCases"));
const LawyerCalendar = lazy(() => import("./pages/lawyer/LawyerCalendar"));
const LawyerBilling = lazy(() => import("./pages/lawyer/LawyerBilling"));
const LawyerDocuments = lazy(() => import("./pages/lawyer/LawyerDocuments"));
const LawyerClients = lazy(() => import("./pages/lawyer/LawyerClients"));
const LawyerTools = lazy(() => import("./pages/lawyer/LawyerTools"));
const LawyerSettings = lazy(() => import("./pages/lawyer/LawyerSettings"));

function page(node: ReactNode) {
  return <PageTransition>{node}</PageTransition>;
}

function gated(enabled: boolean, node: ReactNode) {
  return page(enabled ? node : <ComingSoon />);
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={page(<Index />)} />
          <Route path="/about" element={page(<About />)} />
          <Route path="/contact" element={page(<Contact />)} />
          <Route path="/privacy" element={page(<Privacy />)} />
          <Route path="/terms" element={page(<Terms />)} />

          <Route path="/login" element={page(<Login />)} />
          <Route path="/signup" element={page(<Signup />)} />
          <Route path="/forgot-password" element={page(<ForgotPassword />)} />
          <Route path="/reset-password" element={page(<ResetPassword />)} />
          <Route path="/verify-email-success" element={page(<VerifyEmailSuccess />)} />

          <Route path="/client/find-lawyers" element={gated(features.clientFindLawyers, <FindLawyers />)} />
          <Route path="/client/lawyer/:lawyerId" element={gated(features.clientLawyerProfile, <LawyerProfile />)} />

          <Route
            path="/client/dashboard"
            element={
              <ProtectedRoute allowedRoles={["client"]}>
                {gated(features.clientDashboard, <ClientDashboard />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/saved-lawyers"
            element={
              <ProtectedRoute allowedRoles={["client"]}>
                {gated(features.clientSavedLawyers, <SavedLawyers />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/messages"
            element={
              <ProtectedRoute allowedRoles={["client"]}>
                {gated(features.clientMessages, <ClientMessages />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/cases"
            element={
              <ProtectedRoute allowedRoles={["client"]}>
                {gated(features.clientCases, <MyCases />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/consultations"
            element={
              <ProtectedRoute allowedRoles={["client"]}>
                {gated(features.clientConsultations, <ClientConsultations />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/documents"
            element={
              <ProtectedRoute allowedRoles={["client"]}>
                {gated(features.clientDocuments, <ClientDocuments />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/payments"
            element={
              <ProtectedRoute allowedRoles={["client"]}>
                {gated(features.clientPayments, <ClientPayments />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/settings"
            element={
              <ProtectedRoute allowedRoles={["client"]}>
                {gated(features.clientSettings, <AccountSettings />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/profile"
            element={
              <ProtectedRoute allowedRoles={["client"]}>
                {gated(features.clientProfile, <ClientProfile />)}
              </ProtectedRoute>
            }
          />

          <Route
            path="/lawyer/dashboard"
            element={
              <ProtectedRoute allowedRoles={["lawyer"]}>
                {gated(features.lawyerDashboard, <LawyerDashboard />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/lawyer/leads"
            element={
              <ProtectedRoute allowedRoles={["lawyer"]}>
                {gated(features.lawyerLeads, <LawyerLeads />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/lawyer/messages"
            element={
              <ProtectedRoute allowedRoles={["lawyer"]}>
                {gated(features.lawyerMessages, <LawyerMessages />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/lawyer/cases"
            element={
              <ProtectedRoute allowedRoles={["lawyer"]}>
                {gated(features.lawyerCases, <LawyerCases />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/lawyer/calendar"
            element={
              <ProtectedRoute allowedRoles={["lawyer"]}>
                {gated(features.lawyerCalendar, <LawyerCalendar />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/lawyer/billing"
            element={
              <ProtectedRoute allowedRoles={["lawyer"]}>
                {gated(features.lawyerBilling, <LawyerBilling />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/lawyer/documents"
            element={
              <ProtectedRoute allowedRoles={["lawyer"]}>
                {gated(features.lawyerDocuments, <LawyerDocuments />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/lawyer/clients"
            element={
              <ProtectedRoute allowedRoles={["lawyer"]}>
                {gated(features.lawyerClients, <LawyerClients />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/lawyer/tools"
            element={
              <ProtectedRoute allowedRoles={["lawyer"]}>
                {gated(features.lawyerTools, <LawyerTools />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/lawyer/settings"
            element={
              <ProtectedRoute allowedRoles={["lawyer"]}>
                {gated(features.lawyerSettings, <LawyerSettings />)}
              </ProtectedRoute>
            }
          />

          <Route path="*" element={page(<NotFound />)} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
            {features.supportChat && <SupportChat />}
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

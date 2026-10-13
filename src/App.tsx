import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PageLoader from "@/components/PageLoader";
import PageTransition from "@/components/PageTransition";
import ProtectedRoute from "@/components/ProtectedRoute";
import { queryClient } from "@/lib/queryClient";

const Index = lazy(() => import("@/pages/Index"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Signup = lazy(() => import("@/pages/auth/Signup"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const VerifyEmailSuccess = lazy(() => import("@/pages/auth/VerifyEmailSuccess"));
const FindLawyers = lazy(() => import("@/pages/client/FindLawyers"));
const LawyerProfile = lazy(() => import("@/pages/client/LawyerProfile"));

function page(node: ReactNode) {
  return <PageTransition>{node}</PageTransition>;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={page(<Index />)} />
          <Route path="/login" element={page(<Login />)} />
          <Route path="/signup" element={page(<Signup />)} />
          <Route path="/forgot-password" element={page(<ForgotPassword />)} />
          <Route path="/reset-password" element={page(<ResetPassword />)} />
          <Route path="/verify-email-success" element={page(<VerifyEmailSuccess />)} />
          <Route path="/client/find-lawyers" element={page(<FindLawyers />)} />
          <Route path="/client/lawyer/:lawyerId" element={page(<LawyerProfile />)} />
          <Route
            path="/client/dashboard"
            element={
              <ProtectedRoute allowedRoles={["client"]}>
                {page(<FindLawyers />)}
              </ProtectedRoute>
            }
          />
          <Route path="*" element={page(<NotFound />)} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Sonner richColors position="top-center" />
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import Layout from "@/components/layout";

// Route-level code splitting keeps the first load small
const LandingPage = lazy(() => import("@/landing/LandingPage"));
const AuthPage = lazy(() => import("@/pages/auth"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const NewLeadPage = lazy(() => import("@/pages/new-lead"));
const PipelinePage = lazy(() => import("@/pages/pipeline"));
const ActivityPage = lazy(() => import("@/pages/activity"));
const CalendarPage = lazy(() => import("@/pages/calendar"));
const AnalyticsPage = lazy(() => import("@/pages/analytics"));
const CentresPage = lazy(() => import("@/pages/centres"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const BriefPage = lazy(() => import("@/pages/brief"));
const AutopilotPage = lazy(() => import("@/pages/autopilot"));

function PageLoader() {
  return (
    <div className="h-full min-h-[50vh] flex items-center justify-center">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute allowUnonboarded>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
            <Route path="new" element={<Suspense fallback={<PageLoader />}><NewLeadPage /></Suspense>} />
            <Route path="pipeline/:id" element={<Suspense fallback={<PageLoader />}><PipelinePage /></Suspense>} />
            <Route path="activity" element={<Suspense fallback={<PageLoader />}><ActivityPage /></Suspense>} />
            <Route path="calendar" element={<Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>} />
            <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
            <Route path="centres" element={<Suspense fallback={<PageLoader />}><CentresPage /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
            <Route path="brief" element={<Suspense fallback={<PageLoader />}><BriefPage /></Suspense>} />
            <Route path="autopilot" element={<Suspense fallback={<PageLoader />}><AutopilotPage /></Suspense>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { AppNav } from "@/components/app-nav";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import VerifyEmail from "@/pages/verify-email";
import Dashboard from "@/pages/dashboard";
import Household from "@/pages/household";
import Perks from "@/pages/perks";
import Crowdsource from "@/pages/crowdsource";
import Admin from "@/pages/admin";
import { useEffect } from "react";
import { useAuth } from '@/lib/auth';
import AcceptInvite from '@/pages/accept-invite';

function VerifyRedirect({ token }: { token: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(`/verify-email?token=${token}`);
  }, [token, setLocation]);
  return null;
}

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (isLoading) return;
    if (user) {
      setLocation('/dashboard');
    } else {
      setLocation('/login');
    }
  }, [user, isLoading, setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/auth/verify/:token">
        {(params) => <VerifyRedirect token={params.token} />}
      </Route>
      <Route path="/accept-invite" component={AcceptInvite} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/household">
        <ProtectedRoute>
          <Household />
        </ProtectedRoute>
      </Route>
      <Route path="/perks">
        <ProtectedRoute>
          <Perks />
        </ProtectedRoute>
      </Route>
      <Route path="/crowdsource">
        <ProtectedRoute>
          <Crowdsource />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute adminOnly>
          <Admin />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <AppNav />
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

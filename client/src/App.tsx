import { Switch, Route, useLocation, useRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import TasksPage from "@/pages/TasksPage";
import DashboardPage from "@/pages/DashboardPage";
import TaskPayablePage from "@/pages/TaskPayablePage";
import ProjectsPage from "@/pages/ProjectsPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import { Layout } from "@/components/Layout";
import { ThemeProvider } from "next-themes";
import { TaskProvider } from "./context/TaskContext";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { useAuth } from "./context/AuthContext";
import { useEffect } from "react";

// Protected route wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
      return;
    }
    
    // If authenticated and at home route, redirect based on role
    if (!isLoading && isAuthenticated && (location === '/' || location === '/dashboard')) {
      // Only Super Admin and Supervisor can see Dashboard
      if (user?.role !== 'super_admin' && user?.role !== 'supervisor') {
        setLocation('/tasks');
      }
    }
  }, [isAuthenticated, isLoading, setLocation, location, user]);
  
  // Show nothing while checking authentication
  if (isLoading) return null;
  
  // If authenticated, render the component
  return isAuthenticated ? <Component /> : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/payable">
        {() => <ProtectedRoute component={TaskPayablePage} />}
      </Route>
      <Route path="/projects">
        {() => <ProtectedRoute component={ProjectsPage} />}
      </Route>
      <Route path="/users">
        {() => <ProtectedRoute component={UsersPage} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>
      <Route path="/tasks">
        {() => <ProtectedRoute component={TasksPage} />}
      </Route>
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  
  // If not authenticated, no need to load task or notification providers
  if (!isAuthenticated) {
    return <Router />;
  }
  
  return (
    <>
      <NotificationProvider>
        <TaskProvider>
          <Layout>
            <Router />
          </Layout>
        </TaskProvider>
      </NotificationProvider>
    </>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" attribute="class">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

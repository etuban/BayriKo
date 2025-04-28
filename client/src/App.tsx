import { Switch, Route, useLocation, useRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import TasksPage from "@/pages/TasksPage";
import DashboardPage from "@/pages/DashboardPage";
import PDFInvoicePage from "@/pages/TaskPayablePage"; // Renamed for better clarity
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectComparisonPage from "@/pages/ProjectComparisonPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import OrganizationsPage from "@/pages/OrganizationsPage";
import OrganizationSettingsPage from "@/pages/OrganizationSettingsPage";
import BugReportPage from "@/pages/BugReportPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import TermsOfServicePage from "@/pages/TermsOfServicePage";
import CookiesPolicyPage from "@/pages/CookiesPolicyPage";
import ContactUsPage from "@/pages/ContactUsPage";
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
    
    // If authenticated, apply role-based redirections
    if (!isLoading && isAuthenticated) {
      // Staff users should be redirected to tasks page if they try to access dashboard
      if (user?.role === 'staff' && (location === '/' || location === '/dashboard')) {
        setLocation('/tasks');
        return;
      }
      
      // Only Super Admin and Supervisor can access the Dashboard
      // Team Lead and Staff should be redirected to tasks
      if ((location === '/' || location === '/dashboard') && 
          user?.role !== 'super_admin' && 
          user?.role !== 'supervisor') {
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
  // Get the user context for default route selection
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';
  
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={LoginPage} />
      <Route path="/forgot-password" component={LoginPage} />
      <Route path="/reset-password" component={LoginPage} />
      <Route path="/">
        {() => {
          // Redirect Staff users to Tasks page automatically
          return <ProtectedRoute component={isStaff ? TasksPage : DashboardPage} />;
        }}
      </Route>
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/payable">
        {() => <ProtectedRoute component={PDFInvoicePage} />}
      </Route>
      <Route path="/projects">
        {() => <ProtectedRoute component={ProjectsPage} />}
      </Route>
      <Route path="/project-comparison">
        {() => <ProtectedRoute component={ProjectComparisonPage} />}
      </Route>
      <Route path="/users">
        {() => <ProtectedRoute component={UsersPage} />}
      </Route>
      <Route path="/organizations">
        {() => {
          const { user } = useAuth();
          if (user?.role !== 'super_admin') {
            return <NotFound />;
          }
          return <ProtectedRoute component={OrganizationsPage} />;
        }}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>
      <Route path="/organization-settings">
        {() => {
          const { user } = useAuth();
          // Only Super Admin and Supervisor can access organization settings
          if (user?.role !== 'super_admin' && user?.role !== 'supervisor') {
            return <NotFound />;
          }
          return <ProtectedRoute component={OrganizationSettingsPage} />;
        }}
      </Route>
      <Route path="/tasks">
        {() => <ProtectedRoute component={TasksPage} />}
      </Route>
      <Route path="/bug-report" component={BugReportPage} />
      
      {/* Public legal and contact pages */}
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/cookies-policy" component={CookiesPolicyPage} />
      <Route path="/contact-us" component={ContactUsPage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  
  return (
    <>
      <NotificationProvider>
        <TaskProvider>
          {isAuthenticated ? (
            <Layout>
              <Router />
            </Layout>
          ) : (
            <Router />
          )}
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

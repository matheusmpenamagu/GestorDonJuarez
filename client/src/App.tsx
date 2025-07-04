import { Switch, Route, Redirect } from "wouter";
import { lazy, Suspense, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Carregamento assíncrono das páginas
const Login = lazy(() => import("./pages/login"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const Checklists = lazy(() => import("./pages/checklists"));
const CreateChecklist = lazy(() => import("./pages/create-checklist"));
const Departments = lazy(() => import("./pages/departments"));
const Collaborators = lazy(() => import("./pages/collaborators"));
const History = lazy(() => import("./pages/history"));
const Settings = lazy(() => import("./pages/settings"));
const NotFound = lazy(() => import("./pages/not-found"));
const PublicChecklistView = lazy(() => import("./pages/public/checklist-view"));

// Componente de carregamento
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-full bg-background">
    <div className="flex flex-col items-center">
      <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      <span className="mt-4 text-xl font-medium">Carregando página...</span>
    </div>
  </div>
);

// Componente para proteger rotas que precisam de autenticação
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');

        if (token && userData) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Suspense fallback={<PageLoader />}>
          <Switch>
            {/* Página de login */}
            <Route path="/login" component={Login} />

            {/* Páginas públicas */}
            <Route path="/public/checklist/:executionId" component={PublicChecklistView} />

            {/* Redirecionamento da raiz */}
            <Route path="/">
              <ProtectedRoute>
                <Redirect to="/dashboard" />
              </ProtectedRoute>
            </Route>

            {/* Páginas protegidas */}
            <Route path="/dashboard">
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </Route>
            <Route path="/checklists">
              <ProtectedRoute>
                <Checklists />
              </ProtectedRoute>
            </Route>
            <Route path="/checklists/criar">
              <ProtectedRoute>
                <CreateChecklist />
              </ProtectedRoute>
            </Route>
            <Route path="/checklists/editar/:id">
              <ProtectedRoute>
                <CreateChecklist />
              </ProtectedRoute>
            </Route>
            <Route path="/departments">
              <ProtectedRoute>
                <Departments />
              </ProtectedRoute>
            </Route>
            <Route path="/collaborators">
              <ProtectedRoute>
                <Collaborators />
              </ProtectedRoute>
            </Route>
            <Route path="/history">
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            </Route>
            <Route path="/settings">
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            </Route>

            {/* Página 404 */}
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

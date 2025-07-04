import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import KegChanges from "@/pages/KegChanges";
import TapsManagement from "@/pages/TapsManagement";
import POSManagement from "@/pages/POSManagement";
import BeerStylesManagement from "@/pages/BeerStylesManagement";
import DevicesManagement from "@/pages/DevicesManagement";
import EmployeesManagement from "@/pages/EmployeesManagement";
import RolesManagement from "@/pages/RolesManagement";
import UnitsManagement from "@/pages/UnitsManagement";
import Co2Management from "@/pages/Co2Management";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/">
            <Layout>
              <Dashboard />
            </Layout>
          </Route>
          <Route path="/historico">
            <Layout>
              <History />
            </Layout>
          </Route>
          <Route path="/trocas-barril">
            <Layout>
              <KegChanges />
            </Layout>
          </Route>

          <Route path="/colaboradores">
            <Layout>
              <EmployeesManagement />
            </Layout>
          </Route>
          <Route path="/cargos">
            <Layout>
              <RolesManagement />
            </Layout>
          </Route>
          <Route path="/unidades">
            <Layout>
              <UnitsManagement />
            </Layout>
          </Route>
          <Route path="/co2">
            <Layout>
              <Co2Management />
            </Layout>
          </Route>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

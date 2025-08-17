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
import EmployeeEdit from "@/pages/EmployeeEdit";
import RolesManagement from "@/pages/RolesManagement";
import FreelancersManagement from "@/pages/FreelancersManagement";
import UnitsManagement from "@/pages/UnitsManagement";
import Co2Management from "@/pages/Co2Management";
import ProductsManagement from "@/pages/ProductsManagement";
import StockCountsManagement from "@/pages/StockCountsManagement";
import StockCountDetail from "@/pages/StockCountDetail";
import PublicStockCount from "@/pages/PublicStockCount";
import FleetManagement from "@/pages/FleetManagement";
import CompanySettings from "@/pages/CompanySettings";
import CashRegisterManagement from "@/pages/CashRegisterManagement";
import LabelsPage from "@/pages/LabelsPage";
import PublicLabelPage from "@/pages/PublicLabelPage";
import Privacy from "@/pages/Privacy";
import TermsOfUse from "@/pages/TermsOfUse";
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
      {/* Rotas públicas */}
      <Route path="/contagem-publica/:token" component={PublicStockCount} />
      <Route path="/etiquetas" component={PublicLabelPage} />
      <Route path="/privacidade" component={Privacy} />
      <Route path="/termos-de-uso" component={TermsOfUse} />
      
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/">
            <Layout>
              <Dashboard />
            </Layout>
          </Route>
          {/* Chopes */}
          <Route path="/chopes/historico">
            <Layout>
              <History />
            </Layout>
          </Route>
          <Route path="/chopes/trocas-barril">
            <Layout>
              <KegChanges />
            </Layout>
          </Route>
          <Route path="/chopes/torneiras">
            <Layout>
              <TapsManagement />
            </Layout>
          </Route>
          <Route path="/chopes/pontos-venda">
            <Layout>
              <POSManagement />
            </Layout>
          </Route>
          <Route path="/chopes/estilos">
            <Layout>
              <BeerStylesManagement />
            </Layout>
          </Route>
          <Route path="/chopes/dispositivos">
            <Layout>
              <DevicesManagement />
            </Layout>
          </Route>
          <Route path="/chopes/co2">
            <Layout>
              <Co2Management />
            </Layout>
          </Route>

          {/* Pessoas */}
          <Route path="/pessoas/colaboradores">
            <Layout>
              <EmployeesManagement />
            </Layout>
          </Route>
          <Route path="/pessoas/colaboradores/:id">
            <Layout>
              <EmployeeEdit />
            </Layout>
          </Route>
          <Route path="/pessoas/cargos">
            <Layout>
              <RolesManagement />
            </Layout>
          </Route>
          <Route path="/pessoas/freelancers">
            <Layout>
              <FreelancersManagement />
            </Layout>
          </Route>

          {/* Estoque */}
          <Route path="/estoque/produtos">
            <Layout>
              <ProductsManagement />
            </Layout>
          </Route>
          <Route path="/estoque/contagens">
            <Layout>
              <StockCountsManagement />
            </Layout>
          </Route>
          <Route path="/estoque/contagens/:id">
            <Layout>
              <StockCountDetail />
            </Layout>
          </Route>
          
          {/* Produção */}
          <Route path="/producao/etiquetas">
            <Layout>
              <LabelsPage />
            </Layout>
          </Route>

          {/* Empresa */}
          <Route path="/empresa/frota">
            <Layout>
              <FleetManagement />
            </Layout>
          </Route>
          <Route path="/empresa/unidades">
            <Layout>
              <UnitsManagement />
            </Layout>
          </Route>
          <Route path="/empresa/configuracoes">
            <Layout>
              <CompanySettings />
            </Layout>
          </Route>

          {/* Financeiro */}
          <Route path="/financeiro/caixas">
            <Layout>
              <CashRegisterManagement />
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

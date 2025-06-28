import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Beer } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-blue-700">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <Beer className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Controle de Chopes</h1>
            <p className="text-muted-foreground mt-2">Sistema de Monitoramento de Torneiras</p>
          </div>
          
          <Button 
            onClick={handleLogin}
            className="w-full"
            size="lg"
          >
            Entrar no Sistema
          </Button>
          
          <p className="text-center text-sm text-muted-foreground mt-4">
            Entre com suas credenciais para acessar o dashboard
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

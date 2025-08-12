import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Beer, Lock, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import backgroundImage from "@assets/fundo-login-min_1751337057493.jpg";

export default function Landing() {
  const { login } = useAuth();

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay escuro para melhor legibilidade */}
      <div className="absolute inset-0 bg-black/50"></div>
      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <Beer className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Gestor Don Juarez</CardTitle>
          <p className="text-muted-foreground">Sistema de Gestão Operacional</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-orange-600">
              <Shield className="h-5 w-5" />
              <Lock className="h-5 w-5" />
              <Shield className="h-5 w-5" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Acesso Seguro
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Sistema protegido com autenticação Replit. Apenas usuários autorizados cadastrados na base de dados podem acessar.
              </p>
            </div>
          </div>
          
          <Button 
            onClick={login}
            className="w-full"
            size="lg"
          >
            <Lock className="h-4 w-4 mr-2" />
            Fazer Login Seguro
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Você será redirecionado para a autenticação segura do Replit
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

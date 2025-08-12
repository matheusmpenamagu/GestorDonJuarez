import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Beer, Lock, Shield, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import backgroundImage from "@assets/fundo-login-min_1751337057493.jpg";

export default function Landing() {
  const { login } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Erro de validação",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo(a), ${userData.firstName}!`,
        });
        
        // Trigger auth check and redirect
        setTimeout(async () => {
          // Force auth recheck before redirecting
          window.location.reload();
        }, 1500);
      } else {
        const error = await response.json();
        toast({
          title: "Erro no login",
          description: error.message || "Credenciais inválidas",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Erro no login",
        description: "Erro de conexão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
        <CardContent>
          <Tabs defaultValue="employee" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="employee" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Colaborador</span>
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="employee" className="space-y-4">
              <form onSubmit={handleEmployeeLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button 
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar no Sistema"}
                </Button>
              </form>
              
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                Entre com suas credenciais de colaborador cadastradas
              </p>
            </TabsContent>
            
            <TabsContent value="admin" className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-2 text-orange-600">
                  <Shield className="h-5 w-5" />
                  <Lock className="h-5 w-5" />
                  <Shield className="h-5 w-5" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Acesso Administrativo
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Autenticação segura via Replit para administradores do sistema
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={login}
                className="w-full"
                size="lg"
              >
                <Lock className="h-4 w-4 mr-2" />
                Login Replit
              </Button>
              
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Você será redirecionado para a autenticação do Replit
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

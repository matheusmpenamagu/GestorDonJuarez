import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulação de autenticação - no ChecklistZap real seria uma API call
      if (formData.email === "admin@checklistzap.com" && formData.password === "admin123") {
        const userData = {
          id: 1,
          email: formData.email,
          name: "Administrador",
          role: "admin"
        };

        // Simula um token JWT
        const token = "fake-jwt-token-" + Date.now();
        
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(userData));

        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo ao ChecklistZap",
        });

        setLocation("/dashboard");
      } else {
        throw new Error("Credenciais inválidas");
      }
    } catch (error) {
      toast({
        title: "Erro no login",
        description: error instanceof Error ? error.message : "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">✓</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">ChecklistZap</CardTitle>
          <CardDescription>
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-800 font-medium mb-2">Credenciais de demonstração:</p>
            <p className="text-sm text-orange-700">
              <strong>Email:</strong> admin@checklistzap.com<br />
              <strong>Senha:</strong> admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
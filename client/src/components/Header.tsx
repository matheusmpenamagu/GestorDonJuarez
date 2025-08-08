import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Beer } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLocation } from "wouter";

export function Header() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket('/');
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    try {
      localStorage.removeItem('beerAuth');
      await fetch('/api/logout', { method: 'POST' });
      // Redireciona para a página de login
      navigate('/');
      // Force page reload to clear all state
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  return (
    <header className="bg-card shadow-sm border-b border-border">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Beer className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Gestor Don Juarez</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Real-time status indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
            
            {/* User menu */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-foreground">
                {(user as any)?.firstName || (user as any)?.email || 'Operador'}
              </span>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                {(user as any)?.avatar || "😊"}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="ml-2"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

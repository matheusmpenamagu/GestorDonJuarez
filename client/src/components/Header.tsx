import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Beer } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

export function Header() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket('/');

  const handleLogout = () => {
    localStorage.removeItem('beerAuth');
    window.location.href = "/";
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
                {user?.name || user?.email || 'Operador'}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
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

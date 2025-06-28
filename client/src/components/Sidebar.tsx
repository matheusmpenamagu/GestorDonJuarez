import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  History, 
  RefreshCw, 
  Wrench, 
  Store, 
  Beer 
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Monitoramento",
    items: [
      { href: "/", icon: BarChart3, label: "Dashboard Principal" },
      { href: "/historico", icon: History, label: "Histórico de Consumo" },
      { href: "/trocas-barril", icon: RefreshCw, label: "Trocas de Barril" },
    ],
  },
  {
    title: "Administração",
    items: [
      { href: "/torneiras", icon: Wrench, label: "Torneiras" },
      { href: "/pontos-venda", icon: Store, label: "Pontos de Venda" },
      { href: "/estilos-cerveja", icon: Beer, label: "Estilos de Cerveja" },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-card shadow-sm h-screen sticky top-0">
      <nav className="mt-6">
        {menuItems.map((section, index) => (
          <div key={index}>
            <div className="px-6 mb-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {section.title}
              </p>
            </div>
            
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={cn(
                      "group flex items-center px-6 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "text-primary bg-primary/10 border-r-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  History, 
  RefreshCw, 
  Wrench, 
  Store, 
  Beer,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Chopes",
    items: [
      { href: "/", icon: BarChart3, label: "Dashboard" },
      { href: "/historico", icon: History, label: "Histórico" },
      { href: "/torneiras", icon: Wrench, label: "Torneiras" },
      { href: "/pontos-venda", icon: Store, label: "Pontos de venda" },
      { href: "/estilos-cerveja", icon: Beer, label: "Estilos de chopes" },
      { href: "/dispositivos", icon: Smartphone, label: "Dispositivos" },
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
                  <div
                    className={cn(
                      "group flex items-center px-6 py-3 text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "text-primary bg-primary/10 border-r-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

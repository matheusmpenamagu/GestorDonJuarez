import { Link, useLocation } from "wouter";
import { useState } from "react";
import { 
  BarChart3, 
  History, 
  RefreshCw, 
  Wrench, 
  Store, 
  Beer,
  Smartphone,
  Users,
  UserCog,
  Settings,
  ChevronDown,
  ChevronRight
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
  {
    title: "Pessoas",
    items: [
      { href: "/colaboradores", icon: Users, label: "Colaboradores" },
      { href: "/cargos", icon: UserCog, label: "Cargos" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/configuracoes", icon: Settings, label: "Configurações" },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    "Chopes": true,
    "Pessoas": false,
    "Sistema": false
  });

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  return (
    <aside className="w-64 bg-card shadow-sm h-screen sticky top-0">
      <nav className="mt-6">
        {menuItems.map((section, index) => {
          const isExpanded = expandedSections[section.title];
          const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
          
          return (
            <div key={index}>
              <div 
                className="px-6 mb-2 cursor-pointer flex items-center justify-between group"
                onClick={() => toggleSection(section.title)}
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                  {section.title}
                </p>
                <ChevronIcon className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              
              {isExpanded && (
                <div className="mb-6">
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
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

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
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Chopes",
    icon: Beer,
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
    icon: Users,
    items: [
      { href: "/colaboradores", icon: Users, label: "Colaboradores" },
      { href: "/cargos", icon: UserCog, label: "Cargos" },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    "Chopes": false,
    "Pessoas": false
  });

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => {
      // Close all sections first
      const newState = Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as { [key: string]: boolean });
      
      // Then open the clicked section if it was previously closed
      newState[sectionTitle] = !prev[sectionTitle];
      
      return newState;
    });
  };

  return (
    <aside className="w-64 bg-card shadow-sm h-screen sticky top-0">
      <nav className="mt-6">
        {menuItems.map((section, index) => {
          const isExpanded = expandedSections[section.title];
          const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
          const SectionIcon = section.icon;
          
          return (
            <div key={index}>
              <div 
                className="px-6 mb-2 cursor-pointer flex items-center justify-between group pt-[10px] pb-[10px]"
                onClick={() => toggleSection(section.title)}
              >
                <div className="flex items-center gap-2">
                  <SectionIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                    {section.title}
                  </p>
                </div>
                <ChevronIcon className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              {isExpanded && (
                <div className="mb-6">
                  {section.items.map((item) => {
                    const isActive = location === item.href;
                    
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={cn(
                            "group flex items-center px-8 py-3 text-sm font-medium transition-colors cursor-pointer",
                            isActive
                              ? "text-primary bg-primary/10 border-r-2 border-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
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

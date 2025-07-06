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
  Building2,
  ChevronDown,
  ChevronRight,
  FileText,
  Wind,
  Clock,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Chopes",
    icon: Beer,
    items: [
      { href: "/", icon: BarChart3, label: "Dashboard" },
      { href: "/chopes/historico", icon: History, label: "Consumo de chopes" },
      { href: "/chopes/co2", icon: Wind, label: "CO2" },
      { href: "/chopes/torneiras", icon: Beer, label: "Torneiras" },
      { href: "/chopes/pontos-venda", icon: Store, label: "Pontos de venda" },
      { href: "/chopes/estilos", icon: Beer, label: "Estilos de chopes" },
      { href: "/chopes/dispositivos", icon: Smartphone, label: "Dispositivos" },
    ],
  },
  {
    title: "Pessoas",
    icon: Users,
    items: [
      { href: "/pessoas/colaboradores", icon: Users, label: "Colaboradores" },
      { href: "/pessoas/cargos", icon: UserCog, label: "Cargos" },
      { href: "/pessoas/freelancers", icon: Clock, label: "Freelancers" },
    ],
  },
  {
    title: "Estoque",
    icon: Package,
    items: [
      { href: "/estoque/produtos", icon: Package, label: "Produtos" },
      { href: "/estoque/contagens", icon: FileText, label: "Contagens" },
    ],
  },
  {
    title: "Empresa",
    icon: Building2,
    items: [
      { href: "/empresa/unidades", icon: Building2, label: "Unidades" },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    "Chopes": false,
    "Pessoas": false,
    "Estoque": false,
    "Empresa": false
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
            <div key={index} className="mb-2">
              <div 
                className="group flex items-center justify-between px-8 py-3 text-sm font-medium transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={() => toggleSection(section.title)}
              >
                <div className="flex items-center gap-2">
                  <SectionIcon className="h-4 w-4" />
                  <span>{section.title}</span>
                </div>
                <ChevronIcon className="h-3 w-3" />
              </div>
              {isExpanded && (
                <div className="mb-4">
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

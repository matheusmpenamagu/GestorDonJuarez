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
  Package,
  Settings,
  DollarSign,
  CreditCard,
  Car,
  Tags,
  ChefHat,
  ShoppingCart
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
      { 
        label: "Compras", 
        icon: ShoppingCart, 
        submenu: [
          { href: "/compras/sugestao", icon: ShoppingCart, label: "Sugestão de compras" }
        ]
      },
    ],
  },
  {
    title: "Produção",
    icon: ChefHat,
    items: [
      { href: "/producao/etiquetas", icon: Tags, label: "Etiquetas" },
    ],
  },
  {
    title: "Empresa",
    icon: Building2,
    items: [
      { href: "/empresa/frota", icon: Car, label: "Frota" },
      { href: "/empresa/unidades", icon: Building2, label: "Unidades" },
      { href: "/empresa/configuracoes", icon: Settings, label: "Configurações" },
    ],
  },
  {
    title: "Financeiro",
    icon: DollarSign,
    items: [
      { href: "/financeiro/caixas", icon: CreditCard, label: "Caixas" },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    "Chopes": false,
    "Pessoas": false,
    "Estoque": false,
    "Produção": false,
    "Empresa": false,
    "Financeiro": false
  });

  const [expandedSubmenus, setExpandedSubmenus] = useState<{ [key: string]: boolean }>({
    "Compras": false,
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

  const toggleSubmenu = (submenuTitle: string) => {
    setExpandedSubmenus(prev => ({
      ...prev,
      [submenuTitle]: !prev[submenuTitle]
    }));
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
                  {section.items.map((item, itemIndex) => {
                    // Se tem submenu, renderiza como expansível
                    if ('submenu' in item && item.submenu) {
                      const isSubmenuExpanded = expandedSubmenus[item.label];
                      const ChevronIcon = isSubmenuExpanded ? ChevronDown : ChevronRight;
                      const ItemIcon = item.icon;
                      
                      return (
                        <div key={itemIndex}>
                          <div
                            className="group flex items-center justify-between px-12 py-3 text-sm font-medium transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            onClick={() => toggleSubmenu(item.label)}
                          >
                            <div className="flex items-center gap-2">
                              <ItemIcon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </div>
                            <ChevronIcon className="h-3 w-3" />
                          </div>
                          {isSubmenuExpanded && (
                            <div className="mb-2">
                              {item.submenu.map((subItem) => {
                                const isActive = location === subItem.href;
                                const SubItemIcon = subItem.icon;
                                
                                return (
                                  <Link key={subItem.href} href={subItem.href}>
                                    <div
                                      className={cn(
                                        "group flex items-center gap-2 px-16 py-3 text-sm font-medium transition-colors cursor-pointer",
                                        isActive
                                          ? "text-primary bg-primary/10 border-r-2 border-primary"
                                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                      )}
                                    >
                                      <SubItemIcon className="h-4 w-4" />
                                      <span>{subItem.label}</span>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    // Se tem href direto, renderiza como item normal
                    if ('href' in item && item.href) {
                      const isActive = location === item.href;
                      const ItemIcon = item.icon;
                      
                      return (
                        <Link key={item.href} href={item.href}>
                          <div
                            className={cn(
                              "group flex items-center gap-2 px-12 py-3 text-sm font-medium transition-colors cursor-pointer",
                              isActive
                                ? "text-primary bg-primary/10 border-r-2 border-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                          >
                            <ItemIcon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </div>
                        </Link>
                      );
                    }
                    
                    return null;
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

# Gestor Don Juarez - Sistema de Gestão Operacional

## Overview

Sistema de gestão operacional completo para a Don Juarez, uma empresa brasileira de cervejaria artesanal. Originalmente desenvolvido para monitoramento em tempo real de chopes e barris conectados a sensores ESP32, o sistema está sendo expandido para incluir várias operações administrativas que anteriormente eram gerenciadas através de planilhas. Fornece dashboard abrangente, monitoramento de consumo, gerenciamento de barris e exportação de dados com localização completa em português brasileiro e suporte ao fuso horário de São Paulo.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom theme variables
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Real-time Updates**: WebSocket integration for live data streaming
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript (ESM modules)
- **Database ORM**: Drizzle with PostgreSQL
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: Replit Auth (OIDC-based)
- **Session Management**: Express sessions with PostgreSQL store
- **Real-time Communication**: WebSocket server for live updates

### Project Structure
```
├── client/           # React frontend application
├── server/           # Express.js backend API
├── shared/           # Shared TypeScript schemas and types
├── migrations/       # Database migration files
└── attached_assets/  # Documentation and requirements
```

## Key Components

### Database Schema
- **Users**: Required for Replit Auth integration
- **Points of Sale**: Physical locations where taps are installed
- **Beer Styles**: Different types of beer served
- **Devices**: ESP32 hardware controllers with 5-digit alphanumeric codes
- **Taps**: Individual beer dispensing points with flow sensors
- **Pour Events**: Real-time consumption data from ESP32 sensors
- **Keg Change Events**: Barrel replacement tracking
- **Sessions**: Session management for authentication

### API Endpoints
- **Authentication Routes**: `/api/auth/*` for login/logout
- **Webhook Endpoints**: 
  - `/api/webhooks/pour` for ESP32 flow data
  - `/api/webhooks/keg-change` for barrel changes
- **Management APIs**: CRUD operations for taps, POS, beer styles
- **Reporting APIs**: Historical data and CSV export functionality
- **Dashboard APIs**: Real-time statistics and monitoring data

### Real-time Features
- WebSocket server for live data streaming
- Automatic dashboard updates when new pour events occur
- Real-time tap status monitoring with low-volume alerts
- Live consumption statistics with São Paulo timezone

## Data Flow

### Hardware Integration Flow
1. ESP32 + YF-S401 flow sensors detect beer dispensation
2. Sensors send webhook data: `{datetime, tap_id, total_volume_ml}`
3. System calculates volume consumed and updates available volume
4. WebSocket broadcasts updates to connected dashboard clients
5. Database stores all events with São Paulo timezone timestamps

### User Interaction Flow
1. User authenticates via Replit Auth (admin-managed accounts only)
2. Dashboard loads with real-time tap status and recent activity
3. WebSocket connection established for live updates
4. Users can export historical data as CSV files
5. Administrators manage taps, points of sale, and beer styles

### Keg Management Flow
1. Operator replaces keg and triggers webhook: `{datetime, tap_id}`
2. System resets available volume to keg capacity
3. Historical consumption data preserved
4. Dashboard updates to show new keg status

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe database operations
- **express**: Web server framework
- **ws**: WebSocket implementation
- **date-fns-tz**: São Paulo timezone handling
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI components

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking and compilation
- **tailwindcss**: Utility-first CSS framework
- **drizzle-kit**: Database migration tool

### Authentication
- Uses Replit's built-in OIDC authentication
- No self-registration - admin-only user management
- Session-based authentication with PostgreSQL storage

### Hardware Integration
- Compatible with ESP32 microcontrollers
- YF-S401 flow sensors for beer measurement
- Webhook-based data transmission
- Supports multiple taps with unique identifiers

## Deployment Strategy

### Environment Configuration
- **DATABASE_URL**: Neon PostgreSQL connection string
- **SESSION_SECRET**: Session encryption secret
- **REPL_ID**: Replit environment identifier
- **ISSUER_URL**: OIDC authentication endpoint
- **REPLIT_DOMAINS**: Allowed domains for authentication

### Build Process
1. Frontend builds with Vite to `dist/public`
2. Backend compiles with ESBuild to `dist/index.js`
3. Database schema pushed with Drizzle migrations
4. Static assets served from build directory

### Production Considerations
- Database connection pooling for performance
- Session store cleanup for expired sessions
- WebSocket connection management and reconnection
- Error handling and logging for webhook endpoints
- CORS configuration for API access

### Monitoring and Maintenance
- Real-time status indicators for WebSocket connectivity
- Database query optimization for large datasets
- Automated CSV export functionality
- Timezone-aware data display and storage
- Multi-language support (Brazilian Portuguese)

## Changelog
- June 28, 2025. Initial setup
- June 29, 2025. Added device management system with ESP32 hardware tracking
- June 29, 2025. Implemented sensor-to-tap connection system
- June 29, 2025. Migrated tap IDs from strings to auto-incrementing integers

## Recent Changes
- ✓ Transformação para gestor operacional completo da Don Juarez
- ✓ Reorganização do menu lateral em "Chopes" com submenus simplificados
- ✓ Alteração do título da aplicação para "Gestor Don Juarez"
- ✓ Implementação do tema laranja como cor principal
- ✓ Substituição da fonte para Montserrat do Google Fonts
- ✓ Preparação da arquitetura para expansão de módulos administrativos
- ✓ Manutenção de todas as funcionalidades existentes de controle de chopes
- ✓ Interface adaptada para gestão de múltiplas operações empresariais
- ✓ Menu reorganizado: Dashboard, Histórico, Torneiras, Pontos de venda, Estilos de chopes, Dispositivos
- ✓ Sistema preparado para adicionar novos módulos de gestão no futuro
- ✓ Implementação de menu colapsável com ícones de expansão/colapso
- ✓ Criação de timeline vertical na página de histórico
- ✓ Timeline combina eventos de consumo e trocas de barril
- ✓ Filtros por data e torneira mantidos na nova interface
- ✓ Remoção da funcionalidade de exportação CSV da tela de histórico
- ✓ Design visual aprimorado com ícones distintos para cada tipo de evento
- ✓ Implementação do módulo "Pessoas" com gestão de colaboradores e cargos
- ✓ Sistema de permissões baseado nos submenus do sistema
- ✓ Criação de tabelas de banco: roles, employees com relações
- ✓ APIs REST completas para CRUD de funcionários e cargos
- ✓ Interface de gerenciamento com formulários e validações
- ✓ Reestruturação completa da lógica de capacidade de barris (Julho 1, 2025)
- ✓ Migração de capacidade das torneiras para eventos de troca
- ✓ Implementação de capacidades específicas por barril (30L/50L)
- ✓ Nova fórmula de cálculo: "última troca - consumos posteriores"
- ✓ Interface para registro manual de trocas com seleção de capacidade
- ✓ Correção de exibição de capacidade total nos cards do dashboard
- ✓ Reorganização do menu lateral: remoção de submenus específicos (Julho 1, 2025)
- ✓ Transformação de "Histórico" em "Consumo de chopes" com interface de abas
- ✓ Integração de Torneiras, Pontos de venda, Estilos de chopes e Dispositivos como abas
- ✓ Simplificação da navegação lateral para melhor organização
- ✓ Importação completa de dados históricos de CO2 (87 registros 2023-2025)
- ✓ Implementação de cards de estatísticas de CO2 na tela de recargas (Julho 1, 2025)
- ✓ Algoritmo de cálculo de eficiência CO2/litro com comparação de períodos
- ✓ Filtro para contabilizar CO2 apenas das unidades Grão Pará e Beer Truck
- ✓ API /api/co2-stats com métricas dos últimos 30 dias vs período anterior
- ✓ Reestruturação do dashboard com dois boxes principais (Julho 1, 2025)
- ✓ Box "Consumo de chopes" com 4 cards de estatísticas e monitoramento de torneiras
- ✓ Box "CO2" com 2 cards de estatísticas: total de recargas e eficiência por litro
- ✓ Layout reorganizado com cards aninhados e design visual aprimorado
- ✓ Atividade em tempo real integrada ao box "Consumo de chopes"
- ✓ Layout em duas colunas: 4 cards de métricas (metade esquerda) e atividade em tempo real (metade direita)
- ✓ Limitação para exibir apenas os últimos 5 registros de consumo
- ✓ Design compacto com informações essenciais em formato card horizontal

## User Preferences

Preferred communication style: Simple, everyday language.
Company branding: Don Juarez (cervejaria artesanal brasileira)
Theme color: Orange (hsl(20, 90%, 48%))
Typography: Montserrat font family
Interface language: Portuguese (Brazil)
Menu structure: Simplified categorization with expandable modules
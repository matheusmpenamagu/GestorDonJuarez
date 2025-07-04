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
- Webhook-based data transmission with security token validation
- Supports multiple taps with unique identifiers

#### ESP32 Configuration Guide
**Required Headers for All Webhooks:**
```cpp
http.addHeader("Content-Type", "application/json");
http.addHeader("x-webhook-token", "9hlJAoyTSy7K"); // Use actual webhook_token
```

**Webhook URLs (Production):**
- Pour events: `https://gestor.donjuarez.com.br/api/webhooks/pour`
- Keg changes: `https://gestor.donjuarez.com.br/api/webhooks/keg-change`
- Heartbeat: `https://gestor.donjuarez.com.br/api/webhooks/heartbeat`

**Webhook URLs (Development):**
- Replace domain with: `https://ea3123c5-9f03-4f32-844a-fe4c8cdd0203-00-1inaocwyrymso.worf.replit.dev`

**Security Requirements:**
- All webhooks require valid token in header
- Token validation prevents unauthorized access
- 401 Unauthorized returned for missing/invalid tokens

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
- ✓ Layout em colunas para resumo de freelancers implementado (Julho 4, 2025)
- ✓ Design responsivo: 1 coluna mobile, 2 colunas tablet, 3 colunas desktop
- ✓ Cards individuais com avatar, nome, telefone e métricas organizadas
- ✓ Remoção do ícone de telefone para visual mais limpo
- ✓ Efeito hover e transições suaves nos cards dos freelancers
- ✓ Datepicker avançado implementado com períodos predefinidos (Julho 4, 2025)
- ✓ 4 ranges prontos: Últimos 7 dias, Últimos 30 dias, Este mês, Mês anterior
- ✓ Seção de período personalizado com campos de data inicial e final
- ✓ Interface elegante com Popover e indicação visual do período selecionado
- ✓ Botões destacados em laranja para o período atualmente ativo
- ✓ Sistema de turnos noturnos corrigido com regra das 5h da manhã (Julho 4, 2025)
- ✓ Implementada lógica robusta de pareamento entrada/saída para registros fora de ordem
- ✓ Correção de cálculo de horas para trabalhos que passam da meia-noite
- ✓ Registros antes das 5h são considerados do dia de trabalho anterior
- ✓ Sistema funciona corretamente para freelancers com turnos de 18h às 00:15h
- ✓ Formulário de freelancers completamente reformulado (Julho 4, 2025)
- ✓ Removido campo "Nome" manual, implementado seletor de funcionários freelancers
- ✓ Integração com tabela employees para vincular registros via employeeId
- ✓ Interface mostra "Nome Sobrenome - (XX) XXXXX-XXXX" para seleção
- ✓ Dados preenchidos automaticamente do colaborador selecionado
- ✓ Sistema de controle de ponto para freelancers implementado e corrigido (Julho 3, 2025)
- ✓ Migração de freelancer_time_entries para usar employeeId (vinculação com funcionários)
- ✓ Correção de estrutura da API freelancer-stats (objeto com freelancers array)
- ✓ Tipificação completa TypeScript para todas as consultas e componentes
- ✓ Correção de chamadas apiRequest com ordem correta de parâmetros
- ✓ Tratamento de valores null em formatPhoneNumber e outros campos
- ✓ Sistema totalmente funcional sem erros JavaScript
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
- ✓ Limitação para exibir apenas os últimos 3 registros de consumo
- ✓ Remoção do card wrapper da atividade em tempo real para layout mais limpo
- ✓ Design compacto com informações essenciais em formato horizontal
- ✓ Monitoramento de torneiras com visual mais compacto mantendo barra de status
- ✓ Redução de padding, tamanhos de fonte e espaçamentos nos cards das torneiras
- ✓ Preservação da funcionalidade de indicador visual de status (verde/vermelho)
- ✓ Aumento da taxa de atualização em tempo real (Julho 1, 2025)
- ✓ Atividade em tempo real: atualização a cada 2 segundos
- ✓ Estatísticas do dashboard: atualização a cada 3 segundos
- ✓ Dados das torneiras: atualização a cada 5 segundos
- ✓ Estatísticas CO2: atualização a cada 30 segundos (dados menos voláteis)
- ✓ Remoção do título e subtítulo da página de histórico de consumo de chopes
- ✓ Interface mais limpa começando diretamente com os filtros e timeline
- ✓ Filtros tornados mais discretos com design sutil (Julho 1, 2025)
- ✓ Substituição do card destacado por bordas tracejadas e cores esmaecidas
- ✓ Ícones e textos em tom de cinza para menor destaque visual
- ✓ Conversão da timeline para tabela dinâmica ordenável (Julho 1, 2025)
- ✓ Implementação de colunas clicáveis para ordenação (Data/Hora, Torneira, Local)
- ✓ Uso dos componentes Table do sistema com estilo padronizado
- ✓ Movimentação dos filtros para logo acima da tabela
- ✓ Badges coloridos para identificação de tipos de evento (Consumo/Troca)
- ✓ Alteração do título para "Histórico de atividades"
- ✓ Ordenação padrão por data com eventos mais recentes primeiro
- ✓ Correção de headers duplicados nas abas de gestão (Julho 1, 2025)
- ✓ Remoção de títulos redundantes nas abas Torneiras, Pontos de venda, Estilos e Dispositivos
- ✓ Implementação de sistema de cores EBC para estilos de cerveja (Julho 1, 2025)
- ✓ Adição de campo ebcColor na tabela beer_styles do banco de dados
- ✓ Interface de seleção de cores baseada na Escala EBC (European Brewery Convention)
- ✓ Palette de 10 cores EBC: de Palha (EBC 2) a Preto (EBC 80)
- ✓ Exibição visual das cores nos cards dos estilos com amostras de cores reais
- ✓ Formulário atualizado com seletor de cores EBC e descrições explicativas
- ✓ Integração das cores EBC nas barras de status das torneiras (Julho 1, 2025)
- ✓ Correção do erro de tela branca na edição de estilos
- ✓ Barras de progresso do monitoramento agora usam a cor EBC do estilo da cerveja
- ✓ Cores autênticas de cerveja baseadas na Convenção Europeia de Cervejaria
- ✓ Implementação de cores EBC nos números das torneiras (Julho 1, 2025)
- ✓ Círculos dos números das torneiras usam cor EBC do estilo da cerveja
- ✓ Aplicado tanto no monitoramento de torneiras quanto na atividade em tempo real
- ✓ Atualização dos tipos TypeScript para incluir ebcColor nos eventos
- ✓ Sistema completo de importação do cardápio Don Juarez (Julho 1, 2025)
- ✓ 9 estilos autênticos do menu com descrições, IBU, ABV e cores EBC
- ✓ Algoritmo de verificação de duplicatas para evitar cadastros redundantes
- ✓ Botão "Importar Cardápio" na interface de gestão de estilos
- ✓ Contadores de importação: estilos novos vs já existentes
- ✓ Limpeza de estilos duplicados e migração de referências (Julho 1, 2025)
- ✓ Base de dados limpa apenas com estilos autênticos do cardápio Don Juarez
- ✓ Atualização automática de torneiras para usar estilos corretos
- ✓ Remoção do campo "Capacidade do barril" do formulário de torneiras (Julho 1, 2025)
- ✓ Simplificação da interface com capacidade gerenciada via eventos de troca
- ✓ Adição do campo WhatsApp na tabela de colaboradores (Julho 1, 2025)
- ✓ Limpeza completa do banco de dados de colaboradores existentes
- ✓ Importação de 26 colaboradores autênticos a partir de planilha CSV
- ✓ Criação automática de 9 novos cargos específicos da empresa
- ✓ Interface atualizada para exibir WhatsApp nos cards dos colaboradores
- ✓ Formulário de colaboradores expandido com campo de telefone
- ✓ Sistema de heartbeat para dispositivos ESP32 implementado (Julho 1, 2025)
- ✓ Campo lastHeartbeat adicionado à tabela de dispositivos no banco
- ✓ Webhook /api/webhooks/heartbeat para receber status dos dispositivos
- ✓ Indicadores visuais de status online/offline (círculo verde pulsante/vermelho)
- ✓ Verificação de dispositivos online nos últimos 2 minutos
- ✓ Indicadores aplicados tanto no dashboard quanto na gestão de dispositivos
- ✓ Sistema automatizado de atualização de timestamp de último heartbeat
- ✓ Implementação de validação de token de segurança para webhooks (Julho 3, 2025)
- ✓ Middleware de autenticação com token de 12 caracteres em todos os webhooks
- ✓ Headers aceitos: x-webhook-token ou webhook-token para compatibilidade
- ✓ Validação obrigatória nos endpoints: /api/webhooks/pour, /api/webhooks/keg-change, /api/webhooks/heartbeat
- ✓ Mensagens de erro específicas: token ausente vs token inválido
- ✓ Sistema robusto de proteção contra acesso não autorizado
- ✓ Auto-registro de dispositivos desconhecidos no webhook de heartbeat (Julho 3, 2025)
- ✓ Dispositivos novos automaticamente criados com nome "ESP8266" e status ativo
- ✓ Lógica inteligente de mapeamento: device_ids longos (>5 chars) usam primeiros 5 caracteres como código
- ✓ Mapeamento direto para device_ids de 5 caracteres ou menos
- ✓ Sistema previne duplicatas e gerencia conflitos de códigos automaticamente
- ✓ Documentação completa atualizada no esp32-webhook-examples.cpp

## User Preferences

Preferred communication style: Simple, everyday language.
Company branding: Don Juarez (cervejaria artesanal brasileira)
Theme color: Orange (hsl(20, 90%, 48%))
Typography: Montserrat font family
Interface language: Portuguese (Brazil)
Menu structure: Simplified categorization with expandable modules
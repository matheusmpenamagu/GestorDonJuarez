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

**Evolution API WhatsApp Integration:**
- Webhook endpoint: `/api/webhooks/evolution-whatsapp`
- Processes messages from Evolution API for freelancer time tracking
- Detects "Cheguei" (entrada) and "Fui" (saída) messages
- Validates freelancer registration via phone number
- Interactive unit selection for check-in
- Automatic check-out processing
- No token validation required for Evolution API webhook

**Security Requirements:**
- ESP32 webhooks require valid token in header
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
- ✓ Sistema de contagem pública totalmente funcional com persistência de dados (Julho 6, 2025)
- ✓ Botões individuais de salvamento com ícone de check laranja implementados
- ✓ Layout mobile otimizado para iPhone: tudo em uma linha, campos menores
- ✓ Endpoint público /api/stock-counts/public/:token/items para carregar dados existentes
- ✓ Dados persistem corretamente após reload da página com visual de itens salvos
- ✓ Foco automático apenas no primeiro campo, navegação manual sem interrupções
- ✓ Teclado numérico com suporte a vírgula e ponto como separadores decimais
- ✓ Barra de progresso fixa no topo mostrando andamento da contagem
- ✓ Botão "Finalizar Contagem" implementado na página pública (Julho 6, 2025)
- ✓ Endpoint /api/stock-counts/public/:token/finish criado para finalizar via token público
- ✓ Funcionalidade completa: salvamento individual + finalização + mudança para status "contagem_finalizada"
- ✓ Correção crítica: ícone de remoção habilitado para contagens com status "rascunho"
- ✓ Sistema permite remover produtos de contagens em edição conforme regra de negócio
- ✓ Sistema completo de status de contagens implementado (Julho 6, 2025)
- ✓ Quatro status com transições: Rascunho, Pronta para contagem, Em contagem, Contagem finalizada
- ✓ Linha do tempo horizontal visual substituindo badges de status tradicionais
- ✓ Status atual em laranja, concluídos em verde, pendentes em cinza com conectores visuais
- ✓ Ações completas por contagem: Editar, Editar produtos, Ver URL pública, Enviar WhatsApp, Excluir
- ✓ Campo observações removido da interface para simplificação
- ✓ WhatsApp automático enviado ao fechar contagem com link público
- ✓ Dialog para visualizar e copiar URL pública da contagem
- ✓ Mecânica de criação filtrada por unidade implementada corretamente (Julho 6, 2025)
- ✓ Sistema inclui apenas produtos associados à unidade da contagem
- ✓ Teste confirmado: contagem Apollonio criada com 17 produtos específicos da unidade
- ✓ Problema de filtro na edição de produtos corrigido (Julho 6, 2025)
- ✓ Endpoint /api/products/by-unit/:unitId implementado para filtrar produtos por unidade
- ✓ StockCountDetail.tsx corrigido para usar query específica em vez de carregar todos os produtos
- ✓ Teste confirmado: tela de edição agora mostra apenas 17 produtos da unidade Apollonio
- ✓ Funcionalidades de edição de contagem aprimoradas (Julho 6, 2025)
- ✓ Botão de reordenar produtos restaurado com suporte a status "rascunho"
- ✓ Ícone de deletar produtos adicionado com confirmação via toast
- ✓ Timeline de status integrada ao card de resumo da contagem
- ✓ Layout otimizado: timeline centralizada ocupando largura total do card
- ✓ Resumo reorganizado: timeline no topo, depois estatísticas
- ✓ URLs do sistema padronizadas para estrutura consistente menu/submenu (Julho 6, 2025)
- ✓ Implementada nova estrutura de rotas: /chopes/*, /pessoas/*, /estoque/*, /empresa/*
- ✓ Sidebar atualizado com navegação organizada por seções expandíveis
- ✓ Submenus Torneiras, Pontos de venda, Estilos e Dispositivos removidos da navegação
- ✓ Rotas mantidas funcionais para acesso direto via URL quando necessário
- ✓ Formulário de produtos com seleção múltipla de unidades implementado (Julho 5, 2025)
- ✓ Interface unificada para criação e edição com checkboxes de unidades múltiplas
- ✓ Endpoint /api/products/multi-unit (POST e PUT) para operações com múltiplas unidades
- ✓ Sistema atualiza associações produto-unidade automaticamente durante edição
- ✓ Correção do bug de formulário mostrando select na edição e checkboxes na criação
- ✓ Correção de imports e componentes para funcionar sem erros JavaScript
- ✓ Lógica de importação inteligente implementada (Julho 5, 2025)
- ✓ Sistema verifica código e unidade antes de decidir ação
- ✓ Novo código: cria produto e associa à unidade
- ✓ Código existente + mesma unidade: atualiza informações
- ✓ Código existente + nova unidade: associa produto à nova unidade
- ✓ Interface mostra todas as unidades associadas em badges coloridos
- ✓ Sistema de produtos duplicados em unidades diferentes implementado (Julho 5, 2025)
- ✓ Upload CSV inteligente lida com produtos duplicados em múltiplas unidades automaticamente
- ✓ Relacionamento many-to-many entre produtos e unidades funcionando perfeitamente
- ✓ Associações produto-unidade criadas automaticamente durante import CSV
- ✓ Contagens de estoque filtram corretamente produtos por unidade selecionada
- ✓ Sistema de produtos duplicados em unidades diferentes implementado (Julho 5, 2025)
- ✓ Upload CSV inteligente lida com produtos duplicados em múltiplas unidades automaticamente
- ✓ Relacionamento many-to-many entre produtos e unidades funcionando perfeitamente
- ✓ Associações produto-unidade criadas automaticamente durante import CSV
- ✓ Contagens de estoque filtram corretamente produtos por unidade selecionada
- ✓ Sistema completo de gestão de produtos implementado com upload CSV inteligente (Julho 5, 2025)
- ✓ Mapeamento de unidades corrigido para detectar corretamente Apollonio vs Grão Pará
- ✓ Teste confirmado: produto novo aparece corretamente em múltiplas unidades
- ✓ Logs detalhados de associação funcionando perfeitamente
- ✓ Caso específico Coca Cola (904) corrigido - produto agora em duas unidades (Julho 6, 2025)
- ✓ Sistema de importação CSV funcionando perfeitamente para produtos duplicados
- ✓ Teste confirmado: produto 904 nas unidades Apollonio e Grão Pará
- ✓ Problema de encoding corrigido (Julho 6, 2025)
- ✓ Sistema lida com caracteres corrompidos "GR�O PAR�" -> "grao para"
- ✓ Normalização robusta de texto remove acentos e corrige encoding
- ✓ Mapeamento de unidades funcionando com planilhas corrompidas
- ✓ Upload CSV totalmente funcional: 312 produtos importados com sucesso da planilha real
- ✓ Detecção automática de separador CSV (vírgula ou ponto-e-vírgula) implementada
- ✓ Mapeamento inteligente de colunas: "COD.", "PRODUTO", "CATEGORIA", "VALOR ATUAL"
- ✓ Sistema ignora colunas extras automaticamente conforme solicitado
- ✓ Interface corrigida para exibir nomes de categorias e unidades em vez de IDs
- ✓ Processamento robusto com logs detalhados para debug
- ✓ Tipagem TypeScript completa para todas as consultas e componentes
- ✓ Sistema completo de gestão de produtos implementado (Julho 5, 2025)
- ✓ Menu "Estoque" criado com submenu "Produtos" no sistema de navegação
- ✓ Tabela avançada com ordenação clicável em todas as colunas (código, nome, categoria, unidade, medida, valor)
- ✓ Sistema de busca em tempo real por nome, código ou categoria de produtos
- ✓ Formulários completos para criar e editar produtos com validação
- ✓ Funcionalidade de upload de planilha CSV para atualização em massa
- ✓ Endpoint /api/products/upload para processamento de arquivos CSV
- ✓ Scroll infinito e interface responsiva para grandes volumes de dados
- ✓ Formatação monetária brasileira (R$) para valores de produtos
- ✓ Sistema inteligente de mapeamento de colunas CSV (suporta nomes em português e inglês)
- ✓ Validação robusta de dados e tratamento de erros no upload
- ✓ Webhook Evolution API totalmente funcional para controle de ponto via WhatsApp (Julho 4, 2025)
- ✓ Endpoint `/api/webhooks/evolution-whatsapp` processando mensagens corretamente
- ✓ Detecção automática de "Cheguei" e "Fui" nas mensagens dos freelancers
- ✓ Validação de freelancers cadastrados via número de telefone brasileiro
- ✓ Fluxo completo de seleção de unidade para ponto de entrada
- ✓ Registro automático de ponto de saída sem necessidade de unidade
- ✓ Mensagens de erro personalizadas: usuário não encontrado, mensagem não reconhecida
- ✓ Schema corrigido com freelancer_phone como campo obrigatório
- ✓ Testes completos: entrada, saída, erros e validações funcionando
- ✓ Integração com Evolution API para envio automático de mensagens implementada (Julho 4, 2025)
- ✓ Função sendWhatsAppMessage() criada para envio via POST para wpp.donjuarez.com.br
- ✓ Todas as respostas do webhook convertidas para envio automático de WhatsApp
- ✓ Headers testados: api_key, Authorization Bearer, apikey, X-API-Key
- ✓ Body formatado corretamente: { "number": "remoteJid", "text": "mensagem" }
- ✅ Logs detalhados implementados para debug da requisição
- ✅ Formato correto Evolution API implementado: text + textMessage.text
- ✅ Header apikey funcionando corretamente
- ✅ SUCESSO: Status 201 Created - mensagens sendo enviadas automaticamente!
- ✅ Integração completa Evolution API funcionando (Julho 4, 2025)
- ✓ Seletor de emoji no cadastro de colaboradores implementado (Julho 4, 2025)
- ✓ 19 opções de emojis predefinidos com descrições (😊 Sorridente, 👨‍💼 Executivo, etc.)
- ✓ Campo "Emoji do Colaborador" adicionado ao formulário de funcionários
- ✓ Interface atualizada para incluir campo avatar em todas as operações CRUD
- ✓ Emojis já funcionando nos cards dos freelancers através do telefone
- ✓ Padronização de cores nos ícones dos cards (Julho 4, 2025)
- ✓ Ícones Clock e Calendar em laranja (text-orange-600)
- ✓ Texto das métricas em cor padrão do projeto (text-gray-900)
- ✓ Consistência visual com o tema laranja da aplicação
- ✓ Ícones para horas e dias nos cards de freelancers (Julho 4, 2025)
- ✓ Clock icon (🕐) para horas e Calendar icon (📅) para dias
- ✓ Métricas organizadas em uma única linha com ícones coloridos
- ✓ Layout mais visual e intuitivo para identificação rápida
- ✓ Emojis dos colaboradores implementados nos cards (Julho 4, 2025)
- ✓ Substituição do avatar circular pelos emojis personalizados dos funcionários
- ✓ Função helper para buscar emoji baseado no telefone do freelancer
- ✓ Fallback para emoji 👤 quando colaborador não encontrado
- ✓ Design compacto aplicado aos cards de freelancers (Julho 4, 2025)
- ✓ Avatar reduzido de 12x12 para 8x8, padding reduzido de 4 para 3
- ✓ Fontes menores: nome em text-sm, telefone em text-xs, métricas em text-sm
- ✓ Espaçamentos reduzidos: gap de 4 para 3, space-y de 2 para 1
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
- ✓ Correção crítica de filtragem por data na tela de freelancers (Julho 4, 2025)
- ✓ Algoritmo de timezone corrigido para trabalhar com UTC-3 (São Paulo)
- ✓ Endpoints /api/freelancer-entries e /api/freelancer-stats com filtragem funcionando
- ✓ Conversão adequada de datas: +3h início, +27h fim para cobrir todo o dia alvo
- ✓ Registros ID 19 e 20 agora visíveis corretamente na interface
- ✓ Sistema de cache invalidation otimizado para melhor performance
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
- ✓ Correção crítica da validação de telefones brasileiros no webhook Evolution API (Julho 4, 2025)
- ✓ Algoritmo robusto para remover código do país +55 de números recebidos
- ✓ Implementação de comparação pelos últimos 8 dígitos para máxima compatibilidade
- ✓ Sistema totalmente funcional: webhook 553388286293 reconhece cadastro 33988286293
- ✓ Logs detalhados para debug de comparação de números de telefone
- ✓ Teste completo realizado com sucesso usando número 33988286293
- ✓ Sistema de formatação de WhatsApp aprimorado e padronizado (Julho 4, 2025)
- ✓ Implementação de máscara visual (33) 99999-9999 nos formulários de funcionários
- ✓ Limpeza automática de caracteres especiais antes do armazenamento no banco
- ✓ Exibição consistente de telefones formatados em todas as interfaces
- ✓ Função displayWhatsApp() padronizada para apresentação visual
- ✓ Sistema funciona perfeitamente com múltiplos tipos de emprego por funcionário
- ✓ Problema no seletor de freelancers do formulário de ponto corrigido (Julho 4, 2025)
- ✓ Filtro de funcionários atualizado para usar campo employmentTypes array
- ✓ Sistema identifica corretamente funcionários com tipo "Freelancer"
- ✓ Formulário de registro manual de ponto totalmente funcional
- ✓ 12 freelancers disponíveis para seleção no sistema

## User Preferences

Preferred communication style: Simple, everyday language.
Company branding: Don Juarez (cervejaria artesanal brasileira)
Theme color: Orange (hsl(20, 90%, 48%))
Typography: Montserrat font family
Interface language: Portuguese (Brazil)
Menu structure: Simplified categorization with expandable modules
Testing contact: 33988286293 (número principal para testes de webhook WhatsApp)
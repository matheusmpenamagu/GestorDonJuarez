# Sistema de Controle de Chopes

Sistema completo de monitoramento em tempo real para cervejarias artesanais, desenvolvido para gerenciar e monitorar o consumo de chope através de sensores de fluxo conectados a cada torneira.

## 📋 Características Principais

### 🍺 Monitoramento em Tempo Real
- Dashboard com atualização automática via WebSocket
- Monitoramento do volume disponível em cada barril
- Lista em tempo real de todos os chopes sendo servidos
- Indicadores visuais de status das torneiras
- Alertas para barris com volume baixo (< 10%)

### 🔧 Integração com Hardware
- Compatível com ESP32 + sensor de fluxo YF-S401
- Recebimento de webhooks para eventos de consumo
- Recebimento de webhooks para trocas de barril
- Cálculo automático do volume consumido e disponível

### 📊 Relatórios e Exportação
- Histórico completo de consumo por período
- Exportação de dados em formato CSV
- Relatório de trocas de barril com timestamps
- Todos os dados em fuso horário de São Paulo

### 👥 Gestão Administrativa
- Sistema de autenticação seguro (Replit Auth)
- Gerenciamento de torneiras, pontos de venda e estilos de cerveja
- Interface administrativa completa
- Controle de usuários (somente admin pode criar contas)

### 🌍 Localização Brasileira
- Interface completamente em português
- Fuso horário América/São_Paulo
- Formatos de data e hora brasileiros
- Unidades métricas (litros/mililitros)

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- PostgreSQL 14+
- Conta no Replit (para autenticação)

### 1. Configuração do Ambiente

```bash
# Clone o repositório
git clone <repository-url>
cd beer-control-system

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

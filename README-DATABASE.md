# Gerenciamento de Banco de Dados - Don Juarez

## ⚠️ SITUAÇÃO ATUAL: BANCO ÚNICO

**IMPORTANTE**: Atualmente estamos usando um **único banco de dados** para desenvolvimento e produção. O sistema foi configurado para suportar múltiplos bancos, mas na prática ambos os ambientes apontam para o mesmo DATABASE_URL.

### Configuração Atual:
- **Desenvolvimento** (`NODE_ENV=development`): Usa DATABASE_URL
- **Produção** (`NODE_ENV=production`): Deveria usar PRODUCTION_DATABASE_URL, mas está configurado com o mesmo valor

### Por que isso aconteceu:
O Replit Database Manager provisiona apenas um banco PostgreSQL por projeto. Para ter bancos verdadeiramente separados, seria necessário usar schemas diferentes ou um serviço externo.

## Opções para Bancos Separados

### Opção 1: Schemas Separados (Recomendado)
Usar o mesmo banco mas com schemas diferentes:
- `development_schema` para desenvolvimento
- `production_schema` para produção

### Opção 2: Serviço Externo
- Neon Database (gratuito com limitações)
- Supabase (gratuito com limitações)  
- PostgreSQL em outro provedor

### Opção 3: Manter Configuração Atual
Continuar com um banco único e usar branches/tags para controle de versão dos dados.

## Comandos Disponíveis

### Status dos Bancos
```bash
node database-manager.js status
```
Mostra informações sobre ambos os bancos de dados e o ambiente atual.

### Copiar Banco Completo
```bash
node copy-database.js
```
Copia todos os dados do banco de desenvolvimento para produção (substituindo dados existentes).

### Sincronizar Alterações Recentes
```bash
node database-manager.js sync
```
Sincroniza apenas produtos alterados nas últimas 24 horas para produção.

### Alternar Ambiente
```bash
# Para desenvolvimento
node database-manager.js dev

# Para produção  
node database-manager.js prod
```

## Variáveis de Ambiente

```bash
# Banco de desenvolvimento (atual)
DATABASE_URL=postgresql://...

# Banco de produção (novo)
PRODUCTION_DATABASE_URL=postgresql://...
```

## Fluxo de Trabalho Recomendado

1. **Desenvolvimento**: Trabalhe normalmente no ambiente de desenvolvimento
2. **Teste**: Use `node database-manager.js status` para verificar dados
3. **Sincronização**: Use `node database-manager.js sync` para enviar alterações para produção
4. **Deploy**: Altere para produção com `node database-manager.js prod` antes do deploy

## Log de Alterações

- **2025-08-14**: Implementação inicial de múltiplos ambientes
- **2025-08-14**: Scripts de cópia e sincronização criados
- **2025-08-14**: Configuração automática de ambiente baseada em NODE_ENV

## Estrutura Copiada

As seguintes tabelas foram replicadas:
- ✅ **products** (328 registros)
- ✅ **units** (5 registros)  
- ✅ **product_categories** (8 registros)
- ✅ **beer_styles** (9 registros)
- ✅ **points_of_sale** (3 registros)
- ✅ **devices** (5 registros)
- ✅ **roles** (12 registros)
- ✅ **users** (3 registros)
- ✅ **settings** (2 registros)

Tabelas vazias também foram preparadas para futuro uso.
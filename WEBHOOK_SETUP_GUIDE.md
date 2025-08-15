# Guia de Configuração do Webhook ESP32 - Sistema Don Juarez

## 📋 Resumo da Situação

O sistema de webhooks **está funcionando perfeitamente**. O problema identificado é que os dispositivos ESP32 pararam de enviar dados desde 09/08/2025 devido a problemas de conectividade, não por causa das mudanças de autenticação.

## 🔧 Configuração Necessária

### 1. URL do Sistema
- **Produção**: `https://gestor.donjuarez.com.br`
- **Desenvolvimento**: `https://[seu-replit-url].replit.dev`

### 2. Endpoints Disponíveis
- **Heartbeat**: `POST /api/webhooks/heartbeat`
- **Consumo de Chope**: `POST /api/webhooks/pour`
- **Troca de Barril**: `POST /api/webhooks/keg-change`

### 3. Autenticação
- **Header obrigatório**: `x-webhook-token`
- **Token**: [Solicitar o token correto do webhook]

## 📡 Formato dos Dados

### Heartbeat (A cada 60 segundos)
```json
{
  "device_id": "D8483"
}
```

### Evento de Consumo
```json
{
  "device_id": "D8483",
  "datetime": "2025-08-15T18:30:00",
  "total_volume_ml": 350
}
```

### Troca de Barril
```json
{
  "device_id": "D8483",
  "datetime": "2025-08-15T18:30:00",
  "beer_style_id": 9,
  "capacity": 50
}
```

## 🔍 Status Atual dos Dispositivos

| Device ID | Último Heartbeat | Status | Problema |
|-----------|------------------|--------|----------|
| D8483     | 15/08 15:31      | ✅ Online | Não enviando consumo |
| 1C5E4     | 06/07 16:56      | ❌ Offline | Sem conectividade |
| DJ001     | 03/07 04:28      | ❌ Offline | Sem conectividade |

## ⚡ Passos para Reconexão

### 1. Verificar Token do Webhook
```bash
# Solicitar o token correto do webhook
# O token atual deve ser configurado no ESP32
```

### 2. Atualizar Código ESP32
- Use o arquivo `esp32-webhook-config.cpp` fornecido
- Configure WiFi, URL base e token
- Upload para o dispositivo

### 3. Teste de Conectividade
```bash
# Teste manual do webhook (use o token correto)
curl -X POST "https://gestor.donjuarez.com.br/api/webhooks/pour" \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: SEU_TOKEN_AQUI" \
  -d '{
    "device_id": "D8483",
    "datetime": "2025-08-15T18:30:00",
    "total_volume_ml": 350
  }'
```

### 4. Monitoramento
- Verificar heartbeats no dashboard
- Confirmar eventos de consumo em tempo real
- Observar logs do servidor para erros

## 🛠️ Solução de Problemas

### Erro 401 - Unauthorized
- Verificar se o token está correto
- Confirmar header `x-webhook-token`

### Erro 404 - Device Not Found
- Verificar se o device_id está cadastrado no sistema
- Confirmar associação com torneira

### Sem Dados de Consumo
- Verificar calibração do sensor de fluxo
- Confirmar funcionamento do interrupt no ESP32
- Testar com volume mínimo (>5ml)

## 📊 Monitoramento

### Dashboard em Tempo Real
- Eventos aparecem instantaneamente
- WebSocket atualiza estatísticas
- Gráficos de consumo por unidade

### Logs do Servidor
```
=== WEBHOOK START ===
Pour webhook received: {...}
Pour event created: Tap 1, 350ml consumed at 15/08/2025 18:30:00
```

## ✅ Confirmações

1. **Sistema de webhook funcionando** ✅
2. **Autenticação não afetou funcionalidade** ✅  
3. **Problema é conectividade ESP32** ✅
4. **Último evento válido**: 09/08/2025 03:44:48 ✅

## 📞 Próximos Passos

1. **Obter token correto do webhook**
2. **Atualizar configuração ESP32**
3. **Testar conectividade dispositivos**
4. **Verificar funcionamento sensores**
5. **Monitorar dados em tempo real**

---

**Importante**: O sistema está estável e funcionando. O problema é exclusivamente de conectividade dos dispositivos ESP32, não do software do servidor.
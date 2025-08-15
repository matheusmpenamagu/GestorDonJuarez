#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ========================================
// CONFIGURAÇÕES NECESSÁRIAS
// ========================================

// 1. WiFi - Configure sua rede
const char* ssid = "SEU_WIFI_AQUI";
const char* password = "SUA_SENHA_WIFI_AQUI";

// 2. Webhook Configuration - IMPORTANTE: Use a URL de produção
const char* baseUrl = "https://gestor.donjuarez.com.br";  // URL de produção
const char* webhookToken = "SEU_TOKEN_WEBHOOK";  // Solicite o token correto

// 3. Device Configuration
const char* deviceId = "D8483";  // Use o código do dispositivo cadastrado

// 4. Sensor Configuration
const int flowSensorPin = 2;  // Pino do sensor de fluxo
volatile long pulseCount = 0;
float calibrationFactor = 4.5;  // Pulsos por mL (ajustar conforme sensor)
unsigned long oldTime = 0;

// ========================================
// FUNÇÃO DE INTERRUPÇÃO DO SENSOR
// ========================================
void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

// ========================================
// SETUP INICIAL
// ========================================
void setup() {
  Serial.begin(115200);
  
  // Configure o pino do sensor
  pinMode(flowSensorPin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(flowSensorPin), pulseCounter, FALLING);
  
  // Conectar WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  // Enviar heartbeat inicial
  sendHeartbeat();
  
  oldTime = millis();
}

// ========================================
// LOOP PRINCIPAL
// ========================================
void loop() {
  static unsigned long lastHeartbeat = 0;
  static long lastPulseCount = 0;
  
  // Heartbeat a cada 60 segundos
  if (millis() - lastHeartbeat > 60000) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  // Verificar consumo a cada 5 segundos
  if ((millis() - oldTime) > 5000) {
    if (pulseCount != lastPulseCount) {
      // Calcular volume consumido desde a última leitura
      long newPulses = pulseCount - lastPulseCount;
      float volumeMl = newPulses / calibrationFactor;
      
      if (volumeMl > 5.0) {  // Filtrar ruído - só enviar se > 5ml
        Serial.print("Volume detectado: ");
        Serial.print(volumeMl);
        Serial.println(" ml");
        
        // Enviar evento de consumo
        sendPourEvent(volumeMl);
      }
      
      lastPulseCount = pulseCount;
    }
    oldTime = millis();
  }
  
  delay(100);  // Pequeno delay para estabilidade
}

// ========================================
// FUNÇÃO: ENVIAR HEARTBEAT
// ========================================
bool sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado!");
    return false;
  }
  
  HTTPClient http;
  String url = String(baseUrl) + "/api/webhooks/heartbeat";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-webhook-token", webhookToken);
  http.setTimeout(10000);  // 10 segundos timeout
  
  // JSON payload
  DynamicJsonDocument doc(512);
  doc["device_id"] = deviceId;
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.println("=== ENVIANDO HEARTBEAT ===");
  Serial.println("URL: " + url);
  Serial.println("Payload: " + payload);
  
  int httpResponseCode = http.POST(payload);
  String response = http.getString();
  
  Serial.print("Response Code: ");
  Serial.println(httpResponseCode);
  Serial.print("Response: ");
  Serial.println(response);
  
  http.end();
  
  if (httpResponseCode == 200) {
    Serial.println("✅ Heartbeat enviado com sucesso!");
    return true;
  } else {
    Serial.println("❌ Erro no heartbeat!");
    return false;
  }
}

// ========================================
// FUNÇÃO: ENVIAR EVENTO DE CONSUMO
// ========================================
bool sendPourEvent(float volumeMl) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado!");
    return false;
  }
  
  HTTPClient http;
  String url = String(baseUrl) + "/api/webhooks/pour";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-webhook-token", webhookToken);
  http.setTimeout(10000);  // 10 segundos timeout
  
  // JSON payload com timestamp atual
  DynamicJsonDocument doc(1024);
  doc["device_id"] = deviceId;
  doc["datetime"] = getCurrentTimestamp();
  doc["total_volume_ml"] = (int)round(volumeMl);
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.println("=== ENVIANDO EVENTO DE CONSUMO ===");
  Serial.println("URL: " + url);
  Serial.println("Payload: " + payload);
  
  int httpResponseCode = http.POST(payload);
  String response = http.getString();
  
  Serial.print("Response Code: ");
  Serial.println(httpResponseCode);
  Serial.print("Response: ");
  Serial.println(response);
  
  http.end();
  
  if (httpResponseCode == 200) {
    Serial.println("✅ Evento de consumo enviado com sucesso!");
    return true;
  } else {
    Serial.println("❌ Erro no evento de consumo!");
    return false;
  }
}

// ========================================
// FUNÇÃO: GERAR TIMESTAMP ATUAL
// ========================================
String getCurrentTimestamp() {
  // Para simplicidade, usar millis() - em produção, usar NTP
  unsigned long currentTime = millis();
  return String(2025) + "-08-15T" + 
         String((currentTime / 3600000) % 24) + ":" + 
         String((currentTime / 60000) % 60) + ":" + 
         String((currentTime / 1000) % 60);
}

// ========================================
// CONFIGURAÇÕES ADICIONAIS RECOMENDADAS
// ========================================

/*
SENSOR YF-S401 - ESPECIFICAÇÕES:
- Tensão de operação: 5V-24V
- Corrente máxima: 15mA
- Faixa de fluxo: 0.3-6L/min
- Precisão: ±3%
- Fator de calibração típico: 4.5 pulsos/mL

CONEXÕES RECOMENDADAS:
- VCC do sensor → 5V do ESP32
- GND do sensor → GND do ESP32
- Sinal do sensor → Pino 2 do ESP32 (com resistor pull-up)

CONFIGURAÇÃO NO DASHBOARD:
1. Cadastrar o dispositivo com código "D8483"
2. Associar o dispositivo a uma torneira
3. Configurar o webhook token no sistema
4. Testar a conectividade com heartbeat

TESTE DE FUNCIONAMENTO:
1. Abrir Serial Monitor (115200 baud)
2. Verificar conexão WiFi
3. Confirmar heartbeat a cada 60s
4. Simular fluxo no sensor
5. Verificar eventos no dashboard
*/
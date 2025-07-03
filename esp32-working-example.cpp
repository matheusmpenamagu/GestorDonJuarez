#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Configurações WiFi
const char* ssid = "SEU_WIFI";
const char* password = "SUA_SENHA";

// Configurações Webhook
const char* baseUrl = "https://ea3123c5-9f03-4f32-844a-fe4c8cdd0203-00-1inaocwyrymso.worf.replit.dev";
const char* webhookToken = "9hlJAoyTSy7K";
const char* deviceId = "ESP32_TESTE_001";

void setup() {
  Serial.begin(115200);
  
  // Conectar WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Conectando WiFi...");
  }
  Serial.println("WiFi conectado!");
  
  // Enviar heartbeat inicial
  sendHeartbeat();
}

void loop() {
  // Enviar heartbeat a cada 30 segundos
  sendHeartbeat();
  delay(30000);
}

bool sendHeartbeat() {
  HTTPClient http;
  
  // URL do webhook
  String url = String(baseUrl) + "/api/webhooks/heartbeat";
  http.begin(url);
  
  // Headers obrigatórios
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-webhook-token", webhookToken);
  
  // JSON payload
  DynamicJsonDocument doc(1024);
  doc["device_id"] = deviceId;
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.println("Enviando heartbeat:");
  Serial.println("URL: " + url);
  Serial.println("Token: " + String(webhookToken));
  Serial.println("Payload: " + payload);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Heartbeat enviado com sucesso: " + response);
    http.end();
    return true;
  } else {
    Serial.println("Erro no heartbeat - HTTP " + String(httpResponseCode));
    String errorResponse = http.getString();
    Serial.println("Resposta do erro: " + errorResponse);
    http.end();
    return false;
  }
}

bool sendPourEvent(int tapId, int totalVolumeMl) {
  HTTPClient http;
  
  String url = String(baseUrl) + "/api/webhooks/pour";
  http.begin(url);
  
  // Headers obrigatórios
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-webhook-token", webhookToken);
  
  // JSON payload
  DynamicJsonDocument doc(1024);
  doc["device_id"] = deviceId;
  doc["tap_id"] = tapId;
  doc["datetime"] = "2025-07-03 01:30:00"; // Use formato atual
  doc["total_volume_ml"] = totalVolumeMl;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Pour event enviado: " + response);
    http.end();
    return true;
  } else {
    Serial.println("Erro no pour event - HTTP " + String(httpResponseCode));
    String errorResponse = http.getString();
    Serial.println("Resposta do erro: " + errorResponse);
    http.end();
    return false;
  }
}
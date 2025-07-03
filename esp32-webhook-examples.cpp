/*
 * ESP32 Webhook Examples with Security Token
 * Don Juarez Beer Monitoring System
 * 
 * All webhooks now require authentication token for security.
 * Use the webhook_token secret value in the x-webhook-token header.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* webhookToken = "9hlJAoyTSy7K"; // Use actual webhook_token from secrets

// Production URLs (after deployment)
const char* baseUrl = "https://gestor.donjuarez.com.br";

// Development URLs (during testing)
// const char* baseUrl = "https://ea3123c5-9f03-4f32-844a-fe4c8cdd0203-00-1inaocwyrymso.worf.replit.dev";

String deviceId = "DJ001"; // Your device ID

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("WiFi connected!");
}

/*
 * Send Pour Event
 * Called when beer is dispensed from the tap
 */
bool sendPourEvent(float volumeMl) {
  HTTPClient http;
  http.begin(String(baseUrl) + "/api/webhooks/pour");
  
  // Required headers for authentication and content type
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-webhook-token", webhookToken);
  
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["device_id"] = deviceId;
  doc["datetime"] = getCurrentDateTime(); // Format: "2025-07-03 01:15:00"
  doc["total_volume_ml"] = (int)volumeMl;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Pour event sent successfully: " + response);
    http.end();
    return true;
  } else {
    Serial.println("Pour event failed - HTTP " + String(httpResponseCode));
    String errorResponse = http.getString();
    Serial.println("Error response: " + errorResponse);
    http.end();
    return false;
  }
}

/*
 * Send Keg Change Event
 * Called when a new barrel is installed
 */
bool sendKegChangeEvent(int kegCapacityLiters = 30) {
  HTTPClient http;
  http.begin(String(baseUrl) + "/api/webhooks/keg-change");
  
  // Required headers for authentication and content type
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-webhook-token", webhookToken);
  
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["device_id"] = deviceId;
  doc["datetime"] = getCurrentDateTime(); // Format: "2025-07-03 01:15:00"
  doc["keg_capacity_liters"] = kegCapacityLiters; // 30 or 50
  
  String payload;
  serializeJson(doc, payload);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Keg change event sent successfully: " + response);
    http.end();
    return true;
  } else {
    Serial.println("Keg change event failed - HTTP " + String(httpResponseCode));
    String errorResponse = http.getString();
    Serial.println("Error response: " + errorResponse);
    http.end();
    return false;
  }
}

/*
 * Send Heartbeat
 * Called every minute to indicate device is online
 */
bool sendHeartbeat() {
  HTTPClient http;
  http.begin(String(baseUrl) + "/api/webhooks/heartbeat");
  
  // Required headers for authentication and content type
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-webhook-token", webhookToken);
  
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["device_id"] = deviceId;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Heartbeat sent successfully: " + response);
    http.end();
    return true;
  } else {
    Serial.println("Heartbeat failed - HTTP " + String(httpResponseCode));
    String errorResponse = http.getString();
    Serial.println("Error response: " + errorResponse);
    http.end();
    return false;
  }
}

/*
 * Get current date time in São Paulo timezone
 * Format: "2025-07-03 01:15:00"
 */
String getCurrentDateTime() {
  // This is a simplified example. In practice, you would:
  // 1. Use NTP to get current time
  // 2. Convert to São Paulo timezone (UTC-3)
  // 3. Format as "YYYY-MM-DD HH:MM:SS"
  
  return "2025-07-03 01:15:00"; // Replace with actual implementation
}

void loop() {
  // Send heartbeat every minute
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 60000) { // 60 seconds
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  // Example: Send pour event when flow sensor detects beer
  // Replace with your actual flow sensor logic
  if (beerWasDispensed()) {
    float volume = getMeasuredVolume();
    sendPourEvent(volume);
  }
  
  // Example: Send keg change event when button is pressed
  // Replace with your actual keg change detection logic
  if (kegChangeButtonPressed()) {
    int capacity = getSelectedKegCapacity(); // 30 or 50 liters
    sendKegChangeEvent(capacity);
  }
  
  delay(100);
}

// Placeholder functions - implement based on your hardware
bool beerWasDispensed() {
  // Implement flow sensor reading logic
  return false;
}

float getMeasuredVolume() {
  // Implement volume calculation from flow sensor
  return 0.0;
}

bool kegChangeButtonPressed() {
  // Implement button/switch reading logic
  return false;
}

int getSelectedKegCapacity() {
  // Implement capacity selection logic (30L or 50L)
  return 30;
}

/*
 * Security Notes:
 * 
 * 1. Token Validation: All webhooks require the x-webhook-token header
 * 2. Error Handling: Check HTTP response codes (401 = Unauthorized)
 * 3. Development vs Production: Use correct base URL for your environment
 * 4. Timeout: ESP32 has limited processing time, send quick responses
 * 5. Retry Logic: Consider implementing retry for failed webhook calls
 * 
 * Expected Responses:
 * - 200 OK: Webhook processed successfully
 * - 401 Unauthorized: Missing or invalid token
 * - 400 Bad Request: Invalid payload format
 * - 500 Internal Server Error: Server processing error
 */
/*
 * GuardWell ESP32 Sensor Firmware
 * 
 * This code reads all your sensors and sends data to the GuardWell server.
 * 
 * YOUR HARDWARE (already wired):
 * - DHT22 on GPIO 4
 * - MQ2 on GPIO 34
 * - Touch Sensor on GPIO 15
 * - Buzzer on GPIO 18
 * - MPU6050 on I2C (SDA=21, SCL=22)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "DHT.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>

// ============================================
// ⚠️ CHANGE THESE VALUES TO MATCH YOUR SETUP!
// ============================================

// Your WiFi network name and password
const char* WIFI_SSID = "YOUR_WIFI_NAME";        // ← Change this!
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // ← Change this!

// Your Railway server URL (you'll get this after deploying)
// Example: "https://guardwell-server-abc123.railway.app/api/sensors/data"
const char* SERVER_URL = "http://localhost:3001/api/sensors/data"; // ← Change this for production!

// Give your device a unique name
const char* DEVICE_ID = "DEV-001"; // ← Change if you have multiple devices

// ============================================
// PIN DEFINITIONS (same as your test code)
// ============================================
#define DHTPIN 4
#define DHTTYPE DHT22
#define MQ2PIN 34
#define TOUCHPIN 15
#define BUZZER 18

// ============================================
// SENSOR OBJECTS
// ============================================
DHT dht(DHTPIN, DHTTYPE);
Adafruit_MPU6050 mpu;

// ============================================
// VARIABLES
// ============================================
bool buzzerActive = false;
unsigned long buzzerStartTime = 0;
unsigned long lastSendTime = 0;

// Send data every 2 seconds
const unsigned long SEND_INTERVAL = 2000;

// ============================================
// SETUP - Runs once when ESP32 starts
// ============================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("========================================");
  Serial.println("   GuardWell ESP32 Starting Up...");
  Serial.println("========================================");

  // Initialize DHT22
  dht.begin();
  Serial.println("✅ DHT22 ready");

  // Initialize Touch Sensor
  pinMode(TOUCHPIN, INPUT);
  Serial.println("✅ Touch sensor ready");

  // Initialize Buzzer
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);
  Serial.println("✅ Buzzer ready");

  // Initialize MQ2
  pinMode(MQ2PIN, INPUT);
  Serial.println("✅ MQ2 gas sensor ready");

  // Initialize MPU6050
  if (!mpu.begin()) {
    Serial.println("❌ MPU6050 not found! Check wiring.");
  } else {
    mpu.setAccelerometerRange(MPU6050_RANGE_16_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    Serial.println("✅ MPU6050 ready");
  }

  // Connect to WiFi
  connectToWiFi();

  Serial.println();
  Serial.println("========================================");
  Serial.println("   Setup complete! Starting loop...");
  Serial.println("========================================");
  Serial.println();
}

// ============================================
// MAIN LOOP - Runs forever
// ============================================
void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi disconnected! Reconnecting...");
    connectToWiFi();
  }

  // Handle touch sensor and buzzer
  handleTouchSensor();

  // Send sensor data every 2 seconds
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();
    readAndSendSensorData();
  }

  // Small delay for stability
  delay(100);
}

// ============================================
// WIFI CONNECTION
// ============================================
void connectToWiFi() {
  Serial.print("📶 Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ WiFi connected!");
    Serial.print("   Your IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("❌ WiFi connection failed!");
    Serial.println("   Check your WIFI_SSID and WIFI_PASSWORD");
  }
}

// ============================================
// TOUCH SENSOR & BUZZER (same as your code)
// ============================================
void handleTouchSensor() {
  int touchState = digitalRead(TOUCHPIN);

  // If touched and buzzer not already active
  if (touchState == HIGH && !buzzerActive) {
    buzzerActive = true;
    buzzerStartTime = millis();
    digitalWrite(BUZZER, HIGH);
    Serial.println("🚨 EMERGENCY! Touch detected - Buzzer ON");
    
    // Send emergency alert immediately
    sendEmergencyAlert();
  }

  // Turn off buzzer after 3 seconds
  if (buzzerActive && millis() - buzzerStartTime >= 3000) {
    digitalWrite(BUZZER, LOW);
    buzzerActive = false;
    Serial.println("🔔 Buzzer OFF");
  }
}

// ============================================
// READ SENSORS AND SEND TO SERVER
// ============================================
void readAndSendSensorData() {
  // Read DHT22
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  // Read MQ2
  int mq2Raw = analogRead(MQ2PIN);
  // Convert to approximate PPM (0-1000 range)
  int gasPPM = map(mq2Raw, 0, 4095, 0, 1000);

  // Read MPU6050
  sensors_event_t a, g, tempSensor;
  mpu.getEvent(&a, &g, &tempSensor);

  // Print to Serial Monitor (for debugging)
  Serial.println("--- Sensor Readings ---");
  Serial.print("🌡️ Temperature: "); Serial.print(temp); Serial.println("°C");
  Serial.print("💧 Humidity: "); Serial.print(hum); Serial.println("%");
  Serial.print("💨 Gas Level: "); Serial.print(gasPPM); Serial.println(" PPM");
  Serial.print("📐 Accel: X="); Serial.print(a.acceleration.x);
  Serial.print(" Y="); Serial.print(a.acceleration.y);
  Serial.print(" Z="); Serial.println(a.acceleration.z);

  // Create JSON to send
  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  
  if (!isnan(temp)) doc["temperature"] = temp;
  if (!isnan(hum)) doc["humidity"] = hum;
  doc["gas_level"] = gasPPM;
  doc["accel_x"] = a.acceleration.x;
  doc["accel_y"] = a.acceleration.y;
  doc["accel_z"] = a.acceleration.z;
  doc["gyro_x"] = g.gyro.x;
  doc["gyro_y"] = g.gyro.y;
  doc["gyro_z"] = g.gyro.z;
  doc["battery"] = 85; // Simulated battery level
  doc["rssi"] = WiFi.RSSI(); // WiFi signal strength

  // Check for fall (high acceleration)
  float accelMagnitude = sqrt(
    pow(a.acceleration.x, 2) + 
    pow(a.acceleration.y, 2) + 
    pow(a.acceleration.z, 2)
  );
  if (accelMagnitude > 25.0) {
    doc["fall_detected"] = true;
    Serial.println("⚠️ FALL DETECTED!");
    digitalWrite(BUZZER, HIGH);
    delay(500);
    digitalWrite(BUZZER, LOW);
  }

  // Convert to JSON string
  String jsonString;
  serializeJson(doc, jsonString);

  // Send to server
  sendToServer(jsonString);
}

// ============================================
// SEND EMERGENCY ALERT
// ============================================
void sendEmergencyAlert() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["emergency_button"] = true;

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.println("🚨 Sending emergency alert to server...");
  sendToServer(jsonString);
}

// ============================================
// SEND DATA TO SERVER VIA HTTP
// ============================================
void sendToServer(String jsonData) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Cannot send - WiFi not connected");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  
  Serial.print("📤 Sending to server... ");
  
  int httpCode = http.POST(jsonData);
  
  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK) {
      Serial.println("✅ Success!");
      String response = http.getString();
      Serial.println("   Server response: " + response);
    } else {
      Serial.print("⚠️ Server returned code: ");
      Serial.println(httpCode);
    }
  } else {
    Serial.print("❌ Failed! Error: ");
    Serial.println(http.errorToString(httpCode));
    Serial.println("   Check your SERVER_URL");
  }
  
  http.end();
}

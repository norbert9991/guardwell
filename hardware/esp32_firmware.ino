#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "DHT.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include "DFRobot_DF2301Q.h"
#include <TinyGPS++.h>

// ============================================
// CONFIGURATION
// ============================================
const char* WIFI_SSID = "Hacking(2.4G)";
const char* WIFI_PASSWORD = "lelai09099729715";
const char* SERVER_URL = "https://guardwell.onrender.com/api/sensors/data";
const char* DEVICE_ID = "DEV-001";

// Geofence
const float FACILITY_LAT = 14.7089;
const float FACILITY_LON = 121.0430;
const float GEOFENCE_RADIUS_METERS = 100.0;

// ============================================
// PINS - ALL UNIQUE, NO SHARING
// ============================================
#define DHTPIN      4
#define DHTTYPE     DHT22
#define MQ2PIN      34      
#define TOUCHPIN    27
#define BUZZER      18
#define I2C_SDA     21
#define I2C_SCL     22 

// Voice Sensor (UART - Serial2 default pins)
#define VOICE_RX    16      
#define VOICE_TX    17      

// GPS (UART - Serial1)
// KEEP HARDWARE: GPS TX → ESP32 GPIO 25, GPS RX → ESP32 GPIO 26
#define GPS_RX      25
#define GPS_TX      26

// ============================================
// OBJECTS
// ============================================
DHT dht(DHTPIN, DHTTYPE);
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;

// Voice uses Serial2 (UART2)
DFRobot_DF2301Q_UART voiceSensor(&Serial2, VOICE_RX, VOICE_TX);

// ============================================
// VARIABLES
// ============================================
bool buzzerActive = false;
unsigned long buzzerStartTime = 0;
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 2000;
bool mpuConnected = false;
bool voiceConnected = false;
bool gpsConnected = false;

String lastVoiceCommand = "none";
uint8_t lastVoiceCommandID = 0;
bool voiceAlertTriggered = false;

float currentLat = 0.0;
float currentLon = 0.0;
bool gpsValid = false;
bool insideGeofence = true;
unsigned long lastGeofenceCheck = 0;

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("\n========================================");
  Serial.println(" GuardWell ESP32 (GPS + Geofence)");
  Serial.println("========================================");
  Serial.println("Pin Config:");
  Serial.println("  Voice: RX=16, TX=17 (Serial2)");
  Serial.println("  GPS:   RX=25, TX=26 (Serial1)");
  Serial.println("========================================\n");

  pinMode(TOUCHPIN, INPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(MQ2PIN, INPUT);
  digitalWrite(BUZZER, LOW);

  Wire.begin(I2C_SDA, I2C_SCL); 

  // --- 1. DHT ---
  Serial.print("[1/5] DHT Sensor... ");
  dht.begin();
  delay(2000);
  float testTemp = dht.readTemperature();
  if (isnan(testTemp)) {
    Serial.println("❌");
  } else {
    Serial.printf("✅ %.1f°C\n", testTemp);
  }

  // --- 2. MPU6050 ---
  Serial.print("[2/5] MPU6050... ");
  if (!mpu.begin()) {
    Serial.println("❌");
    mpuConnected = false;
  } else {
    Serial.println("✅");
    mpu.setAccelerometerRange(MPU6050_RANGE_16_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    mpuConnected = true;
  }

  // --- 3. Voice Sensor (MUST init before GPS to claim Serial2 first) ---
  Serial.print("[3/5] Voice Sensor... ");
  delay(200);
  if (!voiceSensor.begin()) {
    Serial.println("❌");
    voiceConnected = false;
  } else {
    Serial.println("✅");
    voiceSensor.settingCMD(DF2301Q_UART_MSG_CMD_SET_VOLUME, 7);
    voiceSensor.settingCMD(DF2301Q_UART_MSG_CMD_SET_MUTE, 0);
    voiceSensor.settingCMD(DF2301Q_UART_MSG_CMD_SET_WAKE_TIME, 20);
    voiceConnected = true;
  }

  // --- 4. GPS (Using Serial1 with SAFE pin remapping) ---
  Serial.print("[4/5] GPS NEO-M8N... ");
  // CRITICAL: Remap Serial1 pins BEFORE begin() is effectively called
  // Using explicit UART1 with custom pins
  Serial1.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  delay(500);  // Give GPS time to initialize
  
  // Quick test - check if any data coming in
  unsigned long testStart = millis();
  int charCount = 0;
  while (millis() - testStart < 1000) {
    if (Serial1.available()) {
      Serial1.read();  // Just count, don't process yet
      charCount++;
    }
  }
  
  if (charCount > 0) {
    Serial.printf("✅ (%d bytes/sec)\n", charCount);
    gpsConnected = true;
  } else {
    Serial.println("⚡ Started (no data yet)");
    gpsConnected = true;  // Still try to use it
  }
  
  Serial.printf("     Geofence: %.4f, %.4f (R=%.0fm)\n", 
                FACILITY_LAT, FACILITY_LON, GEOFENCE_RADIUS_METERS);

  // --- 5. WiFi ---
  Serial.print("[5/5] WiFi... ");
  connectToWiFi();
  
  Serial.println("\n✅ Setup complete!");
  Serial.println("📡 GPS will acquire satellites near window...\n");
}

// ============================================
// LOOP
// ============================================
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  handleTouchSensor();
  
  if (voiceConnected) {
    handleVoiceRecognition();
  }
  
  if (gpsConnected) {
    handleGPS();
  }

  // GPS debug every 15 seconds if no fix
  static unsigned long lastDebug = 0;
  if (millis() - lastDebug > 15000 && !gpsValid && gpsConnected) {
    lastDebug = millis();
    Serial.printf("[GPS] chars=%lu, valid=%s\n", 
                 (unsigned long)gps.charsProcessed(), 
                 gps.location.isValid() ? "YES" : "NO");
  }

  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();
    readAndSendSensorData();
  }

  if (buzzerActive && millis() - buzzerStartTime >= 3000) {
    digitalWrite(BUZZER, LOW);
    buzzerActive = false;
  }

  delay(10);  // Shorter delay for better GPS processing
}

// ============================================
// GPS
// ============================================
void handleGPS() {
  // Read all available GPS data
  while (Serial1.available() > 0) {
    char c = Serial1.read();
    gps.encode(c);
  }

  if (gps.location.isValid() && gps.location.isUpdated()) {
    currentLat = gps.location.lat();
    currentLon = gps.location.lng();
    gpsValid = true;

    if (millis() - lastGeofenceCheck >= 5000) {
      lastGeofenceCheck = millis();
      checkGeofence();
    }
  }
}

void checkGeofence() {
  if (!gpsValid) return;

  float distance = calculateDistance(currentLat, currentLon, FACILITY_LAT, FACILITY_LON);
  bool wasInside = insideGeofence;
  insideGeofence = (distance <= GEOFENCE_RADIUS_METERS);

  if (wasInside && !insideGeofence) {
    Serial.println("🚨 GEOFENCE VIOLATION!");
    triggerAlert(500);
    sendGeofenceViolation(distance);
  }
}

float calculateDistance(float lat1, float lon1, float lat2, float lon2) {
  const float R = 6371000.0;
  float dLat = radians(lat2 - lat1);
  float dLon = radians(lon2 - lon1);
  float a = sin(dLat/2) * sin(dLat/2) +
            cos(radians(lat1)) * cos(radians(lat2)) *
            sin(dLon/2) * sin(dLon/2);
  float c = 2 * atan2(sqrt(a), sqrt(1-a));
  return R * c;
}

// ============================================
// WIFI
// ============================================
void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("✅ %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("❌");
  }
}

// ============================================
// TOUCH SENSOR
// ============================================
void handleTouchSensor() {
  if (digitalRead(TOUCHPIN) == HIGH && !buzzerActive) {
    buzzerActive = true;
    buzzerStartTime = millis();
    digitalWrite(BUZZER, HIGH);
    Serial.println("🚨 EMERGENCY!");
    sendEmergencyAlert();
    delay(1000);
  }
}

// ============================================
// VOICE RECOGNITION
// ============================================
void handleVoiceRecognition() {
  uint8_t cmdID = voiceSensor.getCMDID();
  
  if (cmdID != 0) {
    lastVoiceCommandID = cmdID;
    Serial.printf("🎤 Voice: %d\n", cmdID);
    
    switch(cmdID) {
      case 2:
        lastVoiceCommand = "test_buzzer";
        triggerAlert(100); 
        break;
      case 5:
        lastVoiceCommand = "tulong_help";
        voiceAlertTriggered = true;
        triggerAlert(500);
        sendVoiceAlert("help");
        break;
      case 6:
        lastVoiceCommand = "emergency";
        voiceAlertTriggered = true;
        triggerAlert(1000);
        sendVoiceAlert("emergency");
        break;
      case 7:
        lastVoiceCommand = "aray_shock";
        voiceAlertTriggered = true;
        triggerAlert(800);
        sendVoiceAlert("fall_shock");
        break;
      case 8:
        lastVoiceCommand = "tawag_call";
        voiceAlertTriggered = true;
        triggerAlert(600);
        sendVoiceAlert("call_nurse");
        break;
      case 10:
        lastVoiceCommand = "cancel";
        voiceAlertTriggered = false;
        digitalWrite(BUZZER, LOW);
        buzzerActive = false;
        break;
      case 11:
        lastVoiceCommand = "sakit_pain";
        voiceAlertTriggered = true;
        triggerAlert(700);
        sendVoiceAlert("pain");
        break;
      default:
        lastVoiceCommand = "unknown_" + String(cmdID);
        break;
    }
  }
}

void triggerAlert(int duration) {
  digitalWrite(BUZZER, HIGH);
  delay(duration);
  digitalWrite(BUZZER, LOW);
  delay(100);
}

// ============================================
// SENSOR READINGS
// ============================================
void readAndSendSensorData() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  if (isnan(temp)) temp = 0.0;
  if (isnan(hum)) hum = 0.0;

  int gasPPM = map(analogRead(MQ2PIN), 0, 4095, 0, 1000); 

  float ax=0, ay=0, az=0, gx=0, gy=0, gz=0;
  bool fallDetected = false;

  if (mpuConnected) {
    sensors_event_t a, g, t;
    mpu.getEvent(&a, &g, &t);
    ax = a.acceleration.x; ay = a.acceleration.y; az = a.acceleration.z;
    gx = g.gyro.x; gy = g.gyro.y; gz = g.gyro.z;
    if (sqrt(ax*ax + ay*ay + az*az) > 25.0) fallDetected = true;
  }

  // Compact status
  Serial.printf("T:%.1f H:%.1f G:%d ", temp, hum, gasPPM);
  if (gpsValid) {
    Serial.printf("GPS:%.5f,%.5f %s\n", currentLat, currentLon, 
                  insideGeofence ? "IN" : "OUT");
  } else {
    Serial.printf("GPS:wait(%lu)\n", (unsigned long)gps.charsProcessed());
  }

  // Build JSON
  StaticJsonDocument<768> doc;
  doc["device_id"] = DEVICE_ID;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["gas_level"] = gasPPM;
  doc["voice_command"] = lastVoiceCommand;
  doc["voice_command_id"] = lastVoiceCommandID;
  doc["voice_alert"] = voiceAlertTriggered;
  doc["accel_x"] = ax; doc["accel_y"] = ay; doc["accel_z"] = az;
  doc["gyro_x"] = gx; doc["gyro_y"] = gy; doc["gyro_z"] = gz;
  if (fallDetected) doc["fall_detected"] = true;
  doc["latitude"] = currentLat;
  doc["longitude"] = currentLon;
  doc["gps_valid"] = gpsValid;
  doc["geofence_violation"] = !insideGeofence;
  if (gpsValid) {
    doc["satellites"] = gps.satellites.value();
    doc["gps_speed"] = gps.speed.kmph();
  }
  doc["gps_chars"] = (unsigned long)gps.charsProcessed();  // Debug: GPS chars received
  doc["battery"] = 85;
  doc["rssi"] = WiFi.RSSI();

  String payload;
  serializeJson(doc, payload);
  sendToServer(payload);
  
  if (voiceAlertTriggered) voiceAlertTriggered = false;
}

// ============================================
// SERVER
// ============================================
void sendEmergencyAlert() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["emergency_button"] = true;
  doc["latitude"] = currentLat;
  doc["longitude"] = currentLon;
  doc["gps_valid"] = gpsValid;
  String payload;
  serializeJson(doc, payload);
  sendToServer(payload);
}

void sendVoiceAlert(String alertType) {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["voice_alert"] = true;
  doc["alert_type"] = alertType;
  doc["voice_command"] = lastVoiceCommand;
  doc["latitude"] = currentLat;
  doc["longitude"] = currentLon;
  String payload;
  serializeJson(doc, payload);
  sendToServer(payload);
}

void sendGeofenceViolation(float distance) {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["geofence_violation"] = true;
  doc["latitude"] = currentLat;
  doc["longitude"] = currentLon;
  doc["distance_from_center"] = distance;
  String payload;
  serializeJson(doc, payload);
  sendToServer(payload);
}

void sendToServer(String jsonData) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonData);
  Serial.printf("[%d]\n", httpCode);
  http.end();
}

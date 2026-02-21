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
const char* WIFI_SSID = "norbert";
const char* WIFI_PASSWORD = "999999999";
const char* SERVER_URL = "https://guardwell.onrender.com/api/sensors/data";
const char* NUDGE_URL  = "https://guardwell.onrender.com/api/sensors/nudge/DEV-001";
const char* NUDGE_ACK  = "https://guardwell.onrender.com/api/sensors/nudge/DEV-001/ack";
const char* DEVICE_ID = "DEV-001";

// Geofence
const float FACILITY_LAT = 14.7089;
const float FACILITY_LON = 121.0430;
const float GEOFENCE_RADIUS_METERS = 100.0;

// ============================================
// PINS
// ============================================
#define DHTPIN      4
#define DHTTYPE     DHT22
#define MQ2PIN      34      
#define TOUCHPIN    27
#define BUZZER      18

// RGB LED (Common Cathode: HIGH = ON)
#define RGB_RED     13
#define RGB_GREEN   12
#define RGB_BLUE    14

// Shared I2C Bus (Voice Sensor + MPU6050)
#define I2C_SDA     21
#define I2C_SCL     22 

// GPS (UART - Serial2)
#define GPS_RX      16  // ESP32 receives from GPS TX
#define GPS_TX      17  // ESP32 sends to GPS RX

// ============================================
// OBJECTS
// ============================================
DHT dht(DHTPIN, DHTTYPE);
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;
DFRobot_DF2301Q_I2C voiceSensor;  // I2C mode!

// ============================================
// VARIABLES
// ============================================
bool buzzerActive = false;
unsigned long buzzerStartTime = 0;
unsigned long buzzerDuration = 3000;    // how long buzzer stays on (ms)
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

// ============================================
// RGB LED STATE MACHINE
// ============================================
enum LEDState {
  LED_IDLE,         // Green steady - connected, normal
  LED_SENDING,      // Red blink - sending data
  LED_NUDGE,        // Blue blink - received nudge from website
  LED_EMERGENCY,    // Rapid red flash - SOS active (touch + voice emergency)
  LED_VOICE_ALERT,  // Amber/orange flash (red+green alternating) - voice command active
  LED_GEOFENCE,     // Purple (red+blue) - geofence violation
  LED_GPS_WAIT      // Yellow (red+green) - GPS acquiring
};

LEDState currentLedState = LED_IDLE;
unsigned long ledStateStart = 0;
unsigned long ledBlinkTimer = 0;
bool ledBlinkOn = false;
int ledBlinkCount = 0;
const int NUDGE_BLINK_CYCLES = 10;    // Blue blinks when nudge received
const int VOICE_ALERT_BLINK_CYCLES = 15;  // Voice alert blink count
bool nudgeActive = false;
bool voiceLedActive = false;    // tracks if voice alert LED pattern is playing
bool insideGeofence = true;
unsigned long lastGeofenceCheck = 0;

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("\n========================================");
  Serial.println(" GuardWell ESP32 (New Pin Config)");
  Serial.println("========================================");
  Serial.println("I2C Bus (pins 21, 22):");
  Serial.println("  - Voice Sensor (I2C)");
  Serial.println("  - MPU6050");
  Serial.println("GPS UART (pins 16, 17):");
  Serial.println("  - GPS TX → GPIO 16");
  Serial.println("  - GPS RX → GPIO 17");
  Serial.println("RGB LED (pins 13, 12, 14):");
  Serial.println("  - Red=13, Green=12, Blue=14");
  Serial.println("========================================\n");

  pinMode(TOUCHPIN, INPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(RGB_RED, OUTPUT);
  pinMode(RGB_GREEN, OUTPUT);
  pinMode(RGB_BLUE, OUTPUT);
  pinMode(MQ2PIN, INPUT);
  digitalWrite(BUZZER, LOW);
  setRGB(0, 0, 0); // Start with LED off

  // === 1. GPS (UART Serial2) - First to avoid conflicts ===
  Serial.print("[1/5] GPS NEO-M8N... ");
  Serial2.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  delay(500);
  
  // Quick test
  int charCount = 0;
  unsigned long testStart = millis();
  while (millis() - testStart < 1000) {
    if (Serial2.available()) {
      Serial2.read();
      charCount++;
    }
  }
  
  if (charCount > 0) {
    Serial.printf("✅ (%d chars/sec)\n", charCount);
  } else {
    Serial.println("⚡ Started (waiting for data)");
  }
  gpsConnected = true;
  Serial.printf("     Geofence: %.4f, %.4f (R=%.0fm)\n", 
                FACILITY_LAT, FACILITY_LON, GEOFENCE_RADIUS_METERS);

  // === 2. I2C Bus ===
  Wire.begin(I2C_SDA, I2C_SCL);
  delay(100);

  // === 3. MPU6050 (I2C) ===
  Serial.print("[2/5] MPU6050 (I2C)... ");
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

  // === 4. Voice Sensor (I2C) ===
  Serial.print("[3/5] Voice Sensor (I2C)... ");
  delay(200);
  if (!voiceSensor.begin()) {
    Serial.println("❌ Check C→21, D→22");
    voiceConnected = false;
  } else {
    Serial.println("✅");
    voiceSensor.setVolume(7);
    voiceSensor.setMuteMode(0);
    voiceSensor.setWakeTime(20);
    voiceConnected = true;
  }

  // === 5. DHT ===
  Serial.print("[4/5] DHT Sensor... ");
  dht.begin();
  delay(2000);
  float testTemp = dht.readTemperature();
  if (isnan(testTemp)) {
    Serial.println("❌");
  } else {
    Serial.printf("✅ %.1f°C\n", testTemp);
  }

  // === 6. WiFi ===
  Serial.print("[5/5] WiFi... ");
  connectToWiFi();
  
  Serial.println("\n✅ Setup complete!");
  Serial.println("📡 GPS acquiring satellites...");
  Serial.println("💡 RGB LED active\n");

  // Start with GPS waiting state (yellow) or idle (green)
  setLedState(gpsValid ? LED_IDLE : LED_GPS_WAIT);
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

  // Handle RGB LED effects (non-blocking)
  handleLEDEffects();

  // GPS debug
  static unsigned long lastDebug = 0;
  if (millis() - lastDebug > 10000 && !gpsValid && gpsConnected) {
    lastDebug = millis();
    Serial.printf("[GPS] chars=%lu, valid=%s\n", 
                 (unsigned long)gps.charsProcessed(), 
                 gps.location.isValid() ? "YES" : "NO");
  }

  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();

    // Only show sending LED if no alert is active
    if (!voiceLedActive && !nudgeActive && currentLedState != LED_EMERGENCY) {
      setLedState(LED_SENDING);
    }
    readAndSendSensorData();

    // Poll for nudges from the website
    checkForNudge();

    // Return to appropriate idle state (only if no alert LED is active)
    if (voiceLedActive || nudgeActive || currentLedState == LED_EMERGENCY) {
      // Alert LED takes priority — don't override
    } else if (!insideGeofence) {
      setLedState(LED_GEOFENCE);
    } else if (!gpsValid && gpsConnected) {
      setLedState(LED_GPS_WAIT);
    } else {
      setLedState(LED_IDLE);
    }
  }

  // Non-blocking buzzer timeout
  if (buzzerActive && millis() - buzzerStartTime >= buzzerDuration) {
    digitalWrite(BUZZER, LOW);
    buzzerActive = false;
  }

  delay(10);
}

// ============================================
// GPS (Serial2)
// ============================================
void handleGPS() {
  while (Serial2.available() > 0) {
    char c = Serial2.read();
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
    setLedState(LED_GEOFENCE);
    startBuzzer(500);
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
    setLedState(LED_EMERGENCY);
    startBuzzer(3000);
    Serial.println("🚨 EMERGENCY!");
    sendEmergencyAlert();
  }
}

// ============================================
// NON-BLOCKING BUZZER
// ============================================
void startBuzzer(unsigned long durationMs) {
  buzzerActive = true;
  buzzerStartTime = millis();
  buzzerDuration = durationMs;
  digitalWrite(BUZZER, HIGH);
}

// ============================================
// VOICE RECOGNITION (I2C) — NOW WITH LED SYNC
// ============================================
void handleVoiceRecognition() {
  uint8_t cmdID = voiceSensor.getCMDID();
  
  if (cmdID != 0) {
    lastVoiceCommandID = cmdID;
    Serial.printf("🎤 Voice CMD %d: ", cmdID);
    
    switch(cmdID) {
      case 2:
        lastVoiceCommand = "test_buzzer";
        Serial.println("Test Buzzer");
        // Quick test beep + brief amber flash
        setLedState(LED_VOICE_ALERT);
        voiceLedActive = true;
        startBuzzer(200);
        break;

      case 5:
        lastVoiceCommand = "tulong_help";
        Serial.println("🆘 TULONG / HELP");
        voiceAlertTriggered = true;
        // EMERGENCY red flash — critical alert
        setLedState(LED_EMERGENCY);
        startBuzzer(2000);
        sendVoiceAlert("help");
        break;

      case 6:
        lastVoiceCommand = "emergency";
        Serial.println("🚨 EMERGENCY");
        voiceAlertTriggered = true;
        // EMERGENCY red flash — most critical
        setLedState(LED_EMERGENCY);
        startBuzzer(3000);
        sendVoiceAlert("emergency");
        break;

      case 7:
        lastVoiceCommand = "aray_shock";
        Serial.println("⚡ ARAY / SHOCK");
        voiceAlertTriggered = true;
        // Amber flash — pain/shock alert
        setLedState(LED_VOICE_ALERT);
        voiceLedActive = true;
        startBuzzer(1500);
        sendVoiceAlert("fall_shock");
        break;

      case 8:
        lastVoiceCommand = "tawag_call";
        Serial.println("📞 TAWAG / CALL NURSE");
        voiceAlertTriggered = true;
        // Amber flash — call for assistance
        setLedState(LED_VOICE_ALERT);
        voiceLedActive = true;
        startBuzzer(1000);
        sendVoiceAlert("call_nurse");
        break;

      case 10:
        lastVoiceCommand = "cancel";
        Serial.println("✅ CANCEL");
        voiceAlertTriggered = false;
        voiceLedActive = false;
        // Stop everything — return to idle
        digitalWrite(BUZZER, LOW);
        buzzerActive = false;
        setLedState(LED_IDLE);
        break;

      case 11:
        lastVoiceCommand = "sakit_pain";
        Serial.println("🤕 SAKIT / PAIN");
        voiceAlertTriggered = true;
        // Amber flash — pain alert
        setLedState(LED_VOICE_ALERT);
        voiceLedActive = true;
        startBuzzer(1500);
        sendVoiceAlert("pain");
        break;

      default:
        lastVoiceCommand = "unknown_" + String(cmdID);
        Serial.println("Unknown");
        break;
    }
  }
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

  // Status output
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
  doc["gps_chars"] = (unsigned long)gps.charsProcessed();
  if (gpsValid) {
    doc["satellites"] = gps.satellites.value();
    doc["gps_speed"] = gps.speed.kmph();
  }
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

// ============================================
// RGB LED CONTROL
// ============================================
void setRGB(bool r, bool g, bool b) {
  digitalWrite(RGB_RED,   r ? HIGH : LOW);
  digitalWrite(RGB_GREEN, g ? HIGH : LOW);
  digitalWrite(RGB_BLUE,  b ? HIGH : LOW);
}

void setLedState(LEDState newState) {
  // Allow re-entry for NUDGE and VOICE_ALERT to restart their blink cycles
  if (newState == currentLedState && newState != LED_NUDGE && newState != LED_VOICE_ALERT) return;
  currentLedState = newState;
  ledStateStart = millis();
  ledBlinkTimer = millis();
  ledBlinkOn = true;
  ledBlinkCount = 0;

  // Set initial color for the state
  switch (newState) {
    case LED_IDLE:         setRGB(0, 1, 0); break;  // Green
    case LED_SENDING:      setRGB(1, 0, 0); break;  // Red
    case LED_NUDGE:        setRGB(0, 0, 1); break;  // Blue
    case LED_EMERGENCY:    setRGB(1, 0, 0); break;  // Red (will rapid flash)
    case LED_VOICE_ALERT:  setRGB(1, 1, 0); break;  // Amber/Orange (red+green, will flash)
    case LED_GEOFENCE:     setRGB(1, 0, 1); break;  // Purple (red+blue)
    case LED_GPS_WAIT:     setRGB(1, 1, 0); break;  // Yellow (red+green)
  }
}

void handleLEDEffects() {
  unsigned long now = millis();

  switch (currentLedState) {
    case LED_IDLE:
      // Steady green — no blinking
      break;

    case LED_SENDING:
      // Quick red blink (100ms on/100ms off)
      if (now - ledBlinkTimer >= 100) {
        ledBlinkTimer = now;
        ledBlinkOn = !ledBlinkOn;
        setRGB(ledBlinkOn, 0, 0);
      }
      break;

    case LED_NUDGE:
      // Blue blink (300ms on/300ms off) for NUDGE_BLINK_CYCLES
      if (now - ledBlinkTimer >= 300) {
        ledBlinkTimer = now;
        ledBlinkOn = !ledBlinkOn;
        setRGB(0, 0, ledBlinkOn);
        if (!ledBlinkOn) ledBlinkCount++;
        if (ledBlinkCount >= NUDGE_BLINK_CYCLES) {
          nudgeActive = false;
          setLedState(LED_IDLE);
        }
      }
      break;

    case LED_EMERGENCY:
      // Rapid red flash (80ms on/80ms off)
      if (now - ledBlinkTimer >= 80) {
        ledBlinkTimer = now;
        ledBlinkOn = !ledBlinkOn;
        setRGB(ledBlinkOn, 0, 0);
      }
      // Auto-return to idle after 10 seconds
      if (now - ledStateStart >= 10000) {
        setLedState(LED_IDLE);
      }
      break;

    case LED_VOICE_ALERT:
      // Amber/orange flash (150ms on/150ms off) — distinct from emergency
      // Alternates between amber (red+green) ON and OFF
      if (now - ledBlinkTimer >= 150) {
        ledBlinkTimer = now;
        ledBlinkOn = !ledBlinkOn;
        setRGB(ledBlinkOn, ledBlinkOn, 0);  // Amber = red + green
        if (!ledBlinkOn) ledBlinkCount++;
        if (ledBlinkCount >= VOICE_ALERT_BLINK_CYCLES) {
          voiceLedActive = false;
          // Return to appropriate state
          if (!insideGeofence) {
            setLedState(LED_GEOFENCE);
          } else {
            setLedState(LED_IDLE);
          }
        }
      }
      break;

    case LED_GEOFENCE:
      // Purple pulse (500ms on/500ms off)
      if (now - ledBlinkTimer >= 500) {
        ledBlinkTimer = now;
        ledBlinkOn = !ledBlinkOn;
        setRGB(ledBlinkOn, 0, ledBlinkOn);  // Purple = red + blue
      }
      break;

    case LED_GPS_WAIT:
      // Slow yellow pulse (1000ms on/1000ms off)
      if (now - ledBlinkTimer >= 1000) {
        ledBlinkTimer = now;
        ledBlinkOn = !ledBlinkOn;
        setRGB(ledBlinkOn, ledBlinkOn, 0);  // Yellow = red + green
      }
      // Switch to green when GPS locks
      if (gpsValid) {
        setLedState(LED_IDLE);
      }
      break;
  }
}

// ============================================
// NUDGE POLLING (Server → Device)
// ============================================
void checkForNudge() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, NUDGE_URL);
  http.setTimeout(3000);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, response);

    if (!err && doc["nudge"].as<bool>() == true) {
      String msg = doc["message"] | "Alert";
      Serial.printf("📢 NUDGE RECEIVED: %s\n", msg.c_str());

      // Blue blink + short buzzer beep
      nudgeActive = true;
      setLedState(LED_NUDGE);
      startBuzzer(200);  // Short beep (non-blocking)

      // Acknowledge the nudge
      acknowledgeNudge();
    }
  }

  http.end();
}

void acknowledgeNudge() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, NUDGE_ACK);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST("{}");
  Serial.printf("[Nudge ACK: %d]\n", httpCode);
  http.end();
}

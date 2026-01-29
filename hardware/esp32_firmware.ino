#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "DHT.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include "DFRobot_DF2301Q.h"
#include <TinyGPS++.h>  // GPS Library - Install via Library Manager

// ============================================
// CONFIGURATION
// ============================================
const char* WIFI_SSID = "Hacking(2.4G)";
const char* WIFI_PASSWORD = "lelai09099729715";
const char* SERVER_URL = "https://guardwell.onrender.com/api/sensors/data";
const char* DEVICE_ID = "DEV-001";

// Geofence center (306 Pablo Dela Cruz, Novaliches, Quezon City)
const float GEOFENCE_LAT = 14.7089;
const float GEOFENCE_LNG = 121.0430;
const float GEOFENCE_RADIUS = 100.0;  // meters

// ============================================
// PINS
// ============================================
#define DHTPIN      4
#define DHTTYPE     DHT22
#define MQ2PIN      34      
#define TOUCHPIN    27
#define BUZZER      18

// Voice Recognition UART pins
#define VOICE_RX    16      
#define VOICE_TX    17      

// GPS UART pins (NEO-M8N)
#define GPS_RX      25
#define GPS_TX      26

// I2C Pins for MPU6050
#define I2C_SDA     21
#define I2C_SCL     22 

// ============================================
// OBJECTS
// ============================================
DHT dht(DHTPIN, DHTTYPE);
Adafruit_MPU6050 mpu;
HardwareSerial voiceSerial(2);
DFRobot_DF2301Q_UART voiceSensor(&voiceSerial, VOICE_RX, VOICE_TX);

// GPS Objects
HardwareSerial gpsSerial(1);  // Use Serial1 for GPS
TinyGPSPlus gps;

// ============================================
// VARIABLES
// ============================================
bool buzzerActive = false;
unsigned long buzzerStartTime = 0;
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 2000;
bool mpuConnected = false;

// Voice recognition variables
String lastVoiceCommand = "none";
uint8_t lastVoiceCommandID = 0;
bool voiceAlertTriggered = false;

// GPS variables
float latitude = 0.0;
float longitude = 0.0;
float gpsSpeed = 0.0;
bool gpsValid = false;
bool outsideGeofence = false;

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================");
  Serial.println(" GuardWell ESP32 + GPS (Tagalog Version)");
  Serial.println("========================================");

  // Initialize Sensors
  pinMode(TOUCHPIN, INPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(MQ2PIN, INPUT);
  digitalWrite(BUZZER, LOW);

  // --- Initialize I2C (MPU6050) ---
  Wire.begin(I2C_SDA, I2C_SCL); 

  // --- Initialize GPS ---
  Serial.print("Initializing GPS (NEO-M8N)... ");
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println("✅ Ready (Waiting for fix...)");

  // --- Initialize DHT ---
  Serial.print("Checking DHT Sensor... ");
  dht.begin();
  delay(2000);
  float testTemp = dht.readTemperature();
  if (isnan(testTemp)) {
    Serial.println("❌ Failed! (Check wiring/pull-up resistor)");
  } else {
    Serial.printf("✅ Ready (Current Temp: %.1f C)\n", testTemp);
  }

  // --- Initialize MPU6050 ---
  Serial.print("Checking MPU6050... ");
  if (!mpu.begin()) {
    Serial.println("❌ Not found (Check Wiring: SDA->21, SCL->22)");
    mpuConnected = false;
  } else {
    Serial.println("✅ Ready");
    mpu.setAccelerometerRange(MPU6050_RANGE_16_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    mpuConnected = true;
  }

  // --- Initialize Voice Sensor ---
  Serial.print("Checking Voice Sensor... ");
  if (!voiceSensor.begin()) {
    Serial.println("❌ Not found (Check Wiring: DT->16, CR->17)");
  } else {
    Serial.println("✅ Ready");
    voiceSensor.settingCMD(DF2301Q_UART_MSG_CMD_SET_VOLUME, 7);
    voiceSensor.settingCMD(DF2301Q_UART_MSG_CMD_SET_MUTE, 0);
    voiceSensor.settingCMD(DF2301Q_UART_MSG_CMD_SET_WAKE_TIME, 20);
  }

  connectToWiFi();
  Serial.println("✅ Setup complete - Waiting for commands...\n");
}

// ============================================
// LOOP
// ============================================
void loop() {
  // Reconnect WiFi if lost
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  // Read GPS data continuously
  readGPS();

  handleTouchSensor();
  handleVoiceRecognition();

  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();
    readAndSendSensorData();
  }

  // Handle buzzer timeout
  if (buzzerActive && millis() - buzzerStartTime >= 3000) {
    digitalWrite(BUZZER, LOW);
    buzzerActive = false;
  }

  delay(50);
}

// ============================================
// GPS FUNCTIONS
// ============================================
void readGPS() {
  while (gpsSerial.available() > 0) {
    if (gps.encode(gpsSerial.read())) {
      if (gps.location.isValid()) {
        latitude = gps.location.lat();
        longitude = gps.location.lng();
        gpsValid = true;
        
        if (gps.speed.isValid()) {
          gpsSpeed = gps.speed.kmph();
        }

        // Check geofence
        checkGeofence();
      }
    }
  }
}

// Calculate distance between two GPS points (Haversine formula)
float calculateDistance(float lat1, float lon1, float lat2, float lon2) {
  const float R = 6371000; // Earth's radius in meters
  float dLat = radians(lat2 - lat1);
  float dLon = radians(lon2 - lon1);
  float a = sin(dLat/2) * sin(dLat/2) +
            cos(radians(lat1)) * cos(radians(lat2)) *
            sin(dLon/2) * sin(dLon/2);
  float c = 2 * atan2(sqrt(a), sqrt(1-a));
  return R * c;
}

void checkGeofence() {
  if (!gpsValid) return;
  
  float distance = calculateDistance(latitude, longitude, GEOFENCE_LAT, GEOFENCE_LNG);
  
  if (distance > GEOFENCE_RADIUS) {
    if (!outsideGeofence) {
      // Just left the geofence
      outsideGeofence = true;
      Serial.println("⚠️ GEOFENCE ALERT: Worker LEFT safe zone!");
      triggerAlert(500);
      sendGeofenceAlert();
    }
  } else {
    if (outsideGeofence) {
      // Returned to geofence
      outsideGeofence = false;
      Serial.println("✅ Worker returned to safe zone");
    }
  }
}

void sendGeofenceAlert() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["geofence_violation"] = true;
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  String payload;
  serializeJson(doc, payload);
  sendToServer(payload);
}

// ============================================
// WIFI
// ============================================
void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected");
  } else {
    Serial.println("\n❌ WiFi Failed (Will retry later)");
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
    Serial.println("🚨 EMERGENCY BUTTON PRESSED");
    sendEmergencyAlert();
    delay(1000);
  }
}

// ============================================
// VOICE RECOGNITION (TAGALOG)
// ============================================
void handleVoiceRecognition() {
  uint8_t cmdID = voiceSensor.getCMDID();
  
  if (cmdID != 0) {
    lastVoiceCommandID = cmdID;
    Serial.printf("\n🎤 Voice Command Detected! ID: %d\n", cmdID);
    
    switch(cmdID) {
      case 2: // "Buzzer" (Manual Test)
        lastVoiceCommand = "test_buzzer";
        Serial.println("💡 Voice: 'BUZZER' (Test) Recognized!");
        triggerAlert(100); 
        triggerAlert(100); 
        break;

      case 5:  // "Tulong" (Help)
        lastVoiceCommand = "tulong_help";
        voiceAlertTriggered = true;
        Serial.println("🚨 VOICE ALERT: 'TULONG' requested!");
        triggerAlert(500);
        sendVoiceAlert("help");
        break;
        
      case 6:  // "Emergency"
        lastVoiceCommand = "emergency";
        voiceAlertTriggered = true;
        Serial.println("🚨 VOICE ALERT: 'EMERGENCY'!");
        triggerAlert(1000);
        sendVoiceAlert("emergency");
        break;
        
      case 7:  // "Aray" (Reaction to fall/shock)
        lastVoiceCommand = "aray_shock";
        voiceAlertTriggered = true;
        Serial.println("🚨 VOICE ALERT: 'ARAY' reported!");
        triggerAlert(800);
        sendVoiceAlert("fall_shock");
        break;
        
      case 8:  // "Tawag" (Call)
        lastVoiceCommand = "tawag_call";
        voiceAlertTriggered = true;
        Serial.println("🚨 VOICE ALERT: 'TAWAG' requested!");
        triggerAlert(600);
        sendVoiceAlert("call_nurse");
        break;
        
      case 10:  // "Tama na" (Cancel alarm)
        lastVoiceCommand = "cancel";
        voiceAlertTriggered = false;
        Serial.println("✅ VOICE: 'TAMA NA' - Alarm cancelled");
        digitalWrite(BUZZER, LOW);
        buzzerActive = false;
        break;
        
      case 11:  // "Sakit" (Pain)
        lastVoiceCommand = "sakit_pain";
        voiceAlertTriggered = true;
        Serial.println("🚨 VOICE ALERT: 'SAKIT' reported!");
        triggerAlert(700);
        sendVoiceAlert("pain");
        break;
        
      default:
        lastVoiceCommand = "unknown_" + String(cmdID);
        Serial.printf("🎤 Unknown voice command ID: %d\n", cmdID);
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
  // --- 1. Read DHT Sensor ---
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("⚠️ DHT Sensor Read Failed!");
    temp = 0.0;
    hum = 0.0;
  }

  // --- 2. Read MQ2 Gas Sensor ---
  int mq2Raw = analogRead(MQ2PIN);
  int gasPPM = map(mq2Raw, 0, 4095, 0, 1000); 

  // --- 3. Read MPU6050 ---
  float ax = 0, ay = 0, az = 0;
  float gx = 0, gy = 0, gz = 0;
  bool fallDetected = false;

  if (mpuConnected) {
    sensors_event_t a, g, t;
    mpu.getEvent(&a, &g, &t);
    
    ax = a.acceleration.x;
    ay = a.acceleration.y;
    az = a.acceleration.z;
    gx = g.gyro.x;
    gy = g.gyro.y;
    gz = g.gyro.z;

    float accelMag = sqrt(pow(ax, 2) + pow(ay, 2) + pow(az, 2));
    if (accelMag > 25.0) {
      fallDetected = true;
    }
  }

  // ==========================================
  // 🖨️ RAW DATA MONITOR
  // ==========================================
  Serial.println("\n------------------------------------------------");
  Serial.println("📊 SENSOR RAW DATA MONITOR");
  Serial.println("------------------------------------------------");
  
  Serial.printf("🌡️  TEMP:      %.2f °C\n", temp);
  Serial.printf("💧  HUMIDITY:  %.2f %%\n", hum);
  Serial.printf("⛽  GAS (MQ2): Raw: %d  |  Est. PPM: %d\n", mq2Raw, gasPPM);
  
  if (mpuConnected) {
    Serial.printf("📐  ACCEL (m/s^2):  X:%.2f  Y:%.2f  Z:%.2f\n", ax, ay, az);
    Serial.printf("🔄  GYRO  (rad/s):  X:%.2f  Y:%.2f  Z:%.2f\n", gx, gy, gz);
    if (fallDetected) Serial.println("⚠️  STATUS: FALL DETECTED!");
  } else {
    Serial.println("❌  MPU6050: Not Connected");
  }

  // GPS Status
  if (gpsValid) {
    Serial.printf("📍  GPS:       LAT: %.6f  LNG: %.6f\n", latitude, longitude);
    Serial.printf("🚗  SPEED:     %.2f km/h\n", gpsSpeed);
    Serial.printf("🔲  GEOFENCE:  %s\n", outsideGeofence ? "⚠️ OUTSIDE" : "✅ INSIDE");
  } else {
    Serial.println("📍  GPS:       Waiting for fix...");
  }

  Serial.printf("📶  WiFi RSSI: %ld dBm\n", WiFi.RSSI());
  Serial.printf("🔋  Battery:   85%%\n");
  Serial.println("------------------------------------------------\n");

  // --- 4. Prepare JSON for Server ---
  StaticJsonDocument<768> doc;
  doc["device_id"] = DEVICE_ID;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["gas_level"] = gasPPM;
  doc["voice_command"] = lastVoiceCommand;
  doc["voice_command_id"] = lastVoiceCommandID;
  doc["voice_alert"] = voiceAlertTriggered;

  doc["accel_x"] = ax;
  doc["accel_y"] = ay;
  doc["accel_z"] = az;
  doc["gyro_x"] = gx;
  doc["gyro_y"] = gy;
  doc["gyro_z"] = gz;
  
  // GPS Data
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  doc["gps_speed"] = gpsSpeed;
  doc["gps_valid"] = gpsValid;
  doc["geofence_violation"] = outsideGeofence;

  if (fallDetected) {
     doc["fall_detected"] = true;
     Serial.println("⚠️ SENDING FALL ALERT TO SERVER...");
  }

  doc["battery"] = 85;
  doc["rssi"] = WiFi.RSSI();

  String payload;
  serializeJson(doc, payload);
  
  Serial.println("--> Sending JSON to Server...");
  sendToServer(payload);
  
  if (voiceAlertTriggered) voiceAlertTriggered = false;
}

// ============================================
// ALERTS & SERVER
// ============================================
void sendEmergencyAlert() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["emergency_button"] = true;
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
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
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
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

  if (httpCode > 0) {
    Serial.printf("✅ Sent (Code: %d)\n", httpCode);
    Serial.println(http.getString());
  } else {
    Serial.printf("❌ Failed (Error: %s)\n",
                  http.errorToString(httpCode).c_str());
  }

  http.end();
}

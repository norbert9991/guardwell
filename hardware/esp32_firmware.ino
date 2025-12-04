/*
 * GuardWell ESP32 Sensor Firmware
 * 
 * Hardware:
 * - ESP32 DevKit
 * - DHT22 on GPIO 4 (Temperature & Humidity)
 * - MQ2 on GPIO 34 (Gas Detection - Analog)
 * - Touch Sensor on GPIO 15 (Emergency Button)
 * - Buzzer on GPIO 18
 * - MPU6050 on I2C (Accelerometer & Gyroscope)
 * 
 * Communication:
 * - Primary: MQTT over WiFi
 * - Fallback: HTTP POST to server
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <Wire.h>
#include "DHT.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>

// ======================
// CONFIGURATION
// ======================

// WiFi Settings - Update these for your network
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server Settings - Update for Railway deployment
const char* SERVER_URL = "http://YOUR_RAILWAY_URL/api/sensors/data";

// MQTT Settings
const char* MQTT_BROKER = "broker.hivemq.com"; // Free public broker for testing
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "guardwell_esp32_001"; // Unique per device
const char* DEVICE_ID = "DEV-001"; // Unique device identifier

// Sensor Topics
String SENSOR_TOPIC = String("guardwell/sensors/") + DEVICE_ID;
String EMERGENCY_TOPIC = String("guardwell/emergency/") + DEVICE_ID;

// ======================
// PIN DEFINITIONS
// ======================
#define DHTPIN 4
#define DHTTYPE DHT22
#define MQ2PIN 34
#define TOUCHPIN 15
#define BUZZER 18

// ======================
// SENSOR INSTANCES
// ======================
DHT dht(DHTPIN, DHTTYPE);
Adafruit_MPU6050 mpu;
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// ======================
// THRESHOLDS
// ======================
const float TEMP_WARNING = 40.0;
const float TEMP_CRITICAL = 50.0;
const int GAS_WARNING = 200;
const int GAS_CRITICAL = 400;
const float FALL_THRESHOLD = 25.0; // m/s² acceleration magnitude

// ======================
// STATE VARIABLES
// ======================
bool buzzerActive = false;
unsigned long buzzerStartTime = 0;
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 2000; // Send data every 2 seconds

bool useMQTT = true; // True = MQTT, False = HTTP fallback

// ======================
// SETUP
// ======================
void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n=================================");
    Serial.println("GuardWell ESP32 Sensor Starting...");
    Serial.println("=================================");

    // Initialize sensors
    dht.begin();
    pinMode(TOUCHPIN, INPUT);
    pinMode(BUZZER, OUTPUT);
    digitalWrite(BUZZER, LOW);
    pinMode(MQ2PIN, INPUT);

    // Initialize MPU6050
    if (!mpu.begin()) {
        Serial.println("❌ MPU6050 not found!");
    } else {
        Serial.println("✅ MPU6050 initialized");
        mpu.setAccelerometerRange(MPU6050_RANGE_16_G);
        mpu.setGyroRange(MPU6050_RANGE_500_DEG);
        mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    }

    // Connect to WiFi
    connectWiFi();

    // Setup MQTT
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);

    Serial.println("✅ Setup complete!");
}

// ======================
// MAIN LOOP
// ======================
void loop() {
    // Maintain connections
    if (WiFi.status() != WL_CONNECTED) {
        connectWiFi();
    }
    
    if (useMQTT) {
        if (!mqttClient.connected()) {
            connectMQTT();
        }
        mqttClient.loop();
    }

    // Handle touch sensor / emergency button
    handleEmergencyButton();

    // Send sensor data at intervals
    if (millis() - lastSendTime >= SEND_INTERVAL) {
        lastSendTime = millis();
        sendSensorData();
    }

    // Handle buzzer timeout
    if (buzzerActive && millis() - buzzerStartTime >= 3000) {
        digitalWrite(BUZZER, LOW);
        buzzerActive = false;
        Serial.println("🔔 Buzzer OFF");
    }

    delay(10); // Small delay for stability
}

// ======================
// WIFI CONNECTION
// ======================
void connectWiFi() {
    Serial.print("📶 Connecting to WiFi");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ WiFi connected!");
        Serial.print("   IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\n❌ WiFi connection failed!");
    }
}

// ======================
// MQTT CONNECTION
// ======================
void connectMQTT() {
    Serial.print("📡 Connecting to MQTT broker...");
    
    if (mqttClient.connect(MQTT_CLIENT_ID)) {
        Serial.println(" connected!");
        // Subscribe to commands from server
        String commandTopic = "guardwell/commands/" + String(DEVICE_ID);
        mqttClient.subscribe(commandTopic.c_str());
    } else {
        Serial.print(" failed, rc=");
        Serial.print(mqttClient.state());
        Serial.println(". Falling back to HTTP.");
        useMQTT = false;
    }
}

// ======================
// MQTT CALLBACK
// ======================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String message = "";
    for (unsigned int i = 0; i < length; i++) {
        message += (char)payload[i];
    }
    
    Serial.print("📥 MQTT Message [");
    Serial.print(topic);
    Serial.print("]: ");
    Serial.println(message);

    // Handle commands from server
    if (message == "BUZZ") {
        activateBuzzer();
    } else if (message == "LOCATE") {
        // Flash LED or beep to help locate device
        for (int i = 0; i < 3; i++) {
            digitalWrite(BUZZER, HIGH);
            delay(100);
            digitalWrite(BUZZER, LOW);
            delay(100);
        }
    }
}

// ======================
// EMERGENCY BUTTON
// ======================
void handleEmergencyButton() {
    int touchState = digitalRead(TOUCHPIN);

    if (touchState == HIGH && !buzzerActive) {
        buzzerActive = true;
        buzzerStartTime = millis();
        digitalWrite(BUZZER, HIGH);
        
        Serial.println("🚨 EMERGENCY BUTTON PRESSED!");

        // Send emergency alert immediately
        sendEmergencyAlert();
    }
}

void activateBuzzer() {
    buzzerActive = true;
    buzzerStartTime = millis();
    digitalWrite(BUZZER, HIGH);
    Serial.println("🔔 Buzzer activated by server command");
}

// ======================
// SENSOR DATA COLLECTION
// ======================
void sendSensorData() {
    // Create JSON document
    StaticJsonDocument<512> doc;
    
    doc["device_id"] = DEVICE_ID;

    // DHT22: Temperature & Humidity
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    if (!isnan(temp)) doc["temperature"] = temp;
    if (!isnan(hum)) doc["humidity"] = hum;

    // MQ2: Gas Level (analog 0-4095)
    int gasRaw = analogRead(MQ2PIN);
    // Convert to approximate PPM (calibration needed for accuracy)
    int gasPPM = map(gasRaw, 0, 4095, 0, 1000);
    doc["gas_level"] = gasPPM;

    // MPU6050: Accelerometer & Gyroscope
    sensors_event_t a, g, tempSensor;
    mpu.getEvent(&a, &g, &tempSensor);
    
    doc["accel_x"] = a.acceleration.x;
    doc["accel_y"] = a.acceleration.y;
    doc["accel_z"] = a.acceleration.z;
    doc["gyro_x"] = g.gyro.x;
    doc["gyro_y"] = g.gyro.y;
    doc["gyro_z"] = g.gyro.z;

    // Check for fall detection
    float accelMagnitude = sqrt(
        pow(a.acceleration.x, 2) + 
        pow(a.acceleration.y, 2) + 
        pow(a.acceleration.z, 2)
    );
    
    if (accelMagnitude >= FALL_THRESHOLD) {
        Serial.println("⚠️ FALL DETECTED!");
        doc["fall_detected"] = true;
    }

    // WiFi signal strength
    doc["rssi"] = WiFi.RSSI();

    // Battery level (simulated - replace with actual ADC reading if available)
    doc["battery"] = 85;

    // Local alerts
    bool localAlert = false;
    if (!isnan(temp) && temp >= TEMP_WARNING) {
        Serial.println(temp >= TEMP_CRITICAL ? "🔥 CRITICAL TEMP!" : "⚠️ High temperature!");
        localAlert = true;
    }
    if (gasPPM >= GAS_WARNING) {
        Serial.println(gasPPM >= GAS_CRITICAL ? "☠️ CRITICAL GAS!" : "⚠️ High gas level!");
        localAlert = true;
    }
    if (localAlert) {
        activateBuzzer();
    }

    // Serialize to JSON string
    String jsonString;
    serializeJson(doc, jsonString);

    // Print to Serial for debugging
    Serial.print("📤 Sending: ");
    Serial.println(jsonString);

    // Send via MQTT or HTTP
    if (useMQTT && mqttClient.connected()) {
        mqttClient.publish(SENSOR_TOPIC.c_str(), jsonString.c_str());
        Serial.println("✅ Sent via MQTT");
    } else {
        sendHTTP(jsonString);
    }
}

// ======================
// EMERGENCY ALERT
// ======================
void sendEmergencyAlert() {
    StaticJsonDocument<256> doc;
    doc["device_id"] = DEVICE_ID;
    doc["emergency_button"] = true;
    doc["timestamp"] = millis();

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.print("🚨 Emergency Alert: ");
    Serial.println(jsonString);

    if (useMQTT && mqttClient.connected()) {
        mqttClient.publish(EMERGENCY_TOPIC.c_str(), jsonString.c_str());
        Serial.println("✅ Emergency sent via MQTT");
    } else {
        sendHTTP(jsonString);
    }
}

// ======================
// HTTP FALLBACK
// ======================
void sendHTTP(String jsonData) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("❌ WiFi not connected, cannot send HTTP");
        return;
    }

    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    
    int httpCode = http.POST(jsonData);
    
    if (httpCode > 0) {
        Serial.print("✅ HTTP Response: ");
        Serial.println(httpCode);
        if (httpCode == HTTP_CODE_OK) {
            String response = http.getString();
            Serial.println(response);
        }
    } else {
        Serial.print("❌ HTTP Error: ");
        Serial.println(http.errorToString(httpCode));
    }
    
    http.end();
}

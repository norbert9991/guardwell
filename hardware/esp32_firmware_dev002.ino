#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "DHT.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include <driver/i2s_std.h>
#include <math.h>
#include <TinyGPS++.h>
#include <base64.h>

// ============================================
// CONFIGURATION — DEV-002
// ============================================
const char* WIFI_SSID = "infi";
const char* WIFI_PASSWORD = "12345678";
const char* SERVER_URL = "https://guardwell.onrender.com/api/sensors/data";
const char* NUDGE_URL  = "https://guardwell.onrender.com/api/sensors/nudge/DEV-002";
const char* NUDGE_ACK  = "https://guardwell.onrender.com/api/sensors/nudge/DEV-002/ack";
const char* EMERGENCY_BUZZER_URL = "https://guardwell.onrender.com/api/sensors/emergency-buzzer/DEV-002";
const char* VOICE_API_URL = "https://guardwell.onrender.com/api/voice/process";
const char* DEVICE_ID = "DEV-002";

// Geofence
const float FACILITY_LAT = 14.705493;
const float FACILITY_LON = 121.034774;
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

// I2C Bus (MPU6050)
#define I2C_SDA     21
#define I2C_SCL     22 

// INMP441 I2S Microphone
#define I2S_WS      25
#define I2S_SCK     26
#define I2S_SD      32

// I2S channel handle (new standard driver API)
i2s_chan_handle_t i2s_rx_handle = NULL;

// GPS (UART - Serial2)
#define GPS_RX      16  // ESP32 receives from GPS TX
#define GPS_TX      17  // ESP32 sends to GPS RX

// ============================================
// OBJECTS
// ============================================
DHT dht(DHTPIN, DHTTYPE);
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;

// INMP441 AI Voice Recognition Pipeline
// Audio monitoring + 3-second recording → Server (Whisper STT + Claude intent)
#define SAMPLE_RATE         16000
#define MONITOR_SAMPLES     512       // Quick reads for amplitude monitoring
#define RECORD_DURATION_SEC 3
#define RECORD_SAMPLES      (SAMPLE_RATE * RECORD_DURATION_SEC)  // 48000 samples
#define RECORD_BYTES        (RECORD_SAMPLES * 2)                 // 96000 bytes (16-bit)
#define WAV_HEADER_SIZE     44

// Small buffer for amplitude monitoring (stack-safe)
int16_t monitorBuffer[MONITOR_SAMPLES];

// --- TUNABLE THRESHOLDS ---
float RMS_THRESHOLD              = 500.0;   // Min RMS to trigger voice recording
unsigned long DETECTION_COOLDOWN = 10000;   // 10s cooldown between voice recordings (API calls are expensive)

// Running state
float baselineRMS = 0.0;
unsigned long lastDetectionTime = 0;
bool soundAlertTriggered = false;


// ============================================
// VARIABLES
// ============================================
bool buzzerActive = false;
unsigned long buzzerStartTime = 0;
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 2000;
bool mpuConnected = false;
bool micConnected = false;
bool gpsConnected = false;

String lastVoiceCommand = "none";
String lastAlertType = "";
bool voiceAlertTriggered = false;

// Flat orientation detection (possible fall / incapacitation)
int flatConsecutiveCount = 0;
const int FLAT_CONSECUTIVE_THRESHOLD = 3;  // ~6 seconds at 2s interval
bool flatAlertSent = false;

// Simulated GPS coordinates (QCU) — for demo/testing
float currentLat = 14.700598;
float currentLon = 121.032460;
bool gpsValid = true;

// ============================================
// RGB LED STATE MACHINE
// ============================================
enum LEDState {
  LED_IDLE,       // Green steady - connected, normal
  LED_SENDING,    // Red blink - sending data
  LED_NUDGE,      // Blue blink - received nudge from website
  LED_EMERGENCY,  // Rapid red flash - SOS active
  LED_GEOFENCE,   // Purple (red+blue) - geofence violation
  LED_GPS_WAIT,   // Yellow (red+green) - GPS acquiring
  LED_LISTENING   // Cyan (green+blue) - recording voice for AI
};

LEDState currentLedState = LED_IDLE;
unsigned long ledStateStart = 0;
unsigned long ledBlinkTimer = 0;
bool ledBlinkOn = false;
int ledBlinkCount = 0;
const int NUDGE_BLINK_CYCLES = 10;  // Blue blinks when nudge received
bool nudgeActive = false;
bool nudgePending = false;  // true = waiting for worker to tap touch sensor to acknowledge
bool insideGeofence = true;
unsigned long lastGeofenceCheck = 0;

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("\n========================================");
  Serial.println(" GuardWell ESP32 — DEV-002 (INMP441 + AI Voice)");
  Serial.println("========================================");
  Serial.println("INMP441 I2S Mic (pins 25, 26, 32):");
  Serial.println("  - WS=25, SCK=26, SD=32");
  Serial.println("I2C Bus (pins 21, 22):");
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

  // === 4. INMP441 Microphone (I2S) ===
  Serial.print("[3/5] INMP441 Mic (I2S)... ");
  micConnected = initINMP441();
  if (micConnected) {
    Serial.println("✅");
    Serial.printf("     AI Voice Pipeline: %dHz, %ds recording, threshold RMS>%.0f\n",
                  SAMPLE_RATE, RECORD_DURATION_SEC, RMS_THRESHOLD);
    Serial.println("     Pipeline: INMP441 → WAV → Base64 → Whisper STT → Claude Intent");
  } else {
    Serial.println("❌ I2S init failed");
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
  
  if (micConnected) {
    handleSoundDetection();
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

    // Red blink while sending
    setLedState(LED_SENDING);
    readAndSendSensorData();

    // Poll for nudges from the website
    checkForNudge();

    // Poll for emergency buzzer from other devices
    checkForEmergencyBuzzer();

    // Return to appropriate idle state
    if (nudgeActive) {
      // Nudge blink takes priority
    } else if (!insideGeofence) {
      setLedState(LED_GEOFENCE);
    } else if (!gpsValid && gpsConnected) {
      setLedState(LED_GPS_WAIT);
    } else {
      setLedState(LED_IDLE);
    }
  }

  if (buzzerActive && millis() - buzzerStartTime >= 3000) {
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
// TOUCH SENSOR (Dual mode: Nudge ACK or Emergency)
// ============================================
void handleTouchSensor() {
  if (digitalRead(TOUCHPIN) == HIGH && !buzzerActive) {
    buzzerActive = true;
    buzzerStartTime = millis();

    if (nudgePending) {
      // --- NUDGE ACKNOWLEDGE MODE ---
      // Worker tapped touch sensor to respond to nudge
      nudgePending = false;
      nudgeActive = false;
      Serial.println("✅ NUDGE ACKNOWLEDGED by touch sensor");

      // Reset flat alert (worker is conscious and responsive)
      flatConsecutiveCount = 0;
      flatAlertSent = false;

      // Confirmation: short beep + green flash
      digitalWrite(BUZZER, HIGH);
      setRGB(0, 1, 0);  // Green flash
      delay(300);
      digitalWrite(BUZZER, LOW);
      setLedState(LED_IDLE);  // Return to green steady

      // Send acknowledgment to server
      acknowledgeNudge();
    } else {
      // --- EMERGENCY MODE ---
      // No pending nudge, so this is an emergency button press
      digitalWrite(BUZZER, HIGH);
      setLedState(LED_EMERGENCY);
      Serial.println("🚨 EMERGENCY!");

      // Reset flat alert state
      flatConsecutiveCount = 0;
      flatAlertSent = false;

      sendEmergencyAlert();
      delay(1000);
    }
  }
}

// ============================================
// INMP441 I2S INITIALIZATION (New Standard Driver API)
// Uses i2s_std.h — compatible with analogRead()
// ============================================
bool initINMP441() {
  // 1. Configure the I2S channel
  i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
  chan_cfg.dma_desc_num = 8;
  chan_cfg.dma_frame_num = MONITOR_SAMPLES;

  esp_err_t err = i2s_new_channel(&chan_cfg, NULL, &i2s_rx_handle);  // RX only
  if (err != ESP_OK) {
    Serial.printf("I2S new channel failed: %d\n", err);
    return false;
  }

  // 2. Configure standard mode for INMP441
  i2s_std_config_t std_cfg = {
    .clk_cfg  = I2S_STD_CLK_DEFAULT_CONFIG(SAMPLE_RATE),
    .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO),
    .gpio_cfg = {
      .mclk = I2S_GPIO_UNUSED,
      .bclk = (gpio_num_t)I2S_SCK,
      .ws   = (gpio_num_t)I2S_WS,
      .dout = I2S_GPIO_UNUSED,
      .din  = (gpio_num_t)I2S_SD,
      .invert_flags = {
        .mclk_inv = false,
        .bclk_inv = false,
        .ws_inv   = false,
      },
    },
  };
  // INMP441 outputs on left channel when L/R pin is LOW
  std_cfg.slot_cfg.slot_mask = I2S_STD_SLOT_LEFT;

  err = i2s_channel_init_std_mode(i2s_rx_handle, &std_cfg);
  if (err != ESP_OK) {
    Serial.printf("I2S init std mode failed: %d\n", err);
    return false;
  }

  // 3. Enable the channel
  err = i2s_channel_enable(i2s_rx_handle);
  if (err != ESP_OK) {
    Serial.printf("I2S channel enable failed: %d\n", err);
    return false;
  }

  return true;
}

// ============================================
// AI VOICE RECOGNITION PIPELINE
// Stage 1: Monitor audio level (lightweight, runs every loop)
// Stage 2: Record 3s of audio when triggered
// Stage 3: WAV encode → Base64 → POST to server
// Stage 4: Parse intent from Claude → dispatch action
// ============================================

// --- Stage 1: Audio Level Monitoring ---
// Continuously reads small I2S chunks and checks RMS amplitude.
// When loud enough, triggers the full recording pipeline.
void handleSoundDetection() {
  // Read a small chunk for amplitude monitoring
  size_t bytesIn = 0;
  esp_err_t result = i2s_channel_read(i2s_rx_handle, monitorBuffer, sizeof(monitorBuffer), &bytesIn, 100);
  if (result != ESP_OK || bytesIn == 0) return;

  int samplesRead = bytesIn / sizeof(int16_t);
  if (samplesRead < 10) return;

  // Compute RMS amplitude
  float sumSquares = 0;
  for (int i = 0; i < samplesRead; i++) {
    float sample = (float)monitorBuffer[i];
    sumSquares += sample * sample;
  }
  float rms = sqrt(sumSquares / samplesRead);

  // Update baseline RMS (slow-moving average of ambient noise)
  if (baselineRMS < 1.0) {
    baselineRMS = rms;
  } else {
    baselineRMS = baselineRMS * 0.98 + rms * 0.02;
  }

  // Debug output (throttled)
  static unsigned long lastDebugPrint = 0;
  if (millis() - lastDebugPrint > 2000) {
    lastDebugPrint = millis();
    Serial.printf("[MIC] RMS:%.0f BL:%.0f (threshold:%.0f)\n", rms, baselineRMS, RMS_THRESHOLD);
  }

  // Check if loud enough AND cooldown has passed
  if (rms > RMS_THRESHOLD && (millis() - lastDetectionTime > DETECTION_COOLDOWN)) {
    lastDetectionTime = millis();

    Serial.println("\n🎤 ============================================");
    Serial.printf("🎤  SOUND DETECTED! RMS=%.0f (threshold=%.0f)\n", rms, RMS_THRESHOLD);
    Serial.println("🎤  Starting 3-second voice recording...");
    Serial.println("🎤 ============================================\n");

    // Trigger the full AI voice pipeline
    recordAndProcessVoice();
  }
}

// --- Stage 2: Record 3 seconds of audio ---
void recordAndProcessVoice() {
  // Show cyan LED while recording
  setLedState(LED_LISTENING);

  // Heap-allocate the recording buffer (96KB + 44 bytes WAV header)
  uint32_t totalBytes = WAV_HEADER_SIZE + RECORD_BYTES;
  uint8_t* wavBuffer = (uint8_t*)heap_caps_malloc(totalBytes, MALLOC_CAP_8BIT);

  if (!wavBuffer) {
    Serial.println("❌ Failed to allocate recording buffer! (need ~96KB free heap)");
    Serial.printf("   Free heap: %d bytes\n", ESP.getFreeHeap());
    setLedState(LED_IDLE);
    return;
  }

  Serial.printf("📼 Recording %d seconds @ %dHz (buffer: %d bytes, free heap: %d)\n",
                RECORD_DURATION_SEC, SAMPLE_RATE, totalBytes, ESP.getFreeHeap());

  // Write WAV header (will be filled with correct sizes after recording)
  writeWAVHeader(wavBuffer, RECORD_BYTES);

  // Record audio into the buffer after the WAV header
  uint8_t* audioData = wavBuffer + WAV_HEADER_SIZE;
  uint32_t bytesRecorded = 0;
  unsigned long recordStart = millis();

  while (bytesRecorded < RECORD_BYTES) {
    size_t bytesIn = 0;
    uint32_t bytesRemaining = RECORD_BYTES - bytesRecorded;
    uint32_t readSize = min(bytesRemaining, (uint32_t)sizeof(monitorBuffer));

    esp_err_t result = i2s_channel_read(i2s_rx_handle, audioData + bytesRecorded, readSize, &bytesIn, 1000);
    if (result != ESP_OK) {
      Serial.printf("❌ I2S read error at byte %d: %d\n", bytesRecorded, result);
      break;
    }
    bytesRecorded += bytesIn;

    // Progress indicator
    if (bytesRecorded % (RECORD_BYTES / 3) < readSize) {
      Serial.printf("   Recording... %d%%\n", (int)(100.0 * bytesRecorded / RECORD_BYTES));
    }
  }

  unsigned long recordTime = millis() - recordStart;
  Serial.printf("✅ Recorded %d bytes in %dms\n", bytesRecorded, recordTime);

  // Process the audio with AI
  processAudioWithAI(wavBuffer, WAV_HEADER_SIZE + bytesRecorded);

  // Free the buffer
  free(wavBuffer);

  // Return to idle LED
  setLedState(LED_IDLE);
}

// --- WAV Header Writer ---
void writeWAVHeader(uint8_t* buffer, uint32_t dataSize) {
  uint32_t fileSize = dataSize + 36;  // Total file size minus 8

  // RIFF header
  buffer[0] = 'R'; buffer[1] = 'I'; buffer[2] = 'F'; buffer[3] = 'F';
  buffer[4] = fileSize & 0xFF;
  buffer[5] = (fileSize >> 8) & 0xFF;
  buffer[6] = (fileSize >> 16) & 0xFF;
  buffer[7] = (fileSize >> 24) & 0xFF;
  buffer[8] = 'W'; buffer[9] = 'A'; buffer[10] = 'V'; buffer[11] = 'E';

  // fmt subchunk
  buffer[12] = 'f'; buffer[13] = 'm'; buffer[14] = 't'; buffer[15] = ' ';
  buffer[16] = 16; buffer[17] = 0; buffer[18] = 0; buffer[19] = 0;  // Subchunk1Size (16 for PCM)
  buffer[20] = 1; buffer[21] = 0;  // AudioFormat (1 = PCM)
  buffer[22] = 1; buffer[23] = 0;  // NumChannels (1 = mono)

  // SampleRate
  buffer[24] = SAMPLE_RATE & 0xFF;
  buffer[25] = (SAMPLE_RATE >> 8) & 0xFF;
  buffer[26] = (SAMPLE_RATE >> 16) & 0xFF;
  buffer[27] = (SAMPLE_RATE >> 24) & 0xFF;

  // ByteRate = SampleRate * NumChannels * BitsPerSample/8
  uint32_t byteRate = SAMPLE_RATE * 1 * 2;  // 16-bit mono
  buffer[28] = byteRate & 0xFF;
  buffer[29] = (byteRate >> 8) & 0xFF;
  buffer[30] = (byteRate >> 16) & 0xFF;
  buffer[31] = (byteRate >> 24) & 0xFF;

  buffer[32] = 2; buffer[33] = 0;  // BlockAlign = NumChannels * BitsPerSample/8
  buffer[34] = 16; buffer[35] = 0; // BitsPerSample

  // data subchunk
  buffer[36] = 'd'; buffer[37] = 'a'; buffer[38] = 't'; buffer[39] = 'a';
  buffer[40] = dataSize & 0xFF;
  buffer[41] = (dataSize >> 8) & 0xFF;
  buffer[42] = (dataSize >> 16) & 0xFF;
  buffer[43] = (dataSize >> 24) & 0xFF;
}

// --- Stage 3: Base64 encode and POST to server ---
void processAudioWithAI(uint8_t* wavBuffer, uint32_t wavSize) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected — cannot send audio for AI processing");
    return;
  }

  Serial.printf("📡 Encoding %d bytes to base64...\n", wavSize);

  // Base64 encode the WAV data
  String base64Audio = base64::encode(wavBuffer, wavSize);
  Serial.printf("📡 Base64 size: %d chars\n", base64Audio.length());

  // Build JSON payload
  // Use DynamicJsonDocument for large payloads
  DynamicJsonDocument doc(base64Audio.length() + 512);
  doc["device_id"] = DEVICE_ID;
  doc["audio_b64"] = base64Audio;

  String payload;
  serializeJson(doc, payload);

  // Free the JSON doc early to reclaim memory
  doc.clear();

  Serial.printf("📡 Sending to AI voice endpoint (%d bytes)...\n", payload.length());

  // POST to server
  WiFiClientSecure client;
  client.setInsecure();  // Skip certificate verification (Render uses valid certs)

  HTTPClient http;
  http.begin(client, VOICE_API_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(30000);  // 30s timeout for Whisper + Claude round-trip

  int httpCode = http.POST(payload);
  payload = "";  // Free memory

  if (httpCode == 200) {
    String response = http.getString();
    Serial.printf("✅ AI Response: %s\n", response.c_str());

    // Parse the response
    StaticJsonDocument<512> respDoc;
    DeserializationError err = deserializeJson(respDoc, response);

    if (!err) {
      const char* intent = respDoc["intent"] | "unknown";
      float confidence = respDoc["confidence"] | 0.0;
      const char* transcription = respDoc["transcription"] | "";
      const char* language = respDoc["language"] | "unknown";

      Serial.printf("\n🧠 ============================================\n");
      Serial.printf("🧠  VOICE AI RESULT\n");
      Serial.printf("🧠  Transcription: \"%s\"\n", transcription);
      Serial.printf("🧠  Intent: %s (confidence: %.0f%%)\n", intent, confidence * 100);
      Serial.printf("🧠  Language: %s\n", language);
      Serial.printf("🧠 ============================================\n\n");

      // Dispatch action based on intent
      parseClaudeIntent(String(intent), confidence, String(transcription));
    } else {
      Serial.printf("❌ Failed to parse AI response: %s\n", err.c_str());
    }
  } else {
    Serial.printf("❌ AI voice endpoint returned HTTP %d\n", httpCode);
    if (httpCode > 0) {
      String errorBody = http.getString();
      Serial.printf("   Error: %s\n", errorBody.c_str());
    }
  }

  http.end();
}

// --- Stage 4: Dispatch actions based on Claude's classified intent ---
void parseClaudeIntent(String intent, float confidence, String transcription) {
  // Only act on high-confidence intents
  if (confidence < 0.7) {
    Serial.printf("⚠️ Low confidence (%.0f%%) — ignoring intent: %s\n", confidence * 100, intent.c_str());
    return;
  }

  if (intent == "emergency" || intent == "help") {
    Serial.println("🚨 EMERGENCY VOICE INTENT — ACTIVATING ALERT!");
    lastVoiceCommand = transcription.length() > 0 ? transcription : "voice_emergency";
    lastAlertType = "voice_emergency";
    voiceAlertTriggered = true;
    soundAlertTriggered = true;
    setLedState(LED_EMERGENCY);
    triggerAlert(1500);  // 1.5s buzzer
    sendVoiceAlert("voice_emergency");

  } else if (intent == "fire") {
    Serial.println("🔥 FIRE VOICE INTENT — ACTIVATING FIRE ALERT!");
    lastVoiceCommand = transcription.length() > 0 ? transcription : "voice_fire";
    lastAlertType = "voice_fire";
    voiceAlertTriggered = true;
    soundAlertTriggered = true;
    setLedState(LED_EMERGENCY);
    triggerAlert(2000);  // 2s buzzer for fire
    sendVoiceAlert("voice_fire");

  } else if (intent == "gas") {
    Serial.println("☁️ GAS LEAK VOICE INTENT — ACTIVATING GAS ALERT!");
    lastVoiceCommand = transcription.length() > 0 ? transcription : "voice_gas";
    lastAlertType = "voice_gas";
    voiceAlertTriggered = true;
    soundAlertTriggered = true;
    setLedState(LED_EMERGENCY);
    triggerAlert(1500);
    sendVoiceAlert("voice_gas");

  } else if (intent == "medical") {
    Serial.println("🏥 MEDICAL VOICE INTENT — ACTIVATING MEDICAL ALERT!");
    lastVoiceCommand = transcription.length() > 0 ? transcription : "voice_medical";
    lastAlertType = "voice_medical";
    voiceAlertTriggered = true;
    soundAlertTriggered = true;
    setLedState(LED_EMERGENCY);
    triggerAlert(1000);
    sendVoiceAlert("voice_medical");

  } else if (intent == "collapse") {
    Serial.println("🏗️ COLLAPSE VOICE INTENT — ACTIVATING STRUCTURAL ALERT!");
    lastVoiceCommand = transcription.length() > 0 ? transcription : "voice_collapse";
    lastAlertType = "voice_collapse";
    voiceAlertTriggered = true;
    soundAlertTriggered = true;
    setLedState(LED_EMERGENCY);
    triggerAlert(1500);
    sendVoiceAlert("voice_collapse");

  } else if (intent == "safe" || intent == "none") {
    Serial.println("✅ Safe/normal speech — no action needed");

  } else {
    Serial.printf("❓ Unknown intent: %s — no action taken\n", intent.c_str());
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

  // MQ2 DISABLED — sensor draws too much current on 9V battery,
  // causing brownouts and false critical alerts. Uncomment when using proper PSU.
  // int gasPPM = map(analogRead(MQ2PIN), 0, 4095, 0, 1000); 
  int gasPPM = 0;  // Disabled — no gas reading

  float ax=0, ay=0, az=0, gx=0, gy=0, gz=0;
  bool fallDetected = false;
  bool flatOrientationAlert = false;

  if (mpuConnected) {
    sensors_event_t a, g, t;
    mpu.getEvent(&a, &g, &t);
    ax = a.acceleration.x; ay = a.acceleration.y; az = a.acceleration.z;
    gx = g.gyro.x; gy = g.gyro.y; gz = g.gyro.z;
    if (sqrt(ax*ax + ay*ay + az*az) > 25.0) fallDetected = true;

    // --- Flat orientation detection (possible fall / incapacitation) ---
    // Detects BOTH face-up flat AND upside-down flat
    float absX = fabs(ax), absY = fabs(ay), absZ = fabs(az);
    float gyroMag = sqrt(gx*gx + gy*gy + gz*gz);
    bool isFlat = (absZ > absX && absZ > absY);  // Z-axis dominant = flat (face-up or upside-down)
    bool isStationary = (gyroMag < 5.0);  // Low rotation = not moving

    if (isFlat && isStationary) {
      flatConsecutiveCount++;
      Serial.printf("[FLAT] Flat detected (%d/%d) az=%.2f gyro=%.2f\n", 
                    flatConsecutiveCount, FLAT_CONSECUTIVE_THRESHOLD, az, gyroMag);

      if (flatConsecutiveCount >= FLAT_CONSECUTIVE_THRESHOLD && !flatAlertSent) {
        flatAlertSent = true;

        Serial.println("\n🚨 ============================================");
        Serial.println("🚨  FLAT ORIENTATION EMERGENCY!");
        Serial.println("🚨  Worker may have fallen or be incapacitated");
        Serial.printf("🚨  Accel: X=%.2f Y=%.2f Z=%.2f  Gyro: %.2f\n", ax, ay, az, gyroMag);
        Serial.println("🚨 ============================================\n");

        // Sound buzzer alarm
        setLedState(LED_EMERGENCY);
        triggerAlert(1500);  // 1.5 second buzzer burst

        // Send flat orientation emergency to server
        sendFlatOrientationAlert();
      }

      // Keep flat flag true as long as device is flat AND alert has been sent
      if (flatAlertSent) {
        flatOrientationAlert = true;
      }
    } else {
      // Not flat anymore — reset counter
      if (flatConsecutiveCount > 0) {
        Serial.println("[FLAT] Orientation changed — counter reset");
      }
      flatConsecutiveCount = 0;
      flatAlertSent = false;
    }
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
  doc["voice_alert"] = voiceAlertTriggered;
  if (soundAlertTriggered) {
    doc["alert_type"] = lastAlertType.length() > 0 ? lastAlertType : "human_distress";
    soundAlertTriggered = false;
    lastAlertType = "";
  }
  doc["accel_x"] = ax; doc["accel_y"] = ay; doc["accel_z"] = az;
  doc["gyro_x"] = gx; doc["gyro_y"] = gy; doc["gyro_z"] = gz;
  if (fallDetected) doc["fall_detected"] = true;
  if (flatOrientationAlert) doc["flat_orientation"] = true;
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

void sendFlatOrientationAlert() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["flat_orientation"] = true;
  doc["latitude"] = currentLat;
  doc["longitude"] = currentLon;
  doc["gps_valid"] = gpsValid;
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
  if (newState == currentLedState && newState != LED_NUDGE) return;
  currentLedState = newState;
  ledStateStart = millis();
  ledBlinkTimer = millis();
  ledBlinkOn = true;
  ledBlinkCount = 0;

  // Set initial color for the state
  switch (newState) {
    case LED_IDLE:       setRGB(0, 1, 0); break;  // Green
    case LED_SENDING:    setRGB(1, 0, 0); break;  // Red
    case LED_NUDGE:      setRGB(0, 0, 1); break;  // Blue
    case LED_EMERGENCY:  setRGB(1, 0, 0); break;  // Red (will flash)
    case LED_GEOFENCE:   setRGB(1, 0, 1); break;  // Purple (red+blue)
    case LED_GPS_WAIT:   setRGB(1, 1, 0); break;  // Yellow (red+green)
    case LED_LISTENING:  setRGB(0, 1, 1); break;  // Cyan (green+blue) - recording
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

    case LED_LISTENING:
      // Steady cyan while recording — no blinking
      // (recording takes ~3 seconds, then returns to idle)
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
      Serial.println("   → Tap touch sensor to acknowledge (touch = ack, NOT emergency)");

      // Blue blink + short buzzer beep to alert the worker
      nudgeActive = true;
      nudgePending = true;  // Wait for worker to tap touch sensor
      setLedState(LED_NUDGE);
      triggerAlert(200);  // Short beep

      // DO NOT auto-acknowledge — worker must tap touch sensor
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

// ============================================
// EMERGENCY BUZZER POLLING (Server → Device)
// Checks if another device triggered an emergency
// ============================================
void checkForEmergencyBuzzer() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, EMERGENCY_BUZZER_URL);
  http.setTimeout(3000);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, response);

    if (!err && doc["buzzer"].as<bool>() == true) {
      String sourceDevice = doc["sourceDevice"] | "unknown";
      String workerName = doc["workerName"] | "Unknown";
      String alertType = doc["type"] | "Emergency";
      
      Serial.printf("\n🚨 EMERGENCY BUZZER from %s (%s) — %s\n", 
                    sourceDevice.c_str(), workerName.c_str(), alertType.c_str());
      
      // Activate buzzer for 5 seconds
      buzzerActive = true;
      buzzerStartTime = millis();
      digitalWrite(BUZZER, HIGH);
      
      // Rapid red LED flash
      setLedState(LED_EMERGENCY);
    }
  }

  http.end();
}

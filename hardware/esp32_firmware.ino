/* ============================================================
 *  GuardWell ESP32 Firmware — DEV-002
 *  Edge Impulse Voice Recognition + Sensors
 * ============================================================
 *
 *  Voice Recognition: Edge Impulse (GuardWell_inferencing)
 *    - Keywords: "help" [0], "tulong" [1], noise/background [2+]
 *    - Multi-tier detection: confidence → dominance → voting → cooldown
 *    - I2S legacy driver on port 1 (compatible with Edge Impulse SDK)
 *
 *  Sensors: DHT22, MPU6050, GPS NEO-M8N
 *  Actuators: RGB LED, Buzzer, Touch Sensor
 *
 *  Board: ESP32 Arduino Core 2.x
 *  Required library: GuardWell_inferencing (install via Arduino)
 * ============================================================ */

// Save 10 KB RAM on devices with limited flash
#define EIDSP_QUANTIZE_FILTERBANK   0

/* ---------- Includes ---------------------------------------- */
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "DHT.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include <math.h>
#include <TinyGPS++.h>

// Edge Impulse
#include <GuardWell_inferencing.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/i2s.h"

// ============================================
// CONFIGURATION — DEV-001
// ============================================
const char* WIFI_SSID = "infi";
const char* WIFI_PASSWORD = "12345678";
const char* SERVER_URL = "https://guardwell.onrender.com/api/sensors/data";
const char* NUDGE_URL  = "https://guardwell.onrender.com/api/sensors/nudge/DEV-001";
const char* NUDGE_ACK  = "https://guardwell.onrender.com/api/sensors/nudge/DEV-001/ack";
const char* EMERGENCY_BUZZER_URL = "https://guardwell.onrender.com/api/sensors/emergency-buzzer/DEV-001";
const char* EMERGENCY_BUZZER_ACK_URL = "https://guardwell.onrender.com/api/sensors/emergency-buzzer/DEV-001/ack";
const char* DEVICE_ID = "DEV-001";

// Geofence
const float FACILITY_LAT = 14.705493;
const float FACILITY_LON = 121.034774;
const float GEOFENCE_RADIUS_METERS = 100.0;

// ============================================
// PINS
// ============================================
#define DHTPIN      4
#define DHTTYPE     DHT22
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

// GPS (UART - Serial2)
#define GPS_RX      16  // ESP32 receives from GPS TX
#define GPS_TX      17  // ESP32 sends to GPS RX

// ============================================
// OBJECTS
// ============================================
DHT dht(DHTPIN, DHTTYPE);
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;

// ============================================
// EDGE IMPULSE — TUNING
// ============================================
#define CONFIDENCE_THRESHOLD   0.85f
#define VOTES_REQUIRED         3
#define DOMINANCE_MARGIN       0.10f
#define EI_COOLDOWN_MS         3000UL
#define EI_HOLD_MS             2500UL

// ============================================
// EDGE IMPULSE — AUDIO BUFFERS & STATE
// ============================================
typedef struct {
    signed short *buffers[2];
    unsigned char  buf_select;
    unsigned char  buf_ready;
    unsigned int   buf_count;
    unsigned int   n_samples;
} inference_t;

static inference_t      inference;
static const uint32_t   ei_sample_buffer_size = 1024;
static signed short     eiSampleBuffer[ei_sample_buffer_size];
static bool             debug_nn          = false;
static int              ei_print_counter  = -(EI_CLASSIFIER_SLICES_PER_MODEL_WINDOW);
static bool             ei_record_status  = true;

// Detection state
static int           eiLastDetected   = -1;
static unsigned long eiLedHoldUntil   = 0;
static unsigned long eiCooldownUntil  = 0;
static int           eiHelpVotes      = 0;
static int           eiTulongVotes    = 0;

// Flag: EI inference task sets this when a keyword is confirmed
static volatile bool eiHelpDetected   = false;
static volatile bool eiTulongDetected = false;

// ============================================
// VARIABLES
// ============================================
bool buzzerActive = false;
unsigned long buzzerStartTime = 0;
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 2000;
bool mpuConnected = false;
bool gpsConnected = false;

// ============================================
// P2P EMERGENCY BUZZER STATE
// Set by checkForEmergencyBuzzer() when a peer device triggers an emergency.
// Cleared ONLY when this device's touch sensor is touched (acknowledgeEmergencyBuzzer()).
// ============================================
bool emergencyBuzzerActive = false;   // True while peer emergency buzzer is active
static bool emBuzzerOn = false;       // Current buzzer pin state (for pulsing)
static unsigned long emBuzzerLastToggle = 0; // Timing for pulse pattern

String lastVoiceCommand = "none";
bool voiceAlertTriggered = false;
bool soundAlertTriggered = false;

// Flat orientation detection (possible fall / incapacitation)
int flatConsecutiveCount = 0;
const int FLAT_CONSECUTIVE_THRESHOLD = 3;  // ~6 seconds at 2s interval
bool flatAlertSent = false;

// GPS coordinates — updated from real NEO-M8N data only
float currentLat = 0.0;
float currentLon = 0.0;
bool gpsValid = false;  // stays false until GPS gets a real fix

// ============================================
// RGB LED STATE MACHINE
// ============================================
enum LEDState {
  LED_IDLE,       // Green steady - connected, normal
  LED_SENDING,    // Red blink - sending data
  LED_NUDGE,      // Blue blink - received nudge from website
  LED_EMERGENCY,  // Rapid red flash - SOS active
  LED_GEOFENCE,   // Purple (red+blue) - geofence violation
  LED_GPS_WAIT    // Yellow (red+green) - GPS acquiring
};

LEDState currentLedState = LED_IDLE;
unsigned long ledStateStart = 0;
unsigned long ledBlinkTimer = 0;
bool ledBlinkOn = false;
int ledBlinkCount = 0;
const int NUDGE_BLINK_CYCLES = 10;
bool nudgeActive = false;
bool nudgePending = false;
bool insideGeofence = true;
unsigned long lastGeofenceCheck = 0;

// ============================================
// FORWARD DECLARATIONS — Edge Impulse I2S
// ============================================
static void audio_inference_callback(uint32_t n_bytes);
static void capture_samples(void *arg);
static bool microphone_inference_start(uint32_t n_samples);
static bool microphone_inference_record(void);
static int  microphone_audio_signal_get_data(size_t offset, size_t length, float *out_ptr);
static void microphone_inference_end(void);
static int  i2s_init(uint32_t sampling_rate);
static int  i2s_deinit(void);

// ============================================
// FORWARD DECLARATIONS — Firmware functions
// ============================================
void setRGB(bool r, bool g, bool b);
void setLedState(LEDState newState);
void handleLEDEffects();
void triggerAlert(int duration);
void sendVoiceAlert(String alertType);
void handleEmergencyBuzzerPulse();
void acknowledgeEmergencyBuzzer();

// ============================================
// EDGE IMPULSE — INFERENCE TASK (runs on core 0)
// Continuously reads audio and runs classifier
// ============================================
void eiInferenceTask(void *param) {
  ei_printf("[EI] Inference task started on core %d\n", xPortGetCoreID());
  ei_printf("[EI] Free heap: %u bytes\n", ESP.getFreeHeap());

  // Wait for the first audio buffer to be fully captured before running classifier
  ei_printf("[EI] Waiting for first audio buffer...\n");
  while (inference.buf_ready == 0) {
    vTaskDelay(pdMS_TO_TICKS(10));
  }
  inference.buf_ready = 0;
  ei_printf("[EI] First buffer ready — free heap: %u bytes\n", ESP.getFreeHeap());
  ei_printf("[EI] Starting inference loop\n");

  while (true) {
    // 1. Record the next audio slice
    if (!microphone_inference_record()) {
      ei_printf("[EI-ERR] Failed to record audio slice\n");
      vTaskDelay(pdMS_TO_TICKS(100));
      continue;
    }

    // 2. Prepare signal descriptor
    signal_t signal;
    signal.total_length = EI_CLASSIFIER_SLICE_SIZE;
    signal.get_data     = &microphone_audio_signal_get_data;

    // 3. Run classifier
    ei_impulse_result_t result = {0};
    EI_IMPULSE_ERROR r = run_classifier_continuous(&signal, &result, debug_nn);
    if (r != EI_IMPULSE_OK) {
      ei_printf("[EI-ERR] Classifier failed (%d) — heap: %u\n", r, ESP.getFreeHeap());
      vTaskDelay(pdMS_TO_TICKS(200));
      continue;
    }

    // 4. Multi-tier detection logic
    float confHelp   = result.classification[0].value;
    float confTulong = result.classification[1].value;

    // A) Find best & second-best across ALL classes
    int   bestIdx  = 0;
    float bestConf = 0.0f;
    for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
      if (result.classification[ix].value > bestConf) {
        bestConf = result.classification[ix].value;
        bestIdx  = (int)ix;
      }
    }
    float secondConf = 0.0f;
    for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
      if ((int)ix == bestIdx) continue;
      if (result.classification[ix].value > secondConf)
        secondConf = result.classification[ix].value;
    }
    float lead = bestConf - secondConf;

    // B) Threshold + dominance
    bool helpDominant   = (bestIdx == 0) && (bestConf >= CONFIDENCE_THRESHOLD)
                                         && (lead     >= DOMINANCE_MARGIN);
    bool tulongDominant = (bestIdx == 1) && (bestConf >= CONFIDENCE_THRESHOLD)
                                         && (lead     >= DOMINANCE_MARGIN);

    // C) Cooldown guard
    bool inCooldown = (millis() < eiCooldownUntil);
    if (inCooldown) {
      eiHelpVotes   = 0;
      eiTulongVotes = 0;
    }

    // D) Vote accumulation
    if (!inCooldown) {
      if (helpDominant) {
        eiHelpVotes++;
        eiTulongVotes = 0;
      } else if (tulongDominant) {
        eiTulongVotes++;
        eiHelpVotes   = 0;
      } else {
        eiHelpVotes   = 0;
        eiTulongVotes = 0;
      }
    }

    // E) Fire when votes threshold reached
    if (!inCooldown && eiHelpVotes >= VOTES_REQUIRED) {
      ei_printf(">>> HELP CONFIRMED! conf=%.2f lead=%.2f votes=%d\n",
                bestConf, lead, eiHelpVotes);
      eiHelpVotes     = 0;
      eiTulongVotes   = 0;
      eiLastDetected  = 0;
      eiLedHoldUntil  = millis() + EI_HOLD_MS;
      eiCooldownUntil = millis() + EI_COOLDOWN_MS;
      eiHelpDetected  = true;   // Signal to main loop
    }
    else if (!inCooldown && eiTulongVotes >= VOTES_REQUIRED) {
      ei_printf(">>> TULONG CONFIRMED! conf=%.2f lead=%.2f votes=%d\n",
                bestConf, lead, eiTulongVotes);
      eiHelpVotes     = 0;
      eiTulongVotes   = 0;
      eiLastDetected  = 1;
      eiLedHoldUntil  = millis() + EI_HOLD_MS;
      eiCooldownUntil = millis() + EI_COOLDOWN_MS;
      eiTulongDetected = true;  // Signal to main loop
    }
    else {
      if (millis() > eiLedHoldUntil) {
        eiLastDetected = -1;
      }
      // Vote progress debug
      if ((eiHelpVotes > 0 || eiTulongVotes > 0) && !inCooldown) {
        ei_printf("[VOTE] help=%d/%d (%.2f)  tulong=%d/%d (%.2f)  2nd=%.2f lead=%.2f\n",
                  eiHelpVotes,   VOTES_REQUIRED, confHelp,
                  eiTulongVotes, VOTES_REQUIRED, confTulong,
                  secondConf, lead);
      }
    }

    // Periodic full results print
    if (++ei_print_counter >= (EI_CLASSIFIER_SLICES_PER_MODEL_WINDOW)) {
      ei_printf("[%6lu ms] DSP:%d ms  Class:%d ms  Anomaly:%d ms%s\n",
                millis(),
                result.timing.dsp,
                result.timing.classification,
                result.timing.anomaly,
                inCooldown ? "  *** COOLDOWN ***" : "");

      for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
        ei_printf("  [%d] %-10s %.4f%s\n",
                  (int)ix,
                  result.classification[ix].label,
                  result.classification[ix].value,
                  result.classification[ix].value >= CONFIDENCE_THRESHOLD ? " <<" : "");
      }
#if EI_CLASSIFIER_HAS_ANOMALY == 1
      ei_printf("    anomaly score: ");
      ei_printf_float(result.anomaly);
      ei_printf("\n");
#endif
      ei_printf("\n");
      ei_print_counter = 0;
    }
  }
}

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("\n========================================");
  Serial.println(" GuardWell ESP32 — DEV-001");
  Serial.println(" Edge Impulse Voice Recognition");
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
  digitalWrite(BUZZER, LOW);
  setRGB(0, 0, 0);

  // === 1. GPS (UART Serial2) ===
  Serial.print("[1/4] GPS NEO-M8N... ");
  Serial2.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  delay(500);

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

  // === 2. I2C Bus + MPU6050 ===
  Wire.begin(I2C_SDA, I2C_SCL);
  delay(100);

  Serial.print("[2/4] MPU6050 (I2C)... ");
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

  // === 3. DHT ===
  Serial.print("[3/4] DHT Sensor... ");
  dht.begin();
  delay(2000);
  float testTemp = dht.readTemperature();
  if (isnan(testTemp)) {
    Serial.println("❌");
  } else {
    Serial.printf("✅ %.1f°C\n", testTemp);
  }

  // === 4. WiFi ===
  Serial.print("[4/4] WiFi... ");
  connectToWiFi();

  // === Edge Impulse — Init ===
  Serial.println("\n[EI] Initializing Edge Impulse...");
  ei_printf("     Interval : "); ei_printf_float((float)EI_CLASSIFIER_INTERVAL_MS); ei_printf(" ms\n");
  ei_printf("     Frame sz : %d samples\n", EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE);
  ei_printf("     Classes  : %d\n", sizeof(ei_classifier_inferencing_categories) /
                                    sizeof(ei_classifier_inferencing_categories[0]));
  ei_printf("     Threshold: %.2f  Margin: %.2f  Votes: %d\n",
            CONFIDENCE_THRESHOLD, DOMINANCE_MARGIN, VOTES_REQUIRED);

  run_classifier_init();

  if (microphone_inference_start(EI_CLASSIFIER_SLICE_SIZE) == false) {
    ei_printf("[ERR] Could not allocate audio buffer (size %d)\r\n",
              EI_CLASSIFIER_RAW_SAMPLE_COUNT);
    while (true) {
      setRGB(1, 0, 0); delay(200); setRGB(0, 0, 0); delay(200);
    }
  }

  // Launch EI inference on core 0 (main loop runs on core 1)
  xTaskCreatePinnedToCore(eiInferenceTask, "EI_Inference",
                          1024 * 16, NULL, 8, NULL, 0);

  Serial.println("\n✅ Setup complete!");
  Serial.println("📡 GPS acquiring satellites...");
  Serial.println("🎤 Edge Impulse listening...");
  Serial.println("💡 RGB LED active\n");

  setLedState(gpsValid ? LED_IDLE : LED_GPS_WAIT);
}

// ============================================
// LOOP (runs on core 1 — sensors, WiFi, GPS)
// ============================================
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  handleTouchSensor();

  // Check for EI voice detections (set by inference task on core 0)
  if (eiHelpDetected) {
    eiHelpDetected = false;
    lastVoiceCommand = "help";
    voiceAlertTriggered = true;
    soundAlertTriggered = true;

    Serial.println("\n🎤 ============================================");
    Serial.println("🎤  KEYWORD DETECTED: HELP");
    Serial.println("🎤 ============================================\n");

    setLedState(LED_EMERGENCY);
    triggerAlert(800);
    sendVoiceAlert("help");
  }

  if (eiTulongDetected) {
    eiTulongDetected = false;
    lastVoiceCommand = "tulong";
    voiceAlertTriggered = true;
    soundAlertTriggered = true;

    Serial.println("\n🎤 ============================================");
    Serial.println("🎤  KEYWORD DETECTED: TULONG");
    Serial.println("🎤 ============================================\n");

    setLedState(LED_EMERGENCY);
    triggerAlert(800);
    sendVoiceAlert("tulong");
  }

  if (gpsConnected) {
    handleGPS();
  }

  handleLEDEffects();
  handleEmergencyBuzzerPulse();  // Drive the persistent P2P emergency buzzer pulse

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

    setLedState(LED_SENDING);
    readAndSendSensorData();

    checkForNudge();
    checkForEmergencyBuzzer();

    // LED priority: peer emergency > nudge > geofence > GPS wait > idle
    if (emergencyBuzzerActive) {
      setLedState(LED_EMERGENCY);
    } else if (nudgeActive) {
      // Nudge blink takes priority (handled in handleLEDEffects)
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
// TOUCH SENSOR
// Priority order (highest to lowest):
//   1. Peer emergency buzzer active  → ACK it (dismiss peer alert)
//   2. Nudge pending                 → ACK nudge
//   3. No pending alerts             → Trigger own emergency
// ============================================
void handleTouchSensor() {
  if (digitalRead(TOUCHPIN) != HIGH) return;

  // ── Priority 1: Dismiss peer emergency buzzer ──────────────────
  if (emergencyBuzzerActive) {
    emergencyBuzzerActive = false;
    emBuzzerOn = false;
    digitalWrite(BUZZER, LOW);
    setLedState(LED_IDLE);
    Serial.println("\n✅ ========================================");
    Serial.println("✅  P2P EMERGENCY ACKNOWLEDGED by touch");
    Serial.println("✅ ========================================\n");
    acknowledgeEmergencyBuzzer();
    return;
  }

  // ── Priority 2: Acknowledge a nudge ───────────────────────────
  if (nudgePending && !buzzerActive) {
    buzzerActive = true;
    buzzerStartTime = millis();
    nudgePending = false;
    nudgeActive = false;
    Serial.println("✅ NUDGE ACKNOWLEDGED by touch sensor");

    flatConsecutiveCount = 0;
    flatAlertSent = false;

    digitalWrite(BUZZER, HIGH);
    setRGB(0, 1, 0);
    delay(300);
    digitalWrite(BUZZER, LOW);
    setLedState(LED_IDLE);

    acknowledgeNudge();
    return;
  }

  // ── Priority 3: Trigger own emergency ─────────────────────────
  if (!buzzerActive) {
    buzzerActive = true;
    buzzerStartTime = millis();
    digitalWrite(BUZZER, HIGH);
    setLedState(LED_EMERGENCY);
    Serial.println("🚨 EMERGENCY!");

    flatConsecutiveCount = 0;
    flatAlertSent = false;

    sendEmergencyAlert();
    delay(1000);
  }
}

// ============================================
// ALERT HELPER
// ============================================
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

  float ax=0, ay=0, az=0, gx=0, gy=0, gz=0;
  bool fallDetected = false;
  bool flatOrientationAlert = false;

  if (mpuConnected) {
    sensors_event_t a, g, t;
    mpu.getEvent(&a, &g, &t);
    ax = a.acceleration.x; ay = a.acceleration.y; az = a.acceleration.z;
    gx = g.gyro.x; gy = g.gyro.y; gz = g.gyro.z;
    if (sqrt(ax*ax + ay*ay + az*az) > 25.0) fallDetected = true;

    // Flat orientation detection
    float absX = fabs(ax), absY = fabs(ay), absZ = fabs(az);
    float gyroMag = sqrt(gx*gx + gy*gy + gz*gz);
    bool isFlat = (absZ > absX && absZ > absY);
    bool isStationary = (gyroMag < 5.0);

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

        setLedState(LED_EMERGENCY);
        triggerAlert(1500);
        sendFlatOrientationAlert();
      }

      if (flatAlertSent) {
        flatOrientationAlert = true;
      }
    } else {
      if (flatConsecutiveCount > 0) {
        Serial.println("[FLAT] Orientation changed — counter reset");
      }
      flatConsecutiveCount = 0;
      flatAlertSent = false;
    }
  }

  // Status output
  Serial.printf("T:%.1f H:%.1f ", temp, hum);
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
  doc["gas_level"] = 0;  // MQ2 removed
  doc["voice_command"] = lastVoiceCommand;
  doc["voice_alert"] = voiceAlertTriggered;
  if (soundAlertTriggered) {
    doc["alert_type"] = lastVoiceCommand;  // "help" or "tulong"
    soundAlertTriggered = false;
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

  switch (newState) {
    case LED_IDLE:       setRGB(0, 1, 0); break;
    case LED_SENDING:    setRGB(1, 0, 0); break;
    case LED_NUDGE:      setRGB(0, 0, 1); break;
    case LED_EMERGENCY:  setRGB(1, 0, 0); break;
    case LED_GEOFENCE:   setRGB(1, 0, 1); break;
    case LED_GPS_WAIT:   setRGB(1, 1, 0); break;
  }
}

void handleLEDEffects() {
  unsigned long now = millis();

  switch (currentLedState) {
    case LED_IDLE:
      break;

    case LED_SENDING:
      if (now - ledBlinkTimer >= 100) {
        ledBlinkTimer = now;
        ledBlinkOn = !ledBlinkOn;
        setRGB(ledBlinkOn, 0, 0);
      }
      break;

    case LED_NUDGE:
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
      if (now - ledBlinkTimer >= 80) {
        ledBlinkTimer = now;
        ledBlinkOn = !ledBlinkOn;
        setRGB(ledBlinkOn, 0, 0);
      }
      if (now - ledStateStart >= 10000) {
        setLedState(LED_IDLE);
      }
      break;

    case LED_GEOFENCE:
      if (now - ledBlinkTimer >= 500) {
        ledBlinkTimer = now;
        ledBlinkOn = !ledBlinkOn;
        setRGB(ledBlinkOn, 0, ledBlinkOn);
      }
      break;

    case LED_GPS_WAIT:
      if (now - ledBlinkTimer >= 1000) {
        ledBlinkTimer = now;
        ledBlinkOn = !ledBlinkOn;
        setRGB(ledBlinkOn, ledBlinkOn, 0);
      }
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
      Serial.println("   → Tap touch sensor to acknowledge (touch = ack, NOT emergency)");

      nudgeActive = true;
      nudgePending = true;
      setLedState(LED_NUDGE);
      triggerAlert(200);
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
// Persistent state: stays active until touch ACK clears it.
// The 2-second poll interval is shorter than any auto-off timer,
// so as long as the server returns buzzer:true the buzzer keeps going.
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
      if (!emergencyBuzzerActive) {
        // First detection — log details
        String sourceDevice = doc["sourceDevice"] | "unknown";
        String workerName   = doc["workerName"]   | "Unknown";
        String alertType    = doc["type"]         | "Emergency";

        Serial.println("\n🚨 ========================================");
        Serial.printf("🚨  P2P EMERGENCY from %s (%s)\n", sourceDevice.c_str(), workerName.c_str());
        Serial.printf("🚨  Type: %s\n", alertType.c_str());
        Serial.println("🚨  ⚠️  TOUCH SENSOR to acknowledge and stop buzzer");
        Serial.println("🚨 ========================================\n");
      }
      // Keep state alive — buzzer pulsing handled by handleEmergencyBuzzerPulse()
      emergencyBuzzerActive = true;
      setLedState(LED_EMERGENCY);
    } else {
      // Server cleared the buzzer (ACK from dashboard or expiry)
      if (emergencyBuzzerActive) {
        emergencyBuzzerActive = false;
        emBuzzerOn = false;
        digitalWrite(BUZZER, LOW);
        setLedState(LED_IDLE);
        Serial.println("✅ Emergency buzzer cleared by server");
      }
    }
  }

  http.end();
}

// ============================================
// P2P BUZZER PULSE DRIVER
// Called every loop() iteration.
// Pattern: 200 ms ON / 300 ms OFF (urgent, distinct from nudge)
// ============================================
void handleEmergencyBuzzerPulse() {
  if (!emergencyBuzzerActive) return;

  unsigned long now = millis();
  unsigned long interval = emBuzzerOn ? 200UL : 300UL;  // ON shorter than OFF

  if (now - emBuzzerLastToggle >= interval) {
    emBuzzerLastToggle = now;
    emBuzzerOn = !emBuzzerOn;
    digitalWrite(BUZZER, emBuzzerOn ? HIGH : LOW);
  }
}

// ============================================
// EMERGENCY BUZZER ACK (Device → Server)
// Sends acknowledgment after touch sensor dismisses the peer buzzer.
// ============================================
void acknowledgeEmergencyBuzzer() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, EMERGENCY_BUZZER_ACK_URL);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST("{}");
  Serial.printf("[Emergency Buzzer ACK: %d]\n", httpCode);
  http.end();
}

// ============================================
// EDGE IMPULSE — I2S AUDIO INFRASTRUCTURE
// (Legacy driver API on port 1 — required by EI SDK)
// ============================================

static void audio_inference_callback(uint32_t n_bytes) {
  for (int i = 0; i < (int)(n_bytes >> 1); i++) {
    inference.buffers[inference.buf_select][inference.buf_count++] = eiSampleBuffer[i];

    if (inference.buf_count >= inference.n_samples) {
      inference.buf_select ^= 1;
      inference.buf_count   = 0;
      inference.buf_ready   = 1;
    }
  }
}

static void capture_samples(void *arg) {
  const int32_t i2s_bytes_to_read = (uint32_t)arg;
  size_t bytes_read = i2s_bytes_to_read;

  while (ei_record_status) {
    i2s_read((i2s_port_t)1, (void *)eiSampleBuffer,
             i2s_bytes_to_read, &bytes_read, 100);

    if (bytes_read <= 0) {
      ei_printf("[I2S] Read error: %d\n", (int)bytes_read);
    } else {
      if (bytes_read < (size_t)i2s_bytes_to_read) {
        ei_printf("[I2S] Partial read (%d / %d)\n",
                  (int)bytes_read, (int)i2s_bytes_to_read);
      }

      // Amplify — INMP441 output can be quiet
      for (int x = 0; x < (int)(i2s_bytes_to_read / 2); x++) {
        eiSampleBuffer[x] = (int16_t)(eiSampleBuffer[x]) * 8;
      }

      if (ei_record_status) {
        audio_inference_callback(i2s_bytes_to_read);
      } else {
        break;
      }
    }
  }
  vTaskDelete(NULL);
}

static bool microphone_inference_start(uint32_t n_samples) {
  inference.buffers[0] = (signed short *)malloc(n_samples * sizeof(signed short));
  if (inference.buffers[0] == NULL) { return false; }

  inference.buffers[1] = (signed short *)malloc(n_samples * sizeof(signed short));
  if (inference.buffers[1] == NULL) { ei_free(inference.buffers[0]); return false; }

  // Zero-initialize to prevent MFCC null-check failures on first run
  memset(inference.buffers[0], 0, n_samples * sizeof(signed short));
  memset(inference.buffers[1], 0, n_samples * sizeof(signed short));

  inference.buf_select = 0;
  inference.buf_count  = 0;
  inference.n_samples  = n_samples;
  inference.buf_ready  = 0;

  if (i2s_init(EI_CLASSIFIER_FREQUENCY)) {
    ei_printf("[I2S] Init failed!\n");
  }

  ei_sleep(100);
  ei_record_status = true;

  xTaskCreate(capture_samples, "CaptureSamples",
              1024 * 4, (void *)(uintptr_t)ei_sample_buffer_size, 10, NULL);

  return true;
}

static bool microphone_inference_record(void) {
  if (inference.buf_ready == 1) {
    ei_printf("[WARN] Buffer overrun — stale slice discarded\n");
    inference.buf_ready = 0;
  }

  while (inference.buf_ready == 0) {
    delay(1);
  }
  inference.buf_ready = 0;
  return true;
}

static int microphone_audio_signal_get_data(size_t offset, size_t length, float *out_ptr) {
  numpy::int16_to_float(
      &inference.buffers[inference.buf_select ^ 1][offset],
      out_ptr,
      length);
  return 0;
}

static void microphone_inference_end(void) {
  i2s_deinit();
  ei_free(inference.buffers[0]);
  ei_free(inference.buffers[1]);
}

static int i2s_init(uint32_t sampling_rate) {
  i2s_config_t i2s_config = {
      .mode             = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX | I2S_MODE_TX),
      .sample_rate      = sampling_rate,
      .bits_per_sample  = (i2s_bits_per_sample_t)16,
      .channel_format   = I2S_CHANNEL_FMT_ONLY_LEFT,
      .communication_format = I2S_COMM_FORMAT_I2S,
      .intr_alloc_flags = 0,
      .dma_buf_count    = 8,
      .dma_buf_len      = 512,
      .use_apll         = false,
      .tx_desc_auto_clear = false,
      .fixed_mclk       = -1,
  };

  i2s_pin_config_t pin_config = {
      .bck_io_num   = I2S_SCK,
      .ws_io_num    = I2S_WS,
      .data_out_num = I2S_PIN_NO_CHANGE,
      .data_in_num  = I2S_SD,
  };

  esp_err_t ret = 0;

  ret = i2s_driver_install((i2s_port_t)1, &i2s_config, 0, NULL);
  if (ret != ESP_OK) { ei_printf("[I2S] Driver install failed: %d\n", ret); return (int)ret; }

  ret = i2s_set_pin((i2s_port_t)1, &pin_config);
  if (ret != ESP_OK) { ei_printf("[I2S] Set pin failed: %d\n", ret); return (int)ret; }

  ret = i2s_zero_dma_buffer((i2s_port_t)1);
  if (ret != ESP_OK) { ei_printf("[I2S] DMA zero failed: %d\n", ret); return (int)ret; }

  return int(ret);
}

static int i2s_deinit(void) {
  i2s_driver_uninstall((i2s_port_t)1);
  return 0;
}

// ============================================
// SAFETY CHECK — ensure correct model type
// ============================================
#if !defined(EI_CLASSIFIER_SENSOR) || EI_CLASSIFIER_SENSOR != EI_CLASSIFIER_SENSOR_MICROPHONE
#error "This sketch requires a microphone-based Edge Impulse model."
#endif

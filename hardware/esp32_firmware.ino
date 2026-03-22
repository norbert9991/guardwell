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

// ============================================
// CONFIGURATION
// ============================================
const char* WIFI_SSID = "infi";
const char* WIFI_PASSWORD = "12345678";
const char* SERVER_URL = "https://guardwell.onrender.com/api/sensors/data";
const char* NUDGE_URL  = "https://guardwell.onrender.com/api/sensors/nudge/DEV-001";
const char* NUDGE_ACK  = "https://guardwell.onrender.com/api/sensors/nudge/DEV-001/ack";
const char* EMERGENCY_BUZZER_URL = "https://guardwell.onrender.com/api/sensors/emergency-buzzer/DEV-001";
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
// INMP441 Sound Classification (replaces DFRobot Voice Sensor)
// FFT parameters
#define FFT_SIZE       256
#define SAMPLE_RATE    16000
#define HALF_FFT       (FFT_SIZE / 2)

// Audio buffers
int16_t i2sBuffer[FFT_SIZE];
float vReal[FFT_SIZE];
float vImag[FFT_SIZE];
float magnitudes[HALF_FFT];

// Hann window (precomputed in setup)
float hannWindow[FFT_SIZE];

// --- TUNABLE THRESHOLDS ---
// Adjust these for your specific industrial environment!
// Current: HIGH SENSITIVITY for detecting human voice at a distance
float VOICE_BAND_RATIO_THRESHOLD = 0.30;  // Min ratio of voice-band energy to total (lower = more sensitive)
float SFM_THRESHOLD              = 0.50;  // Max spectral flatness for human voice (higher = more sensitive)
float RMS_THRESHOLD              = 200.0; // Min RMS amplitude to consider (lower = picks up quieter sounds)
float ONSET_THRESHOLD            = 1.0;   // Effectively disabled — spectral features (SFM+BandR) handle classification
unsigned long DETECTION_COOLDOWN = 3000;  // Cooldown between detections (ms)

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
  LED_GPS_WAIT    // Yellow (red+green) - GPS acquiring
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
  Serial.println(" GuardWell ESP32 (INMP441 + FFT)");
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
    // Precompute Hann window
    for (int i = 0; i < FFT_SIZE; i++) {
      hannWindow[i] = 0.5 * (1.0 - cos(2.0 * PI * i / (FFT_SIZE - 1)));
    }
    Serial.printf("     FFT: %d pts @ %d Hz, Nyquist: %d Hz\n", FFT_SIZE, SAMPLE_RATE, SAMPLE_RATE / 2);
    Serial.printf("     Thresholds: BandRatio>%.2f, SFM<%.2f, RMS>%.0f\n",
                  VOICE_BAND_RATIO_THRESHOLD, SFM_THRESHOLD, RMS_THRESHOLD);
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
  chan_cfg.dma_frame_num = FFT_SIZE;

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
// SIMPLE RADIX-2 FFT (in-place, no library needed)
// ============================================
void fftRadix2(float* real, float* imag, int n) {
  // Bit-reversal permutation
  int j = 0;
  for (int i = 1; i < n - 1; i++) {
    int bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      float tempR = real[i]; real[i] = real[j]; real[j] = tempR;
      float tempI = imag[i]; imag[i] = imag[j]; imag[j] = tempI;
    }
  }

  // Cooley-Tukey butterfly
  for (int len = 2; len <= n; len <<= 1) {
    float angle = -2.0 * PI / len;
    float wR = cos(angle);
    float wI = sin(angle);
    for (int i = 0; i < n; i += len) {
      float curR = 1.0, curI = 0.0;
      for (int k = 0; k < len / 2; k++) {
        float uR = real[i + k];
        float uI = imag[i + k];
        float vR = real[i + k + len/2] * curR - imag[i + k + len/2] * curI;
        float vI = real[i + k + len/2] * curI + imag[i + k + len/2] * curR;
        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;
        real[i + k + len/2] = uR - vR;
        imag[i + k + len/2] = uI - vI;
        float newCurR = curR * wR - curI * wI;
        float newCurI = curR * wI + curI * wR;
        curR = newCurR;
        curI = newCurI;
      }
    }
  }
}

// ============================================
// SOUND CLASSIFICATION (replaces Voice Recognition)
// Distinguishes human voice from machinery noise
// using spectral analysis (FFT) on INMP441 audio
// ============================================
void handleSoundDetection() {
  // Read audio samples from INMP441 (new standard API)
  size_t bytesIn = 0;
  esp_err_t result = i2s_channel_read(i2s_rx_handle, i2sBuffer, sizeof(i2sBuffer), &bytesIn, 100);
  if (result != ESP_OK || bytesIn == 0) return;

  int samplesRead = bytesIn / sizeof(int16_t);
  if (samplesRead < FFT_SIZE) return;

  // --- 1. Compute RMS amplitude ---
  float sumSquares = 0;
  for (int i = 0; i < FFT_SIZE; i++) {
    float sample = (float)i2sBuffer[i];
    sumSquares += sample * sample;
  }
  float rms = sqrt(sumSquares / FFT_SIZE);

  // Update baseline RMS (slow-moving average of ambient noise)
  if (baselineRMS < 1.0) {
    baselineRMS = rms;  // Initialize on first frame
  } else {
    baselineRMS = baselineRMS * 0.98 + rms * 0.02;  // Slow adaptation
  }

  // Skip analysis if too quiet (below noise floor)
  if (rms < RMS_THRESHOLD) {
    return;
  }

  // --- 2. Apply Hann window and prepare FFT input ---
  for (int i = 0; i < FFT_SIZE; i++) {
    vReal[i] = (float)i2sBuffer[i] * hannWindow[i];
    vImag[i] = 0.0;
  }

  // --- 3. Run FFT ---
  fftRadix2(vReal, vImag, FFT_SIZE);

  // --- 4. Compute magnitude spectrum (first half only) ---
  for (int i = 0; i < HALF_FFT; i++) {
    magnitudes[i] = sqrt(vReal[i] * vReal[i] + vImag[i] * vImag[i]);
  }

  // --- 5. Calculate voice-band energy ratio ---
  // Voice fundamental: 300 Hz - 3400 Hz
  // Bin index = frequency * FFT_SIZE / SAMPLE_RATE
  int voiceBinLow  = (int)(300.0  * FFT_SIZE / SAMPLE_RATE); // ~5
  int voiceBinHigh = (int)(3400.0 * FFT_SIZE / SAMPLE_RATE); // ~54
  
  float voiceBandEnergy = 0;
  float totalEnergy = 0;
  for (int i = 1; i < HALF_FFT; i++) {  // Skip DC bin
    float energy = magnitudes[i] * magnitudes[i];
    totalEnergy += energy;
    if (i >= voiceBinLow && i <= voiceBinHigh) {
      voiceBandEnergy += energy;
    }
  }
  
  float voiceBandRatio = (totalEnergy > 0) ? (voiceBandEnergy / totalEnergy) : 0;

  // --- 6. Calculate Spectral Flatness Measure (SFM) ---
  // SFM = geometric_mean / arithmetic_mean
  // Human voice → low SFM (tonal, peaked)
  // Machinery → high SFM (noise-like, flat)
  float logSum = 0;
  float arithmeticSum = 0;
  int validBins = 0;
  
  for (int i = voiceBinLow; i <= voiceBinHigh && i < HALF_FFT; i++) {
    if (magnitudes[i] > 0.001) {
      logSum += log(magnitudes[i]);
      arithmeticSum += magnitudes[i];
      validBins++;
    }
  }
  
  float sfm = 1.0; // Default to noise-like
  if (validBins > 0 && arithmeticSum > 0) {
    float geometricMean = exp(logSum / validBins);
    float arithmeticMean = arithmeticSum / validBins;
    sfm = geometricMean / arithmeticMean;
  }

  // --- 7. Onset detection (amplitude burst vs baseline) ---
  float onsetRatio = (baselineRMS > 1.0) ? (rms / baselineRMS) : 1.0;

  // --- 8. Decision logic ---
  bool isHumanSound = (voiceBandRatio > VOICE_BAND_RATIO_THRESHOLD) &&
                      (sfm < SFM_THRESHOLD) &&
                      (onsetRatio > ONSET_THRESHOLD);

  // Debug output (every analysis frame)
  static unsigned long lastDebugPrint = 0;
  if (millis() - lastDebugPrint > 500) {
    lastDebugPrint = millis();
    Serial.printf("[MIC] RMS:%.0f BL:%.0f Onset:%.1f BandR:%.2f SFM:%.3f %s\n",
                  rms, baselineRMS, onsetRatio, voiceBandRatio, sfm,
                  isHumanSound ? "<< HUMAN" : "");
  }

  // --- 9. Trigger with cooldown ---
  if (isHumanSound && (millis() - lastDetectionTime > DETECTION_COOLDOWN)) {
    lastDetectionTime = millis();

    Serial.println("\n🎤 ============================================");
    Serial.println("🎤  HUMAN SOUND DETECTED IN INDUSTRIAL ZONE!");
    Serial.printf("🎤  RMS=%.0f, BandRatio=%.2f, SFM=%.3f, Onset=%.1f\n",
                  rms, voiceBandRatio, sfm, onsetRatio);
    Serial.println("🎤 ============================================\n");

    // Activate buzzer alert
    lastVoiceCommand = "human_detected";
    voiceAlertTriggered = true;
    soundAlertTriggered = true;
    triggerAlert(800);  // 800ms buzzer burst
    sendVoiceAlert("human_distress");
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
    doc["alert_type"] = "human_distress";
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

  // Set initial color for the state
  switch (newState) {
    case LED_IDLE:       setRGB(0, 1, 0); break;  // Green
    case LED_SENDING:    setRGB(1, 0, 0); break;  // Red
    case LED_NUDGE:      setRGB(0, 0, 1); break;  // Blue
    case LED_EMERGENCY:  setRGB(1, 0, 0); break;  // Red (will flash)
    case LED_GEOFENCE:   setRGB(1, 0, 1); break;  // Purple (red+blue)
    case LED_GPS_WAIT:   setRGB(1, 1, 0); break;  // Yellow (red+green)
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

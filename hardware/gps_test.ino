/*
 * GPS CHARACTER COUNT TEST
 * 
 * WIRING:
 * GPS VCC  → ESP32 5V
 * GPS GND  → ESP32 GND
 * GPS TX   → ESP32 GPIO 26
 * GPS RX   → ESP32 GPIO 25
 */

#define GPS_RX_PIN 26  // ESP32 receives from GPS TX
#define GPS_TX_PIN 25  // ESP32 sends to GPS RX

HardwareSerial gpsSerial(1);

unsigned long totalChars = 0;
unsigned long lastPrint = 0;

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n====================================");
  Serial.println("    GPS CHARACTER COUNT TEST");
  Serial.println("====================================");
  Serial.println("Wiring:");
  Serial.println("  GPS TX  → GPIO 26");
  Serial.println("  GPS RX  → GPIO 25");
  Serial.println("====================================\n");
  
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  delay(500);
  
  Serial.println("Waiting for GPS data...\n");
}

void loop() {
  // Count characters from GPS
  while (gpsSerial.available() > 0) {
    gpsSerial.read();
    totalChars++;
  }
  
  // Print every second
  if (millis() - lastPrint >= 1000) {
    lastPrint = millis();
    
    if (totalChars > 0) {
      Serial.print("✅ GPS CHARS: ");
      Serial.println(totalChars);
    } else {
      Serial.println("❌ GPS CHARS: 0 (no data - check wiring!)");
    }
  }
}

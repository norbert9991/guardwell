/* ============================================================
 *  GuardWell — Edge Impulse LED + Buzzer Hardware Test
 *  INMP441 I2S Microphone  •  RGB LED  •  Buzzer
 * ============================================================
 *
 *  Purpose
 *  -------
 *  Standalone sketch to verify that the RGB LED and buzzer
 *  respond correctly to Edge Impulse keyword detections.
 *
 *  Wiring (ESP32)
 *  --------------
 *  INMP441   →  ESP32
 *   VDD      →  3.3 V
 *   GND      →  GND
 *   L/R      →  GND   (selects left-channel output)
 *   WS       →  GPIO 25
 *   SCK      →  GPIO 26
 *   SD       →  GPIO 32
 *
 *  RGB LED (common-cathode — HIGH = ON)
 *   RED      →  GPIO 13  (through ~220 Ω)
 *   GREEN    →  GPIO 12  (through ~220 Ω)
 *   BLUE     →  GPIO 14  (through ~220 Ω)
 *   Common   →  GND
 *
 *  Buzzer (active, 3.3 V – 5 V)
 *   +        →  GPIO 18  (through NPN transistor or direct if 3.3 V buzzer)
 *   -        →  GND
 *
 *  Classification labels (must match your Edge Impulse project)
 *   [0] = "help"
 *   [1] = "tulong"
 *   [2] = "_noise"   (or whatever background class your model uses)
 * ============================================================
 *
 *  Required library: GuardWell_inferencing  (install via Arduino)
 *  Board: ESP32 Arduino Core 2.x
 *
 * ============================================================ */

// If your target is limited in memory remove this macro to save 10K RAM
#define EIDSP_QUANTIZE_FILTERBANK   0

/*
 ** NOTE: If you run into TFLite arena allocation issue.
 **
 ** This may be due to may dynamic memory fragmentation.
 ** Try defining "-DEI_CLASSIFIER_ALLOCATION_STATIC" in boards.local.txt (create
 ** if it doesn't exist) and copy this file to
 ** `<ARDUINO_CORE_INSTALL_PATH>/arduino/hardware/<mbed_core>/<core_version>/`.
 **
 ** See
 ** (https://support.arduino.cc/hc/en-us/articles/360012076960-Where-are-the-installed-cores-located-)
 ** to find where Arduino installs cores on your machine.
 **
 ** If the problem persists then there's not enough memory for this model and application.
 */

/* ---------- Includes ---------------------------------------- */
#include <GuardWell_inferencing.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/i2s.h"

/* ---------- Pin map ----------------------------------------- */
#define RGB_RED    13
#define RGB_GREEN  12
#define RGB_BLUE   14

#define I2S_WS     25
#define I2S_SCK    26
#define I2S_SD     32

#define BUZZER_PIN 18

/* ---------- Tuning ------------------------------------------ */
//
// ── Tier 1: Minimum confidence for a class to be a candidate
//    Lowered to 0.75 so keywords can still pass when noise/faucet
//    is loud (high ambient splits confidence across all classes,
//    making 0.95 impossible to reach even for genuine speech).
//    Raise to 0.80 if false positives appear in quiet environments.
#define CONFIDENCE_THRESHOLD   0.75f

// ── Tier 2: Consecutive-window voting
//    Raised to 3 to compensate for the relaxed threshold above.
//    At ~250 ms / window: 3 votes ≈ 0.75 s of continuous speech.
//    This is the primary false-positive guard in noisy conditions.
#define VOTES_REQUIRED   3

// ── Tier 3: Dominance margin
//    Lowered to 0.10 so the keyword can still dominate even when
//    noise/faucet holds a significant score.  The extra vote above
//    compensates — a lucky single window won't fire.
//    Raise to 0.15–0.20 if noise still sneaks through after testing.
#define DOMINANCE_MARGIN  0.10f

// ── Tier 4: Post-trigger cooldown
//    After a valid detection fires, ignore ALL classifications
//    for this many milliseconds.  Prevents the same word from
//    triggering twice during a long utterance.
#define COOLDOWN_MS  4000UL

// How long (ms) the LED & buzzer stay active after a detection
#define HOLD_MS  2500UL

/* ---------- LED helpers ------------------------------------- */
inline void ledOff()                 { digitalWrite(RGB_RED,0); digitalWrite(RGB_GREEN,0); digitalWrite(RGB_BLUE,0); }
inline void ledRed()                 { digitalWrite(RGB_RED,1); digitalWrite(RGB_GREEN,0); digitalWrite(RGB_BLUE,0); }
inline void ledGreen()               { digitalWrite(RGB_RED,0); digitalWrite(RGB_GREEN,1); digitalWrite(RGB_BLUE,0); }
inline void ledBlue()                { digitalWrite(RGB_RED,0); digitalWrite(RGB_GREEN,0); digitalWrite(RGB_BLUE,1); }
inline void ledYellow()              { digitalWrite(RGB_RED,1); digitalWrite(RGB_GREEN,1); digitalWrite(RGB_BLUE,0); }
inline void ledPurple()              { digitalWrite(RGB_RED,1); digitalWrite(RGB_GREEN,0); digitalWrite(RGB_BLUE,1); }
inline void ledCyan()                { digitalWrite(RGB_RED,0); digitalWrite(RGB_GREEN,1); digitalWrite(RGB_BLUE,1); }
inline void ledWhite()               { digitalWrite(RGB_RED,1); digitalWrite(RGB_GREEN,1); digitalWrite(RGB_BLUE,1); }

/* ---------- Buzzer helpers ---------------------------------- */
/*
 *  The buzzer patterns use delay() internally.  Calling them from
 *  loop() blocks the main task for up to 600 ms, which starves the
 *  audio capture task and causes buffer overruns.
 *
 *  Fix: each pattern runs inside a short-lived FreeRTOS task so
 *  loop() returns immediately and the capture task keeps running.
 */

static void _buzzerHelpTask(void *) {
    // 3 rapid beeps — total ~600 ms
    for (int i = 0; i < 3; i++) {
        digitalWrite(BUZZER_PIN, HIGH); vTaskDelay(pdMS_TO_TICKS(120));
        digitalWrite(BUZZER_PIN, LOW);  vTaskDelay(pdMS_TO_TICKS(80));
    }
    vTaskDelete(NULL);
}

static void _buzzerTulongTask(void *) {
    // 2 medium beeps — total ~620 ms
    digitalWrite(BUZZER_PIN, HIGH); vTaskDelay(pdMS_TO_TICKS(250));
    digitalWrite(BUZZER_PIN, LOW);  vTaskDelay(pdMS_TO_TICKS(120));
    digitalWrite(BUZZER_PIN, HIGH); vTaskDelay(pdMS_TO_TICKS(250));
    digitalWrite(BUZZER_PIN, LOW);
    vTaskDelete(NULL);
}

// Launch the pattern on a background task (non-blocking)
void buzzerHelp()   { xTaskCreate(_buzzerHelpTask,   "BuzHelp",  1024, NULL, 5, NULL); }
void buzzerTulong() { xTaskCreate(_buzzerTulongTask, "BuzTulong",1024, NULL, 5, NULL); }

// Startup self-test: blocking OK because we haven't started inference yet
void beep(int durationMs) {
    digitalWrite(BUZZER_PIN, HIGH); delay(durationMs);
    digitalWrite(BUZZER_PIN, LOW);
}

/* ---------- Audio buffer ------------------------------------ */
typedef struct {
    signed short *buffers[2];
    unsigned char  buf_select;
    unsigned char  buf_ready;
    unsigned int   buf_count;
    unsigned int   n_samples;
} inference_t;

static inference_t      inference;
static const uint32_t   sample_buffer_size = 2048;
static signed short     sampleBuffer[sample_buffer_size];
static bool             debug_nn          = false; // true → print raw features
static int              print_results     = -(EI_CLASSIFIER_SLICES_PER_MODEL_WINDOW);
static bool             record_status     = true;

/* ---------- Detection state --------------------------------- */
static int           lastDetected   = -1;   // -1=none, 0=help, 1=tulong
static unsigned long ledHoldUntil   = 0;    // millis() timestamp when LED turns off
static unsigned long cooldownUntil  = 0;    // millis() timestamp when cooldown expires

// Vote counters — incremented each window the class passes threshold
// Reset to 0 the moment a different class wins (or none clears threshold)
static int  helpVotes   = 0;
static int  tulongVotes = 0;

/* ============================================================
 *  SETUP
 * ============================================================ */
void setup() {
    Serial.begin(115200);
    // comment out the below line to cancel the wait for USB connection (needed for native USB)
    while (!Serial);

    Serial.println(F("\n=============================================="));
    Serial.println(F("  GuardWell — Edge Impulse LED/Buzzer Test"));
    Serial.println(F("  INMP441 I2S  |  RGB LED  |  Buzzer"));
    Serial.println(F("=============================================="));

    /* GPIO setup */
    pinMode(RGB_RED,   OUTPUT);
    pinMode(RGB_GREEN, OUTPUT);
    pinMode(RGB_BLUE,  OUTPUT);
    pinMode(BUZZER_PIN, OUTPUT);

    ledOff();
    digitalWrite(BUZZER_PIN, LOW);

    /* Startup visual: cycle through all LED colours to confirm wiring */
    Serial.println(F("[SELF-TEST] LED colour cycle..."));
    ledRed();   delay(400);
    ledGreen(); delay(400);
    ledBlue();  delay(400);
    ledYellow();delay(400);
    ledPurple();delay(400);
    ledCyan();  delay(400);
    ledWhite(); delay(400);
    ledOff();

    /* Startup audible: two beeps to confirm buzzer */
    Serial.println(F("[SELF-TEST] Buzzer test..."));
    beep(100); delay(100); beep(100);

    /* Edge Impulse model info */
    ei_printf("\n[EI] Inferencing settings:\n");
    ei_printf("     Interval : "); ei_printf_float((float)EI_CLASSIFIER_INTERVAL_MS); ei_printf(" ms\n");
    ei_printf("     Frame sz : %d samples\n", EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE);
    ei_printf("     Raw cnt  : %d ms\n",      EI_CLASSIFIER_RAW_SAMPLE_COUNT / 16);
    ei_printf("     Classes  : %d\n", sizeof(ei_classifier_inferencing_categories) /
                                      sizeof(ei_classifier_inferencing_categories[0]));
    ei_printf("     Threshold: %.2f\n", CONFIDENCE_THRESHOLD);

    /* Initialise continuous classifier */
    run_classifier_init();

    ei_printf("\n[EI] Starting continuous inference in 2 s...\n");
    ei_sleep(2000);

    /* Allocate audio buffers & start I2S + capture task */
    if (microphone_inference_start(EI_CLASSIFIER_SLICE_SIZE) == false) {
        ei_printf("[ERR] Could not allocate audio buffer (size %d), this could be due to the window length of your model\r\n",
                  EI_CLASSIFIER_RAW_SAMPLE_COUNT);
        // Halt with rapid red flashes
        while (true) {
            ledRed(); beep(50); ledOff(); delay(200);
        }
    }

    ei_printf("[EI] Listening...\n\n");

    /* Green = ready */
    ledGreen();
}

/* ============================================================
 *  LOOP
 * ============================================================ */
void loop() {
    /* 1. Record the next audio slice */
    bool m = microphone_inference_record();
    if (!m) {
        ei_printf("[ERR] Failed to record audio slice\n");
        return;
    }

    /* 2. Prepare signal descriptor */
    signal_t signal;
    signal.total_length = EI_CLASSIFIER_SLICE_SIZE;
    signal.get_data     = &microphone_audio_signal_get_data;

    /* 3. Run classifier */
    ei_impulse_result_t result = {0};
    EI_IMPULSE_ERROR r = run_classifier_continuous(&signal, &result, debug_nn);
    if (r != EI_IMPULSE_OK) {
        ei_printf("[ERR] Classifier failed (%d)\n", r);
        return;
    }

    /* ---- 4. False-positive suppression + detection logic ---- */
    /*
     *  Label index mapping (must match your EI project order):
     *   [0] = "help"
     *   [1] = "tulong"
     *   Remaining = noise / background
     *
     *  THREE filters must all pass before an alert fires:
     *   A) Confidence  ≥ CONFIDENCE_THRESHOLD
     *   B) Dominance   leads second-best by ≥ DOMINANCE_MARGIN
     *   C) Votes       N consecutive windows agree  (VOTES_REQUIRED)
     *  Plus: post-trigger COOLDOWN_MS suppresses repeat triggers.
     */

    float confHelp   = result.classification[0].value;
    float confTulong = result.classification[1].value;

    // ── A) Find true best & second-best across ALL classes ─────
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

    // ── B) Threshold + dominance (both must pass) ──────────────
    bool helpDominant   = (bestIdx == 0) && (bestConf >= CONFIDENCE_THRESHOLD)
                                         && (lead     >= DOMINANCE_MARGIN);
    bool tulongDominant = (bestIdx == 1) && (bestConf >= CONFIDENCE_THRESHOLD)
                                         && (lead     >= DOMINANCE_MARGIN);

    // ── C) Cooldown guard — also RESET votes while cooling down ─
    bool inCooldown = (millis() < cooldownUntil);
    if (inCooldown) {
        helpVotes   = 0;
        tulongVotes = 0;
    }

    // ── D) Vote accumulation (only when NOT in cooldown) ───────
    if (!inCooldown) {
        if (helpDominant) {
            helpVotes++;
            tulongVotes = 0;
        } else if (tulongDominant) {
            tulongVotes++;
            helpVotes   = 0;
        } else {
            helpVotes   = 0;
            tulongVotes = 0;
        }
    }

    // ── E) Fire when votes threshold reached ───────────────────
    if (!inCooldown && helpVotes >= VOTES_REQUIRED) {
        ei_printf(">>> HELP  CONFIRMED! conf=%.2f lead=%.2f votes=%d  → RED + 3-beeps\n",
                  bestConf, lead, helpVotes);
        helpVotes      = 0;
        tulongVotes    = 0;
        lastDetected   = 0;
        ledHoldUntil   = millis() + HOLD_MS;
        cooldownUntil  = millis() + COOLDOWN_MS;
        ledRed();
        buzzerHelp();       // non-blocking — runs on a background task
    }
    else if (!inCooldown && tulongVotes >= VOTES_REQUIRED) {
        ei_printf(">>> TULONG CONFIRMED! conf=%.2f lead=%.2f votes=%d  → BLUE + 2-beeps\n",
                  bestConf, lead, tulongVotes);
        helpVotes      = 0;
        tulongVotes    = 0;
        lastDetected   = 1;
        ledHoldUntil   = millis() + HOLD_MS;
        cooldownUntil  = millis() + COOLDOWN_MS;
        ledBlue();
        buzzerTulong();     // non-blocking
    }
    else {
        // No confirmed detection — restore idle LED after hold expires
        if (millis() > ledHoldUntil) {
            ledGreen();
            lastDetected = -1;
        }
        // Show vote progress so you can tune thresholds
        if ((helpVotes > 0 || tulongVotes > 0) && !inCooldown) {
            ei_printf("[VOTE] help=%d/%d (%.2f)  tulong=%d/%d (%.2f)  2nd=%.2f lead=%.2f\n",
                      helpVotes,   VOTES_REQUIRED, confHelp,
                      tulongVotes, VOTES_REQUIRED, confTulong,
                      secondConf, lead);
        }
    }

    /* 5. Periodic full results print */
    if (++print_results >= (EI_CLASSIFIER_SLICES_PER_MODEL_WINDOW)) {
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
        print_results = 0;
    }
}

/* ============================================================
 *  AUDIO INFERENCE CALLBACK  (called from capture task)
 * ============================================================ */
static void audio_inference_callback(uint32_t n_bytes) {
    for (int i = 0; i < (int)(n_bytes >> 1); i++) {
        inference.buffers[inference.buf_select][inference.buf_count++] = sampleBuffer[i];

        if (inference.buf_count >= inference.n_samples) {
            inference.buf_select ^= 1;
            inference.buf_count   = 0;
            inference.buf_ready   = 1;
        }
    }
}

/* ============================================================
 *  CAPTURE TASK  (runs on core 0, reads I2S continuously)
 * ============================================================ */
static void capture_samples(void *arg) {
    const int32_t i2s_bytes_to_read = (uint32_t)arg;
    size_t bytes_read = i2s_bytes_to_read;

    while (record_status) {
        /* Read from I2S port 1 */
        i2s_read((i2s_port_t)1, (void *)sampleBuffer,
                 i2s_bytes_to_read, &bytes_read, 100);

        if (bytes_read <= 0) {
            ei_printf("[I2S] Read error: %d\n", (int)bytes_read);
        } else {
            if (bytes_read < (size_t)i2s_bytes_to_read) {
                ei_printf("[I2S] Partial read (%d / %d)\n",
                          (int)bytes_read, (int)i2s_bytes_to_read);
            }

            /* Amplify — INMP441 output can be quiet; adjust multiplier (4–16) */
            for (int x = 0; x < (int)(i2s_bytes_to_read / 2); x++) {
                sampleBuffer[x] = (int16_t)(sampleBuffer[x]) * 8;
            }

            if (record_status) {
                audio_inference_callback(i2s_bytes_to_read);
            } else {
                break;
            }
        }
    }
    vTaskDelete(NULL);
}

/* ============================================================
 *  MICROPHONE INIT  (alloc buffers + start I2S + launch task)
 * ============================================================ */
static bool microphone_inference_start(uint32_t n_samples) {
    inference.buffers[0] = (signed short *)malloc(n_samples * sizeof(signed short));
    if (inference.buffers[0] == NULL) { return false; }

    inference.buffers[1] = (signed short *)malloc(n_samples * sizeof(signed short));
    if (inference.buffers[1] == NULL) { ei_free(inference.buffers[0]); return false; }

    inference.buf_select = 0;
    inference.buf_count  = 0;
    inference.n_samples  = n_samples;
    inference.buf_ready  = 0;

    /* I2S hardware init */
    if (i2s_init(EI_CLASSIFIER_FREQUENCY)) {
        ei_printf("[I2S] Init failed!\n");
    }

    ei_sleep(100);
    record_status = true;

    /* Capture task: stack 32 KB, priority 10, runs on any core */
    xTaskCreate(capture_samples, "CaptureSamples",
                1024 * 32, (void *)(uintptr_t)sample_buffer_size, 10, NULL);

    return true;
}

/* ============================================================
 *  MICROPHONE RECORD  (blocks until slice is ready)
 * ============================================================ */
static bool microphone_inference_record(void) {
    /*
     *  Overrun means loop() was blocked longer than one slice period
     *  (e.g. by a blocking buzzer call).  With the non-blocking buzzer
     *  task this should no longer happen, but if it does: discard the
     *  stale buffer and wait for the NEXT fresh one instead of
     *  returning false and dropping the whole window.
     */
    if (inference.buf_ready == 1) {
        ei_printf("[WARN] Buffer overrun — stale slice discarded\n");
        inference.buf_ready = 0;   // discard stale, fall through to wait
    }

    while (inference.buf_ready == 0) {
        delay(1);
    }
    inference.buf_ready = 0;
    return true;
}

/* ============================================================
 *  GET AUDIO DATA  (called by EI SDK)
 * ============================================================ */
static int microphone_audio_signal_get_data(size_t offset, size_t length, float *out_ptr) {
    numpy::int16_to_float(
        &inference.buffers[inference.buf_select ^ 1][offset],
        out_ptr,
        length);
    return 0;
}

/* ============================================================
 *  MICROPHONE STOP
 * ============================================================ */
static void microphone_inference_end(void) {
    i2s_deinit();
    ei_free(inference.buffers[0]);
    ei_free(inference.buffers[1]);
}

/* ============================================================
 *  I2S DRIVER  (legacy driver API — matches EI example)
 *  Uses I2S port 1 to avoid conflicts with potential I2S_NUM_0 usage
 * ============================================================ */
static int i2s_init(uint32_t sampling_rate) {
    i2s_config_t i2s_config = {
        .mode             = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX | I2S_MODE_TX),
        .sample_rate      = sampling_rate,
        .bits_per_sample  = (i2s_bits_per_sample_t)16,
        .channel_format   = I2S_CHANNEL_FMT_ONLY_LEFT,   // INMP441 L/R=GND → left channel
        .communication_format = I2S_COMM_FORMAT_I2S,
        .intr_alloc_flags = 0,
        .dma_buf_count    = 8,
        .dma_buf_len      = 512,
        .use_apll         = false,
        .tx_desc_auto_clear = false,
        .fixed_mclk       = -1,
    };

    i2s_pin_config_t pin_config = {
        .bck_io_num   = I2S_SCK,   // GPIO 26  — BCLK
        .ws_io_num    = I2S_WS,    // GPIO 25  — LRCLK / WS
        .data_out_num = I2S_PIN_NO_CHANGE,
        .data_in_num  = I2S_SD,    // GPIO 32  — DATA
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

/* ============================================================
 *  SAFETY CHECK — ensure correct model type
 * ============================================================ */
#if !defined(EI_CLASSIFIER_SENSOR) || EI_CLASSIFIER_SENSOR != EI_CLASSIFIER_SENSOR_MICROPHONE
#error "This sketch requires a microphone-based Edge Impulse model."
#endif

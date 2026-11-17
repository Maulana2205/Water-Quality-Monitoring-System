Berikut wiring MOSFET untuk sensor power gate (GPIO26):

## Opsi A: N-Channel MOSFET (Low-Side Switch) — paling sederhana

```
ESP32 GPIO26 ─────┬─ 10kΩ ───── GND  (pull-down, mencegah nyala saat boot)
                  │
                  └─ Gate ─── N-MOSFET (contoh: IRLZ44N, IRF540N, atau STP55NF06L)
                                      │
                      Source ──────── GND (ESP32 & sensor)
                      Drain  ──────── GND sensor board (pH & TDS)

VCC 5V/3V3 ─────────────────────────── VCC sensor board
```

**Cara kerja:** GPIO26 HIGH → MOSFET ON → sensor terhubung ke GND → menyala. GPIO26 LOW → OFF → sensor padam.

## Opsi B: P-Channel MOSFET (High-Side Switch)

```
VCC 5V/3V3 ─────────── Source ─── P-MOSFET ─── Drain ─── VCC sensor board
                                  │
                                  └─ Gate ─── ESP32 GPIO26
                                  │
                                  └─ 10kΩ ──────── VCC (pull-up, default OFF)
```

**Cara kerja:** GPIO26 LOW → MOSFET ON. GPIO26 HIGH → OFF.

## Catatan
* Pakai **logic-level MOSFET** (gate threshold rendah, bisa dihidupkan oleh 3.3V dari ESP32), contoh **IRLZ44N**. IRF540N butuh gate lebih tinggi, kadang kurang optimal pada 3.3V.
* Pasang **dioda flyback** (1N4148/1N4001) paralel dengan beban induktif jika ada relay/solenoid. Untuk sensor board biasanya tidak perlu.
* Tambahkan resistor **100Ω–220Ω** antara GPIO26 dan Gate untuk mencegah oscili saat switching (opsional tapi direkomendasikan).

Pilih **Opsi A (N-channel low-side)** kalau sensor board boleh condividasi GND dengan ESP32 (umumnya bisa). Pilih **Opsi B** kalau Anda memutuskan VCC sekaligus (lebih bersih untuk penghematan daya).

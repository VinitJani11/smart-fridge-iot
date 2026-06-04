# 🧊 Smart Fridge IoT Dashboard

A full-stack IoT project that monitors a smart fridge in real time using an ESP32 microcontroller (simulated on Wokwi), Adafruit IO as the cloud data broker, and a React web dashboard hosted on GitHub Pages.

---

## 🌐 Live Dashboard

👉 https://vinitjani11.github.io/smart-fridge-iot/

---

# 📖 Project Overview

This project simulates a smart refrigerator system capable of monitoring environmental conditions and inventory levels in real time.

The ESP32 reads sensor values and sends data to Adafruit IO using MQTT feeds. A React + Vite dashboard fetches and visualizes the live data.

---

# 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Microcontroller | ESP32 DevKit V1 |
| Simulation | Wokwi |
| Sensors | DHT22, Potentiometer, Push Button, Slide Switch |
| Display | LCD1602 I2C |
| Cloud | Adafruit IO |
| Frontend | React + Vite + Tailwind CSS |
| Hosting | GitHub Pages |

---

# 🔌 Hardware / Circuit Connections

| Component | ESP32 Pin |
|---|---|
| DHT22 (data) | GPIO 26 |
| LCD SDA | GPIO 21 |
| LCD SCL | GPIO 22 |
| Red LED (alert) | GPIO 2 |
| Green LED (ok) | GPIO 13 |
| Buzzer | GPIO 15 |
| Potentiometer (mango weight) | GPIO 35 |
| Slide Switch (door sensor) | GPIO 5 |
| Push Button (milk counter) | GPIO 18 |

---

# ☁️ Adafruit IO Feeds

| Feed Key | Direction | Description |
|---|---|---|
| fridge-temperature | ESP32 → Dashboard | Temperature in °C |
| fridge-humidity | ESP32 → Dashboard | Humidity in % |
| mango-weight | ESP32 → Dashboard | Mango weight in grams |
| milk-count | ESP32 → Dashboard | Milk units remaining |
| fridge-door | ESP32 → Dashboard | OPEN / CLOSED / OPEN>30s |
| fridge-alert | ESP32 → Dashboard | Alert message string |
| max-temp-setting | Dashboard → ESP32 | Max safe temperature threshold |
| reset-milk | Dashboard → ESP32 | Send "1" to reset milk counter |

---

# 🚨 Alert Logic (ESP32)

| Condition | Alert |
|---|---|
| Temperature > max threshold | Red LED ON + buzzer |
| Mango weight ≤ 50g | "MANGO LOW" alert |
| Milk count ≤ 2 | "MILK LOW" alert |
| Door open > 30 seconds | "DOOR OPEN" alert |

---

# 📊 Dashboard Features

✅ Live readings for all sensors  
✅ Auto-refresh every 15 seconds  
✅ Temperature history line chart  
✅ Color-coded status cards  
✅ Global fridge status banner  
✅ Latest alert message display  
✅ Reset milk counter remotely  
✅ Set max temperature remotely  

---

# 📁 Project Structure

```bash
smart-fridge-iot/
├── artifacts/
│   └── fridge-dashboard/
│       ├── src/
│       │   ├── App.tsx
│       │   └── index.css
│       ├── vite.config.ts
│       └── vite.github.config.ts
├── .github/
│   └── workflows/
│       └── deploy.yml
└── README.md
```

---

# 🚀 Running Locally

## Prerequisites

- Node.js 22+
- pnpm 9+

## Install Dependencies

```bash
pnpm install
```

## Start Development Server

```bash
pnpm --filter @workspace/fridge-dashboard run dev
```

---

# 🔐 Environment Variables

Create a `.env` file inside:

```bash
artifacts/fridge-dashboard/
```

Add:

```env
VITE_AIO_KEY=your_adafruit_io_key_here
VITE_AIO_USERNAME=your_adafruit_io_username
```

---

# 🌍 Deploying to GitHub Pages

The GitHub Actions workflow automatically builds and deploys the dashboard whenever you push to `main`.

## One-Time Setup

### 1. Add GitHub Secret

Go to:

```text
Settings → Secrets and variables → Actions
```

Add:

```text
VITE_AIO_KEY=your_adafruit_io_active_key
```

---

### 2. Enable GitHub Pages

Go to:

```text
Settings → Pages → Source → GitHub Actions
```

---

### 3. Push Changes

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

---

# 📶 Wokwi WiFi Setup

Use these exact credentials in your Arduino sketch:

```cpp
const char* ssid     = "Wokwi-GUEST";
const char* password = "";
```

⚠️ Do not use real WiFi credentials — Wokwi only supports its built-in guest network.

---

# 🎨 Dashboard UI Features

- Responsive design
- Cold-blue / teal color palette
- Alert-based color indicators
- Live sensor updates
- Remote control panel
- Temperature history chart

---

# 🔮 Future Improvements

- Camera integration
- Mobile notifications
- Food expiry tracking
- AI-based food suggestions
- Firebase authentication
- Energy analytics

---

# 👨‍💻 Author

**Vinit Jani**  

---

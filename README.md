# 🧊 Smart Fridge IoT — VinitIOT

A full-stack IoT project that monitors a smart fridge in real time using an **ESP32 Arduino**, **Adafruit IO**, a **React web dashboard**, and an **Expo mobile app**.

---

## 📸 Features

### 🌐 Web Dashboard (GitHub Pages)
- **Live sensor cards** — Temperature, Humidity, Mango Weight, Milk Count, Door Status
- **Alert banner** — automatically highlights issues (temp out of range, low stock, door open)
- **History charts** — line charts for all 4 sensor feeds using Chart.js
- **Wokwi simulator** — embedded Arduino simulator running the fridge sketch live
- **Shelf tracking** — Shelf 1 (milk bottles) and Shelf 2 (mangoes) with progress bars and restock button
- **Notification log** — stores all alerts in the browser with timestamps
- **Auto-refresh** — polls Adafruit IO every 10 seconds
- **Settings panel** — enter AIO key and thresholds once, saved in browser localStorage
- **Fully static** — no server required, hosted free on GitHub Pages

### 📱 Mobile App (Android APK / Expo Go)
- **Dashboard tab** — live temperature, humidity, mango weight, milk count, door status
- **Status banner** — "All Clear" or "Attention Required" with itemised alerts
- **Controls tab** — reset milk counter, set min/max temperature range, mango & milk alert thresholds
- **Temperature history chart** — bar chart of last 10 readings
- **Settings tab** — enter Adafruit IO key and username once; saved securely on device
- **Pull to refresh** — haptic feedback on refresh
- **Auto-refresh** — polls every 15 seconds
- **Dark mode** — follows system theme automatically

### 🔌 Hardware (ESP32 + Wokwi)
- **DHT22** — temperature and humidity sensor
- **HX711 + Load Cell** — mango weight measurement
- **Push button** — milk bottle counter (1 press = 1 bottle removed)
- **Reed switch** — fridge door open/closed detection
- **LCD display** — shows live readings on the fridge
- **Buzzer** — local alert when thresholds are breached
- **Potentiometer** — simulates weight in Wokwi simulator

---

## 🛰️ Adafruit IO Feeds

| Feed Key | Description |
|---|---|
| `fridge-temperature` | Temperature readings (°C) |
| `fridge-humidity` | Relative humidity (%) |
| `mango-weight` | Shelf 2 mango weight (g) |
| `milk-count` | Shelf 1 milk bottle count |
| `fridge-door` | Door state (`OPEN` / `CLOSED`) |
| `fridge-alert` | Latest alert message |
| `max-temp-setting` | Max temperature threshold |
| `min-temp-setting` | Min temperature threshold |
| `mango-threshold` | Mango low-stock alert level |
| `milk-threshold` | Milk low-stock alert level |
| `reset-milk` | Trigger milk counter reset |

---

## 🚀 Live Demo

| Platform | Link |
|---|---|
| 🌐 Web Dashboard | [VinitJani11.github.io/smart-fridge-iot](https://VinitJani11.github.io/smart-fridge-iot) |
| ⚡ Wokwi Simulator | [wokwi.com/projects/464730115732465665](https://wokwi.com/projects/464730115732465665) |
| 📱 Android APK | Build via EAS (see below) |

---

## 🗂️ Project Structure

```
smart-fridge-iot/
├── docs/
│   └── index.html              # Static web dashboard (GitHub Pages)
├── artifacts/
│   ├── fridge-mobile/          # Expo React Native mobile app
│   │   ├── app/(tabs)/
│   │   │   ├── index.tsx       # Dashboard screen
│   │   │   ├── controls.tsx    # Controls & thresholds screen
│   │   │   └── settings.tsx    # AIO key settings screen
│   │   ├── constants/
│   │   │   ├── aio.ts          # Adafruit IO feed keys & API helpers
│   │   │   └── storage.ts      # AsyncStorage key management
│   │   └── context/
│   │       └── FridgeContext.tsx  # Global state & AIO data fetching
│   ├── web-dashboard/          # React + Vite dashboard (dev version)
│   └── api-server/             # Express API server (dev only)
└── lib/
    └── db/                     # PostgreSQL schema (Drizzle ORM)
```

---

## 📲 Running the Mobile App

### Option 1 — Expo Go (instant, for testing)
1. Install [Expo Go](https://expo.dev/client) on your phone
2. Open this project in Replit and scan the QR code from the mobile preview

### Option 2 — Build Android APK (permanent, shareable)
```bash
# Install dependencies
npm install -g pnpm eas-cli
cd artifacts/fridge-mobile
pnpm install

# Login to Expo account (free at expo.dev)
eas login

# Build APK
eas build --platform android --profile preview
```
Download the `.apk` link EAS provides and share it — anyone can install it directly on Android.

### First-time setup in the app
1. Open the app → tap **⚙ Settings** tab
2. Enter your **Adafruit IO username** and **AIO key**
   - Find your key at [io.adafruit.com](https://io.adafruit.com) → click the 🔑 yellow key icon
3. Tap **Save & Connect** → Dashboard loads live data

---

## 🌐 Web Dashboard Setup (GitHub Pages)

1. Push code to GitHub
2. Go to **Settings → Pages → Source: Deploy from branch → `/docs` folder**
3. Visit `https://yourusername.github.io/smart-fridge-iot`
4. On first load, click **⚙ Settings** → enter your AIO key → **Save & Reload**

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Hardware | ESP32, DHT22, HX711, Reed Switch, LCD, Buzzer |
| Simulator | Wokwi (Arduino C++) |
| IoT Platform | Adafruit IO (MQTT / REST API) |
| Web Dashboard | HTML, CSS, JavaScript, Chart.js (static) |
| Mobile App | React Native, Expo SDK 54, expo-router |
| State Management | React Context + AsyncStorage |
| Dev Stack | Node.js 24, TypeScript, pnpm workspaces |
| Dev API | Express 5, Drizzle ORM, PostgreSQL |
| Hosting | GitHub Pages (web), EAS (mobile APK) |

---

## 🔐 Security

- The AIO key is **never stored in the source code**
- Web dashboard: key stored in **browser localStorage** (your device only)
- Mobile app: key stored in **AsyncStorage** on the phone (your device only)
- GitHub push protection will block any accidental key commits

---

## 👤 Author

**VinitIOT** — Smart Fridge IoT Project  
GitHub: [github.com/VinitJani11](https://github.com/VinitJani11)

---

## 📄 License

MIT — free to use and modify for educational purposes.

# 📱 SkyCoPilot Mobile (Hackathon Edition)

> **Build the Passenger & Crew Companion App for SkyCoPilot.**

This guide outlines the architecture and API endpoints required to build the Android extension of the SkyCoPilot ecosystem for your hackathon submission.

---

## 🏗️ Architecture

The Mobile App acts as a **Client** to the existing SkyCoPilot Backend.

*   **Backend**: Python FastAPI (Running on your laptop).
*   **Database**: MongoDB (Shared state).
*   **Connection**: Since the app runs on a physical device or emulator, `localhost` won't work directly.
    *   **Emulator**: Use `http://10.0.2.2:8000`
    *   **Physical Device**: Use **Ngrok** (`ngrok http 8000`) or your laptop's local IP (`http://192.168.x.x:8000`).

---

## 🚀 Key Features to Build

### 1. Passenger Mode (The "Empathy" Interface)
*   **My Flight Card**:
    *   Input: `Flight ID` (e.g., "AI-202").
    *   Display: Live Status (On Time, Delayed, Cancelled).
*   **AI Explainability**:
    *   If delayed, show the **"Reasoning Trace"** (e.g., *"Delayed due to visibility dropping below 50m at DEL. Safety protocol activated."*).
    *   *Avoid technical jargon (METAR, NOTAMs).*
*   **Rights Center**:
    *   If delay > 2 hours, show a **"Claim Voucher"** button.
    *   Display "You are entitled to a full refund" if cancelled.

### 2. Crew Mode (The "Wellness" Interface)
*   **Fatigue Gauge**:
    *   Visual ring showing the pilot's current `fatigue_score`.
    *   *Hackathon Idea*: "Sync with WearOS" (Mock this data using the API).
*   **Upcoming Roster**:
    *   List of next flights.
    *   **One-Tap Call in Sick**: Hits the `/simulate` endpoint with `type=CREW, subType=Sickness`.

---

## 🔌 API Reference

**Base URL**: `http://<YOUR_IP>:8000`

### Passenger Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/passenger/status?flight_id={id}` | Get status, delay reason, and AI message. |
| `POST` | `/passenger/feedback` | Submit passenger sentiment/complaint. |

**Example Response (`/passenger/status`)**:
```json
{
  "flight_id": "AI-305",
  "status": "DELAYED",
  "delay_minutes": 140,
  "ai_message": "We are holding for 140m due to heavy fog...",
  "rights": {
    "food_voucher": true,
    "hotel": false
  }
}
```

### Crew/Analytics Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/analytics/fatigue_trends` | Get 7-day predicted fatigue score for charts. |
| `GET` | `/analytics/overview` | Get high-level stats (Active Disruptions, etc). |

### Simulation (Demo Tools)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/simulate` | Inject a fault (e.g., Pilot Sickness) from the phone. |

**Body for Sickness**:
```json
{
  "type": "CREW",
  "subType": "Sickness",
  "flight_id": "AI-202" // Optional
}
```

---

## 💡 Hackathon Winning Tips

1.  **Notifications**: Use the `status` polling to trigger a local push notification on the phone when the flight status changes to "CRITICAL".
2.  **Voice**: Add a Text-to-Speech button to read the "AI Explanation" for accessibility.
3.  **Dark Mode**: Design the UI for low-light cockpit environments.

Good luck! 🚀

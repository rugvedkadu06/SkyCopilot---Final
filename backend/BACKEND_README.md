# SkyCoPilot Backend Documentation

This directory contains the backend logic for the **SkyCoPilot** application (formerly AeroResilience). It is a FastAPI-based system designed to manage airline operations, handle disruptions, optimize crew rosters, and provide passenger support during delays.

## 📂 Project Structure

| File | Description |
| :--- | :--- |
| **`main.py`** | **Entry Point.** Initializes the FastAPI app, registers routers, and handles core simulation and resolution logic. |
| **`models.py`** | **Data Layer.** Defines Pydantic models for `Pilot`, `Flight`, `Disruption`, `CostModel`, etc. |
| **`agents.py`** | **Agentic Logic.** Contains the `AgentSystem` which implements `SchedulerAgent`, `PilotAgent`, and `SafetyAgent` to heal rosters and validate assignments. |
| **`analytics.py`** | **Data Science.** Helper functions for fatigue prediction, cost estimation, and risk analysis. |
| **`analytics_api.py`** | **Analytics Router.** Exposes endpoints for the dashboard stats, fatigue trends, and financial overview. |
| **`passenger_api.py`** | **Passenger Router.** Handles passenger-facing features like flight status, compensation options (vouchers, hotels), and AI chat. |
| **`solver.py`** | **Optimization.** Uses Google OR-Tools to mathematically solve crew scheduling problems under constraints. |
| **`database.py`** | **Persistence.** Manages the connection to the MongoDB database. |
| **`aero.csv` / `pilot.csv`** | **Seed Data.** CSV files used to populate the database with initial flight and pilot data. |

## 🚀 Key Functionalities

### 1. Operations & Disruption Management (`main.py`)
-   **Simulation (`/simulate`)**: Allows injection of disruptions (Weather, Tech, ATC, Crew Sickness) to test system resilience.
-   **Healing (`/heal`)**: The core "Co-Pilot" logic. It detects critical flights and generates a "Reasoning Trace" to propose solutions (e.g., swapping flights, assigning reserve crew).
-   **Resolution (`/resolve`)**: Executes the chosen solution (e.g., updating the database to swap flight inputs).
-   **Email Notifications**: Uses SMTP to send real-time alerts to passengers when delays or changes occur.

### 2. Intelligent Agents (`agents.py`)
-   **Hierarchical Decision Making**:
    -   `SchedulerAgent`: Orchestrates the healing process.
    -   `PilotAgent`: Simulates pilot decisions based on fatigue (e.g., rejecting duty if fatigue > 80).
    -   `SafetyAgent`: Validates compliance with DGCA regulations (e.g., flight time limitations, rest periods).

### 3. Analytics & Prediction (`analytics.py`, `analytics_api.py`)
-   **Fatigue Forecasting**: Projects pilot fatigue levels for the next 7 days using simulation.
-   **Cost Estimation**: Calculates the financial impact of delays (Fuel, Crew OT, Compensation).
-   **Predictive Risk**: Analyzes patterns (e.g., multiple delays at one airport) to predict cascading failures.

### 4. Passenger Experience (`passenger_api.py`)
-   **Real-time Status**: Provides a transparent timeline of flight events.
-   **Automatic Entitlements**: Automatically offers vouchers, hotels, or refunds based on delay duration (Industry 5.0 standards).
-   **AI Support**: Integrates with Gemini (via `genai`) to answer passenger queries contextually.

### 5. Roster Optimization (`solver.py`)
-   **Constraint Programming**: Uses OR-Tools to find valid pilot-to-flight assignments.
-   **Constraints Handled**:
    -   Maximum Fatigue Score (80)
    -   No back-to-back night duties.
    -   Rest requirements.

## 🛠️ Setup & Running

1.  **Environment Variables**: Ensure `.env` is set up with:
    -   `MONGODB_URL`: Connection string for MongoDB.
    -   `EMAIL_USER` / `EMAIL_PASS`: For sending notifications.
    -   `GEMINI_API_KEY`: For the passenger chat assistant.

2.  **Run Server**:
    ```bash
    uvicorn main:app --reload
    ```
    The API will be available at `http://localhost:8000`.

3.  **Docs**:
    Interactive documentation is available at `http://localhost:8000/docs`.

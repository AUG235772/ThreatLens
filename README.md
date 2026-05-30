<div align="center">
<img width="300" height="120" alt="image" src="https://github.com/user-attachments/assets/73482fd5-0519-49f4-9b24-0829dc762c35" />
<img width="200" height="120" alt="image" src="https://github.com/user-attachments/assets/efc26a71-ba7c-40eb-ae33-23e372779555" />
<img width="200" height="120" alt="image" src="https://github.com/user-attachments/assets/7c1d2cc7-f2a3-485b-8cef-2239a1a0f18c" />


# 🔍 ThreatLens
### AI-Powered Insider Threat Detection for Banking Systems

<br/>

![Python](https://img.shields.io/badge/Python-3.10-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Deployed-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![HuggingFace](https://img.shields.io/badge/🤗%20Hugging%20Face-Spaces-FFD21E?style=for-the-badge)

<br/>

![Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?style=flat-square&logo=google&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama%203.1--8B-F55036?style=flat-square)
![scikit-learn](https://img.shields.io/badge/scikit--learn-Isolation%20Forest-F7931E?style=flat-square&logo=scikitlearn&logoColor=white)
![iDEA](https://img.shields.io/badge/iDEA%202.0-Phase%202%20Submission-1F3864?style=flat-square)
![Team](https://img.shields.io/badge/Team-Dhurandhars-6C3483?style=flat-square)

<br/>

> **Detect. Explain. Contain.**
> ThreatLens watches when no one else is watching.

</div>

---

<div align="center">

<img width="1280" height="720" alt="image" src="https://github.com/user-attachments/assets/681f2b9f-cb91-4d6e-ab8c-9ba860ab00b9" />

</div>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Live Demo](#-live-demo)
- [How It Works](#%EF%B8%8F-how-it-works)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [How to Run Locally](#-how-to-run-locally)
- [Project Structure](#-project-structure)
- [Dataset](#-dataset)
- [Model Performance](#-model-performance)
- [Known Limitations](#%EF%B8%8F-known-limitations)
- [Team](#-team)
- [Contact](#-contact)

---

## 🎯 Problem Statement

> This project addresses **PS1: AI-Driven Early Warning System for Internal & Privileged User Fraud**.

Banking systems face severe vulnerabilities from **privileged insiders** — admins, branch staff, relationship managers, and IT teams — whose malicious actions blend seamlessly with normal operations and bypass traditional, externally-focused security perimeters.

**ThreatLens** is a real-time AI-powered Early Warning System that profiles behavioural baselines for individual privileged users, detects cross-silo anomalies (Core Banking, CRM, Treasury, Loans, Email) using an unsupervised Isolation Forest model, and deploys an **Explainable AI Copilot** (Gemini + Groq Llama 3.1) to translate every detected threat into an instant, actionable natural language incident summary — compressing SOC investigation time from hours to seconds.

---

## 🚀 Live Demo

<div align="center">

| | Link |
|---|---|
| 🔗 **Live App** | `https://ag235772-threat-lens.hf.space` |
| 🎥 **Demo Video** | `[Insert YouTube Link here]` |

</div>

> **Credentials for demo:**
> - **SOC Analyst View** → navigate to the Fraud Investigation Hub
> - **Manager View** → navigate to the Manager Dashboard (kill-switch access)
> - **Trigger Live Events** → use the Simulated Banking Portal to generate real-time anomalies through the full pipeline

---

## ⚙️ How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THREATLENS PIPELINE                                 │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐   │
│  │   Simulated  │    │   FastAPI    │    │  Isolation   │    │  Gemini  │   │
│  │   Banking    │───▶│   Gateway   │───▶│   Forest     │───▶│  + Groq │   │
│  │   Portal     │    │  (Async)     │    │  ML Engine   │    │  XAI     │   │
│  └──────────────┘    └──────────────┘    └──────────────┘    └────┬─────┘   │
│   Core Banking              │                   │                 │         │
│   CRM  |  Treasury          │              anomaly_score          │         │
│   Loans | Email       MongoDB Atlas         + is_anomaly          │         │
│                             │                   │                 │         │
│                       ┌─────▼─────────────────────────────────────▼──────┐  │
│                       │         React SOC Investigation Hub              │  │
│                       │   ForceGraph2D  |  Kill Switch  |  XAI Copilot   │  │
│                       └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Ingest** — The Simulated Banking Portal generates events across 5 silos; each event is POST'd to FastAPI with user ID, action type, amount, geo-location, and timestamp.
2. **Detect** — The Isolation Forest model scores every event against the behavioural baseline. Outliers (anomaly score < 0) are flagged instantly.
3. **Explain** — Gemini 2.5 Flash generates a full incident report. The Groq Llama 3.1 Copilot answers live SOC analyst questions in under 100ms.
4. **Contain** — The Manager Dashboard's kill switch immediately revokes the suspicious user's session.

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React + Vite, ForceGraph2D | Real-time SOC dashboard, interactive threat network visualisation |
| **Backend** | Python 3.10, FastAPI, Uvicorn | Async REST API, ML inference pipeline, static file serving |
| **Database** | MongoDB Atlas, Motor (Async) | Flexible NoSQL event storage across multi-silo log structures |
| **ML Engine** | Scikit-learn (Isolation Forest), Pandas, NumPy, Joblib | Unsupervised anomaly detection; no labeled fraud data required |
| **AI / XAI** | Google Gemini 2.5 Flash, Groq Llama 3.1-8B | Natural language incident reports + real-time SOC Copilot Q&A |
| **Deployment** | Docker (Multi-Stage Build), Hugging Face Spaces | Single-container, zero-cost public hosting on port 7860 |

</div>

---

## 💻 How to Run Locally

### Prerequisites
- Node.js 20+
- Python 3.10+
- A MongoDB Atlas free-tier cluster
- Gemini API key (get at [aistudio.google.com](https://aistudio.google.com))
- Groq API key (get at [console.groq.com](https://console.groq.com))

---

### Option A — Run Frontend + Backend Separately (Development)

**1. Clone the repository**
```bash
git clone https://github.com/AUG235772/ThreatLens
cd threatlens
```

**2. Configure environment variables**
```bash
# Create a .env file inside /backend
cp backend/.env.example backend/.env
```
Edit `backend/.env`:
```env
MONGO_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY_1=your_gemini_api_key
GEMINI_API_KEY_2=your_gemini_api_key_2        # optional — used for rotation
GEMINI_API_KEY_3=your_gemini_api_key_3        # optional — used for rotation
GROQ_API_KEY=your_groq_api_key
```

**3. Install backend dependencies and start the API**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
> API will be live at `http://localhost:8000`
> OpenAPI docs at `http://localhost:8000/docs`

**4. Install frontend dependencies and start the React app**
```bash
# In a new terminal
cd frontend
npm install
npm run dev
```
> App will be live at `http://localhost:5173`

---

### Option B — Run with Docker (mirrors Hugging Face deployment)

```bash
# Build the image
docker build -t threatlens .

# Run with your environment variables
docker run -p 7860:7860 \
  -e MONGO_URI=your_mongo_uri \
  -e GEMINI_API_KEY_1=your_gemini_key \
  -e GROQ_API_KEY=your_groq_key \
  threatlens
```
> Full app (UI + API) accessible at `http://localhost:7860`

---

## 📁 Project Structure

```
threatlens/
│
├── 📂 backend/
│   ├── 📂 app/
│   │   └── main.py              ← FastAPI app: routes, ML inference, XAI engine, MongoDB connection
│   ├── requirements.txt         ← All Python dependencies
│   └── .env.example             ← Environment variable template
│
├── 📂 frontend/
│   ├── 📂 src/
│   │   ├── App.jsx              ← Root React component + routing
│   │   ├── 📂 components/       ← SOC Investigation Hub, Manager Dashboard, Simulated Portal
│   │   └── 📂 pages/            ← Page-level views
│   ├── package.json
│   └── vite.config.js
│
├── 📂 ml_engine/
│   ├── 📂 models/
│   │   ├── isolation_forest.pkl ← Trained Isolation Forest model (Joblib)
│   │   ├── le_action.pkl        ← LabelEncoder for action_type feature
│   │   └── le_geo.pkl           ← LabelEncoder for geo_location feature
│   └── model_training.ipynb    ← Full EDA + training pipeline notebook
│
├── 📂 assets/                   ← README screenshots (add yours here)
│
├── Dockerfile                   ← Multi-stage build (Node 20 → Python 3.10-slim)
└── README.md
```

---

## 📊 Dataset

All data is **100% synthetic**, generated by Team Dhurandhars using the training notebook at `/ml_engine/model_training.ipynb`.

<div align="center">

| Property | Value |
|----------|-------|
| **Total Events** | 6,000 |
| **Normal Events (95%)** | 5,700 |
| **Anomalous Events (5%)** | 300 |
| **Systems Covered** | Core Banking, CRM, Treasury, Loans, Email |
| **Simulated Employees** | 10 privileged users across 5 departments |
| **Simulation Period** | 30 days |
| **Reproducibility Seed** | `SEED = 42` |

</div>

**Features per event:**

| Feature | Type | Description |
|---------|------|-------------|
| `amount_inr` | Float | Transaction amount in Indian Rupees |
| `is_business_hours` | Binary | 1 if event occurred 9am–6pm Mon–Fri |
| `hour_of_day` | Int (0–23) | Hour the event was triggered |
| `action_code` | Encoded Int | LabelEncoded action type (20 possible actions) |
| `geo_code` | Encoded Int | LabelEncoded geographic location |

**Normal profile:** Business hours · Domestic geo (Mumbai, Delhi, Bangalore) · Routine actions (LOGIN_SUCCESS, VIEW_RECORD, DOMESTIC_TRANSFER) · Moderate INR amounts

**Anomalous profile injected:** Off-hours · Foreign geo (Moscow, Beijing, Dubai, Lagos) · Suspicious actions (BULK_EXPORT, UNAUTHORIZED_API_CALL, MASS_RECORD_ACCESS) · Extreme amounts

> No real bank data was used at any stage.

---

## 📈 Model Performance

<div align="center">

### Isolation Forest — Unsupervised Anomaly Detection

| Metric | Value |
|--------|-------|
| **Algorithm** | Isolation Forest |
| **n_estimators** | 100 |
| **contamination** | 0.05 (5%) |
| **Training Set Size** | 6,000 events |
| **XAI Coverage** | **100%** of flagged anomalies receive a natural language incident summary |
| **Inference Speed** | Near-instantaneous (no GPU required) |
| **Model Artefacts** | `isolation_forest.pkl` · `le_action.pkl` · `le_geo.pkl` |

</div>

> ⚠️ **Note:** Results are on synthetic data. Performance on real-world banking data would require re-training on actual institutional event logs with real behavioural baselines.

---

## ⚠️ Known Limitations

- **Synthetic data only** — The system relies on simulated event sequences rather than live enterprise event streams (e.g., Apache Kafka). All employee activity is synthetically generated and does not represent real bank telemetry.

- **External LLM APIs** — XAI features depend on Gemini and Groq APIs, which are subject to rate limiting (mitigated via 3-key rotation). These external APIs are not suitable for production environments containing real customer PII due to data privacy constraints.

- **Single-container deployment** — The current architecture is a single Docker container on Hugging Face Spaces. Production would require independent microservices, dedicated scaling, SSO/Active Directory authentication, and compliance-grade audit logging.

- **No auto-retraining** — The Isolation Forest is trained on a fixed dataset. User behavioural drift over time would require periodic retraining pipelines in production.

- **No authentication** — The SOC dashboard has no user login (acceptable for POC demonstration; not suitable for production deployment).

---

## 👥 Team

<div align="center">

<!-- ══════════════════════════════════════════════════════════════════════ -->
<!-- TEAM PHOTO PLACEHOLDER                                               -->
<!-- Optional: Add a team photo here                                      -->
<!-- <img src="assets/team.jpg" alt="Team Dhurandhars" width="600"/>      -->
<!-- ══════════════════════════════════════════════════════════════════════ -->

| Name | Role | Responsibilities |
|------|------|-----------------|
| **Aditya Gupta** | ML Lead | Isolation Forest training pipeline, synthetic dataset generation, model artefacts, anomaly scoring integration |
| **Dev Parmar** | Backend Developer | FastAPI architecture, MongoDB Atlas integration, XAI engine (Gemini + Groq), Docker multi-stage deployment |
| **Yash Jani** | Frontend Developer | React SPA (Vite), Simulated Banking Portal, SOC Investigation Hub, ForceGraph2D threat network visualisations |
| **Het Patel** | Domain Research | PS1 analysis, insider fraud typologies, banking compliance requirements, documentation (D1, D3, D4) |

</div>

---

## 📬 Contact

<div align="center">

| | |
|---|---|
| **Team Name** | DHURANDHARS |
| **Project** | ThreatLens |
| **Institute** | `ITM SLS Baroda University` |
| **Hackathon** | iDEA 2.0 — Phase 2 Submission |
| **Problem Statement** | PS1: AI-Driven Early Warning System for Internal & Privileged User Fraud |

</div>

---

<div align="center">

Made with ❤️ by **Team Dhurandhars** for **iDEA 2.0**

*Detect. Explain. Contain.*

</div>

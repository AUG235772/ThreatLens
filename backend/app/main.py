import os
import time
import json
import asyncio
import random
import logging
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import motor.motor_asyncio
import pandas as pd
import joblib
from google import genai
from groq import Groq as GroqClient
from dotenv import load_dotenv
from datetime import datetime
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

load_dotenv()
app = FastAPI(title="Threat-Lens API - Enterprise Edition")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client.threatlens

ml_model, le_action, le_geo = None, None, None
gemini_clients = []
current_client_idx = 0
groq_client = None  # Groq Llama 3 Copilot


# ── Silence polling endpoint spam ──
class EndpointFilter(logging.Filter):
    SUPPRESSED = ["GET /api/v1/events/live"]
    def filter(self, record: logging.LogRecord) -> bool:
        return not any(ep in record.getMessage() for ep in self.SUPPRESSED)


@app.on_event("startup")
async def startup_event():
    global ml_model, le_action, le_geo, gemini_clients, groq_client
    logging.getLogger("uvicorn.access").addFilter(EndpointFilter())
    print("[SYSTEM] Initializing Enterprise Systems...")

    # ── ML Engine ──
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    model_path = os.path.join(base_dir, "ml_engine", "models")
    try:
        ml_model = joblib.load(os.path.join(model_path, "isolation_forest.pkl"))
        le_action = joblib.load(os.path.join(model_path, "le_action.pkl"))
        le_geo = joblib.load(os.path.join(model_path, "le_geo.pkl"))
        print("[SYSTEM] ML Engine (Isolation Forest + Sequence Proxies) Online.")
    except Exception as e:
        print(f"[WARN] ML missing: {e}")

    # ── Gemini XAI Engine (Multi-Key Rotation) ──
    keys = [
        os.getenv("GEMINI_API_KEY_1"),
        os.getenv("GEMINI_API_KEY_2"),
        os.getenv("GEMINI_API_KEY_3"),
    ]
    valid_keys = [k for k in keys if k and str(k).strip() != ""]
    for k in valid_keys:
        try:
            gemini_clients.append(genai.Client(api_key=k))
        except Exception:
            pass
    if gemini_clients:
        print(f"[SYSTEM] Gemini XAI Engine Online. {len(gemini_clients)} API Keys loaded for rotation.")
    else:
        print("[WARN] No valid Gemini API keys found.")

    # ── Groq Llama 3 Copilot Engine ──
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key and groq_key.strip():
        try:
            groq_client = GroqClient(api_key=groq_key)
            print("[SYSTEM] Groq Llama 3 Copilot Engine Online.")
        except Exception as e:
            print(f"[WARN] Groq init failed: {e}")
    else:
        print("[WARN] No GROQ_API_KEY found. Copilot will fall back to Gemini.")


# ── Gemini API rotation wrapper ──
def generate_with_retry_sync(prompt, model="gemini-2.5-flash"):
    global current_client_idx
    if not gemini_clients:
        return "XAI ENGINE OFFLINE: NO VALID API KEYS CONFIGURED."
    last_error = None
    for _ in range(len(gemini_clients)):
        try:
            response = gemini_clients[current_client_idx].models.generate_content(
                model=model, contents=prompt
            )
            return response.text
        except Exception as e:
            print(f"[WARN] API Key {current_client_idx + 1} exhausted or failed. Rotating...")
            current_client_idx = (current_client_idx + 1) % len(gemini_clients)
            last_error = e
    print(f"[ERROR] All Gemini keys exhausted. Last error: {last_error}")
    return "XAI ENGINE OFFLINE: QUOTA EXHAUSTED ACROSS ALL ROTATION KEYS."


# ── Groq copilot wrapper ──
def query_groq_copilot(context: dict, question: str) -> str:
    system_prompt = (
        "You are a hyper-intelligent AI security copilot embedded in a banking SOC platform. "
        "Analysts ask you about active threats. Reply with exactly 1-2 sentences. "
        "Be specific, clinical, and actionable. Never use emojis or markdown formatting."
    )
    user_prompt = (
        f"Active threat context: {json.dumps(context, default=str)}. "
        f"Analyst question: '{question}'"
    )
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=200,
            temperature=0.3,
        )
        reply = response.choices[0].message.content
        return reply.replace("**", "").replace("*", "").strip()
    except Exception as e:
        print(f"[WARN] Groq copilot failed: {e}. Falling back to Gemini.")
        fallback = generate_with_retry_sync(
            f"SOC context: {json.dumps(context, default=str)}. "
            f"Question: '{question}'. Reply as security copilot. 1-2 sentences. Plain text only."
        )
        return fallback.replace("**", "").replace("*", "").strip()


class UnifiedEvent(BaseModel):
    event_id: str
    timestamp: str
    user_id: str
    department: str
    system: str
    action: str
    amount_inr: float
    account_accessed: str
    ip_address: str
    geo_location: str
    is_business_hours: bool
    event_description: str = "Standard system operation."


class CopilotQuery(BaseModel):
    query: str
    context: dict


# ── XAI Narrative Generator (Gemini) ──
def generate_incident_report(event_dict, risk_score, rule_flags, soar_action):
    prompt = (
        f"Generate an official, clinical FIU Investigator Report. "
        f"DO NOT USE ANY EMOJIS OR MARKDOWN FORMATTING. DO NOT use asterisks. Use plain text only.\n"
        f"User {event_dict['user_id']} | System {event_dict['system']} | "
        f"Action {event_dict['action']} | Risk {risk_score}/100 | "
        f"Flags {', '.join(rule_flags)}. SOAR Protocol: {soar_action}.\n"
        f"FORMAT (plain text, no markdown):\n"
        f"THREAT: (1 sentence summary)\n"
        f"ANALYSIS: (1-2 sentences explaining why this cross-system behavior is dangerous)"
    )
    response_text = generate_with_retry_sync(prompt)
    if "XAI ENGINE OFFLINE" in response_text:
        flags = ", ".join(rule_flags) if rule_flags else "unauthorized access"
        return (
            f"THREAT: Automated anomaly detected for {event_dict['user_id']} "
            f"across {event_dict['system']} system.\n"
            f"ANALYSIS: Security Matrix identified severe rule violations including [{flags}]. "
            f"Cross-system correlation confirms high-risk velocity pattern. "
            f"Emergency protocol {soar_action} engaged immediately."
        )
    return response_text.replace("**", "").replace("*", "").strip()


# ── ENDPOINT 1: TRI-CORE INGESTION + 4-TIER DETECTION ──
@app.post("/api/v1/events")
async def ingest_event(event: UnifiedEvent):
    event_dict = event.dict()
    is_anomaly = False
    risk_score = 0
    rule_flags = []

    # TIER 1 — Honeytoken tripwire
    if event.account_accessed == "ACC_9999_GOD_MODE":
        rule_flags.append("HONEYTOKEN_TRIPWIRE_TRIGGERED")
        risk_score = 100
    else:
        # TIER 1 — Rule engine
        if not event.is_business_hours:
            rule_flags.append("OFF_HOURS_ACCESS")
            risk_score += 25
        if event.geo_location not in ["Mumbai, MH", "Delhi, DL", "Bangalore, KA"]:
            rule_flags.append("UNUSUAL_GEO_VELOCITY")
            risk_score += 35

        # Core Banking rules
        if event.system == "CRM" and event.action == "BULK_EXPORT":
            rule_flags.append("CRM_DATA_HOARDING")
            risk_score += 40
        if event.system == "EMAIL" and "LARGE_ATTACHMENT" in event.action:
            rule_flags.append("POTENTIAL_EXFILTRATION_SEQUENCE")
            risk_score += 45

        # ── Treasury rules (NEW) ──
        if event.system == "TREASURY" and event.action in [
            "BULK_POSITION_EXPORT", "UNAUTHORIZED_TRADE", "RATE_MANIPULATION_QUERY"
        ]:
            rule_flags.append("TREASURY_EXFILTRATION_RISK")
            risk_score += 40

        # ── Loans rules (NEW) ──
        if event.system == "LOANS" and event.action in [
            "BULK_LOAN_EXPORT", "UNAUTHORIZED_DISBURSEMENT", "MASS_RECORD_ACCESS"
        ]:
            rule_flags.append("LOANS_DATA_BREACH_RISK")
            risk_score += 40

        # TIER 2 — ML Isolation Forest baselining
        if ml_model and le_action and le_geo:
            try:
                dt = datetime.fromisoformat(event.timestamp.replace("Z", "+00:00"))
                action_code = (
                    le_action.transform([event.action])[0]
                    if event.action in le_action.classes_ else -1
                )
                geo_code = (
                    le_geo.transform([event.geo_location])[0]
                    if event.geo_location in le_geo.classes_ else -1
                )
                features = pd.DataFrame([{
                    "amount_inr": event.amount_inr,
                    "is_business_hours": int(event.is_business_hours),
                    "hour_of_day": dt.hour,
                    "action_code": action_code,
                    "geo_code": geo_code,
                }])
                if ml_model.predict(features)[0] == -1:
                    rule_flags.append("BEHAVIORAL_BASELINE_DRIFT")
                    risk_score += int(30 + abs(ml_model.decision_function(features)[0]) * 20)
            except Exception:
                pass

    risk_score = min(100, risk_score)
    if risk_score >= 85:
        is_anomaly = True

    # TIER 3 — SOAR auto-response
    soar_action = "LOG_ONLY"
    if risk_score >= 90:
        soar_action = "TERMINATE_SESSION_AND_FREEZE"
    elif risk_score >= 70:
        soar_action = "REVOKE_WRITE_ACCESS"
    elif risk_score >= 50:
        soar_action = "FORCE_MFA_CHALLENGE"

    event_dict["ai_analysis"] = {
        "is_anomaly": is_anomaly,
        "risk_score": risk_score,
        "triggered_rules": rule_flags,
        "soar_action": soar_action,
        "narrative": None,
    }

    # TIER 4 — XAI Narrative (Gemini)
    if is_anomaly:
        event_dict["ai_analysis"]["narrative"] = await asyncio.to_thread(
            generate_incident_report, event_dict, risk_score, rule_flags, soar_action
        )

    await db.core_logs.insert_one(event_dict)
    event_dict.pop("_id", None)
    return {"status": "success", "data": event_dict}


@app.get("/api/v1/events/live")
async def get_live_events(limit: int = 20):
    events = (
        await db.core_logs.find({}, {"_id": 0})
        .sort("timestamp", -1)
        .limit(limit)
        .to_list(length=limit)
    )
    return {"status": "success", "data": events}


@app.delete("/api/v1/events/reset")
async def reset_database():
    deleted = await db.core_logs.delete_many({})
    return {"status": "success", "message": f"Purged {deleted.deleted_count} logs."}


# ── ENDPOINT: AI COPILOT (Groq Llama 3 with Gemini fallback) ──
@app.post("/api/v1/copilot")
async def copilot_chat(query: CopilotQuery):
    if groq_client:
        reply = await asyncio.to_thread(query_groq_copilot, query.context, query.query)
    else:
        # Gemini fallback if Groq key not configured
        prompt = (
            f"SOC context: {json.dumps(query.context, default=str)}. "
            f"Analyst asks: '{query.query}'. "
            f"Reply as security copilot. 1-2 sentences. Plain text only. No emojis."
        )
        raw = await asyncio.to_thread(generate_with_retry_sync, prompt)
        reply = raw.replace("**", "").replace("*", "").strip()
    return {"reply": reply}


# ── FALSE POSITIVE FEEDBACK ENDPOINT (Self-Calibration hook) ──
@app.post("/api/v1/events/{event_id}/false-positive")
async def mark_false_positive(event_id: str):
    """
    Receives analyst false-positive feedback. In production this would
    feed a retraining pipeline. Currently logs for audit and future RL calibration.
    """
    result = await db.core_logs.update_one(
        {"event_id": event_id},
        {"$set": {"analyst_feedback": "FALSE_POSITIVE", "feedback_timestamp": datetime.utcnow().isoformat()}}
    )
    fp_count = await db.core_logs.count_documents({"analyst_feedback": "FALSE_POSITIVE"})
    print(f"[CALIBRATION] False positive logged for {event_id}. Total FP corpus: {fp_count}")
    return {
        "status": "success",
        "message": f"False positive recorded. Calibration corpus updated ({fp_count} samples).",
    }


# ── CROSS-SILO SIMULATION (Core Banking + CRM + Treasury + Loans + Email) ──
async def background_simulation():
    print("[INFO] Initiating Cross-Silo Simulation Sequence...")

    all_users = ["EMP_001_ADITYA", "EMP_002_YASH", "EMP_003_DEV", "EMP_004_HET", "EMP_005_NEHA"]
    rogue_user = random.choice(all_users)
    normal_users = [u for u in all_users if u != rogue_user]
    print(f"[INFO] Target Acquired. Rogue Insider for this simulation: {rogue_user}")

    prompt = f"""
Generate exactly 15 JSON banking logs for a demo representing a Cross-System Insider Threat
spanning CORE_BANKING, CRM, TREASURY, and LOANS systems.
Return ONLY a raw JSON array. No markdown, no code fences, no asterisks, no emojis anywhere.

Logs 1 to 4 (NORMAL - CORE_BANKING & CRM):
- user_id: randomly pick from {json.dumps(normal_users)}
- system: "CORE_BANKING" or "CRM"
- action: "LOGIN_SUCCESS", "VIEW_RECORD", or "DOMESTIC_TRANSFER"
- geo_location: "Mumbai, MH" or "Delhi, DL"
- is_business_hours: true

Logs 5 to 8 (NORMAL - TREASURY & LOANS):
- user_id: randomly pick from {json.dumps(normal_users)}
- system: "TREASURY" or "LOANS"
- action for TREASURY: "BOND_QUERY", "RATE_CHECK", or "POSITION_VIEW"
- action for LOANS: "LOAN_STATUS_CHECK", "DISBURSEMENT_VIEW", or "VIEW_RECORD"
- geo_location: "Mumbai, MH" or "Bangalore, KA"
- is_business_hours: true

Logs 9 to 12 (NORMAL - Mixed):
- user_id: randomly pick from {json.dumps(normal_users)}
- system: randomly any of "CORE_BANKING", "CRM", "TREASURY", "LOANS"
- action: appropriate normal action for that system
- geo_location: "Mumbai, MH", "Delhi, DL", or "Bangalore, KA"
- is_business_hours: true

Log 13 (RECON - CRM DATA HOARDING ~75 RISK):
- user_id: "{rogue_user}"
- system: "CRM"
- action: "BULK_EXPORT"
- geo_location: "Moscow, RU"
- is_business_hours: false

Log 14 (HONEYTOKEN TRIPWIRE - 100 RISK):
- user_id: "{rogue_user}"
- system: "CORE_BANKING"
- action: "UNAUTHORIZED_API_CALL"
- account_accessed: "ACC_9999_GOD_MODE"
- geo_location: "Moscow, RU"
- is_business_hours: false

Log 15 (EXFILTRATION - 100 RISK):
- user_id: "{rogue_user}"
- system: "EMAIL"
- action: "SEND_LARGE_ATTACHMENT_EXTERNAL"
- account_accessed: "hacker_drop@proton.me"
- geo_location: "Moscow, RU"
- is_business_hours: false

REQUIRED FIELDS FOR EVERY LOG (include all or it will crash):
event_id (leave as empty string ""), event_description (1 clinical sentence, no emojis),
user_id, department, system, action, amount_inr (float), account_accessed,
ip_address, geo_location, is_business_hours (boolean), timestamp (ISO8601 format).
"""

    try:
        response_text = await asyncio.to_thread(generate_with_retry_sync, prompt)
        if "XAI ENGINE OFFLINE" in response_text:
            raise Exception("API Keys Exhausted during scenario generation.")
        scenario = json.loads(response_text.replace("```json", "").replace("```", "").strip())
        print("[SUCCESS] Scenario Generated via AI. Commencing Drip-Feed...")
    except Exception as e:
        print(f"[ERROR] Simulation AI Failure: {e}")
        return

    print("-" * 50)
    for i, log in enumerate(scenario):
        # ── Sanitize ALL required UnifiedEvent fields ──
        log["event_id"] = f"live_gen_{int(time.time())}_{i}"

        if not log.get("user_id"):          log["user_id"] = random.choice(normal_users)
        if not log.get("department"):       log["department"] = "OPERATIONS"
        if not log.get("system"):           log["system"] = "CORE_BANKING"
        if not log.get("action"):           log["action"] = "VIEW_RECORD"
        if not log.get("ip_address"):       log["ip_address"] = "192.168.1.100"
        if not log.get("geo_location"):     log["geo_location"] = "Mumbai, MH"
        if not log.get("account_accessed"): log["account_accessed"] = "SYS_NODE_AUTH"
        if not log.get("event_description"): log["event_description"] = "System operation executed."
        if not log.get("timestamp"):        log["timestamp"] = datetime.utcnow().isoformat() + "Z"
        if log.get("is_business_hours") is None: log["is_business_hours"] = True

        amt = log.get("amount_inr")
        log["amount_inr"] = (
            0.0 if amt is None
            else float(str(amt).replace(",", "").replace("$", "").replace("INR", "").strip())
            if isinstance(amt, str) else float(amt)
        )

        biz = log.get("is_business_hours")
        log["is_business_hours"] = (
            biz.lower() == "true" if isinstance(biz, str)
            else True if biz is None else bool(biz)
        )

        event_obj = UnifiedEvent(**log)
        await ingest_event(event_obj)

        sys_label = log["system"]
        action_label = log["action"]

        if log["account_accessed"] == "ACC_9999_GOD_MODE":
            print(f"[CRITICAL] [{i+1}/15] HONEYTOKEN HIT: {log['user_id']} -> {sys_label} -> {action_label}")
        elif "LARGE_ATTACHMENT" in action_label:
            print(f"[CRITICAL] [{i+1}/15] EXFILTRATION: {log['user_id']} -> {sys_label} -> {action_label}")
        elif action_label == "BULK_EXPORT":
            print(f"[WARNING]  [{i+1}/15] RECON DETECTED: {log['user_id']} -> {sys_label} -> {action_label}")
        else:
            print(f"[INFO]     [{i+1}/15] Normal: {log['user_id']} -> {sys_label}")

        await asyncio.sleep(2)

    print("-" * 50)
    print("[SUCCESS] Cross-Silo Simulation Complete. All 5 systems covered.")


@app.post("/api/v1/events/simulate")
async def start_simulation(bg_tasks: BackgroundTasks):
    bg_tasks.add_task(background_simulation)
    return {"status": "success"}
import os

if os.path.exists("static"):
    # Mount the static folder at the root URL
    app.mount("/", StaticFiles(directory="static", html=True), name="static")

    # Fallback for React Router (Single Page Application)
    @app.exception_handler(404)
    async def custom_404_handler(request, exc):
        return FileResponse("static/index.html")
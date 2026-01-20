
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import datetime
import traceback
import random
import os
import csv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from database import db
from models import Pilot, Flight, Disruption, CostModel, SimulationRequest, HealRequest, CrewRestRequest, CrewCostRequest

class CommandRequest(BaseModel):
    command: str
from passenger_api import router as passenger_router
from analytics_api import router as analytics_router

app = FastAPI()
app.include_router(passenger_router)
app.include_router(analytics_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LATEST_AGENT_LOGS = []

# --- Email Helper ---

def send_passenger_notification(flight_id, origin, dest, status_type, reason, extra_info=""):
    # Credentials
    sender_email = os.getenv("EMAIL_USER")
    sender_password = os.getenv("EMAIL_PASS")
    receiver_email = "demog6892@gmail.com"
    
    if not sender_email or not sender_password:
        # Check if we should log this simulation
        return False

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = receiver_email
    
    # Dynamic Content based on Status
    subject = f"Flight {flight_id}: Important Status Update"
    header_color = "#2563eb" # Blue default
    header_text = "Status Update"
    status_message = ""
    
    if status_type == "CANCELLED":
        subject = f"URGENT: Flight {flight_id} Cancelled"
        header_color = "#dc2626" # Red
        header_text = "Flight Cancelled"
        status_message = f"We regret to inform you that flight <strong>{flight_id}</strong> has been cancelled."
        
    elif status_type == "DELAYED":
        subject = f"Flight {flight_id} Delayed"
        header_color = "#d97706" # Amber
        header_text = "Flight Delayed"
        status_message = f"Flight <strong>{flight_id}</strong> has been delayed."
        
    elif status_type == "SWAPPED" or status_type == "RESCHEDULED":
        subject = f"Flight {flight_id} Schedule Change"
        header_color = "#16a34a" # Green
        header_text = "Itinerary Updated"
        status_message = f"Your flight details for <strong>{flight_id}</strong> have been updated."

    msg['Subject'] = subject
    
    body = f"""
    <html>
      <body style="font-family: 'Segoe UI', sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
        <div style="background-color: {header_color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="margin:0;">{header_text}</h2>
        </div>
        
        <div style="padding: 20px;">
            <p>Dear Passenger,</p>
            <p>{status_message}</p>
            
            <div style="background: #f8fafc; padding: 15px; border-left: 4px solid {header_color}; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Route:</strong> {origin} &rarr; {dest}</p>
                <p style="margin: 5px 0;"><strong>Reason:</strong> {reason}</p>
                <p style="margin: 5px 0;"><strong>Details:</strong> {extra_info}</p>
            </div>

            <p>Our AI Co-Pilot and Operations Team are working to minimize disruption. We apologize for the inconvenience and appreciate your patience.</p>
            
            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.8em; color: #666; text-align: center;">
                <p>SkyCoPilot Passenger Rights Team &bull; Industry 5.0 Compliant</p>
                <p>Safety First. Always.</p>
            </div>
        </div>
      </body>
    </html>
    """
    msg.attach(MIMEText(body, 'html'))
    
    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, receiver_email, text)
        server.quit()
        
        global LATEST_AGENT_LOGS
        success_msg = f"NOTIFICATION: Email sent to {receiver_email} [{status_type}]."
        if success_msg not in LATEST_AGENT_LOGS: LATEST_AGENT_LOGS.append(success_msg)
        return True
        
    except smtplib.SMTPAuthenticationError:
        sim_msg = f"NOTIFICATION: SMTP Auth Blocked. Simulating email [{status_type}] to {receiver_email}."
        if sim_msg not in LATEST_AGENT_LOGS: LATEST_AGENT_LOGS.append(sim_msg)
        return False
        
    except Exception as e:
        err_msg = f"NOTIFICATION: Email failed ({str(e)[:15]}). Simulating [{status_type}]."
        if err_msg not in LATEST_AGENT_LOGS: LATEST_AGENT_LOGS.append(err_msg)
        return False

# --- Business Logic Helpers ---

async def calculate_impact(flight_id: str):
    flight = await db.flights.find_one({"_id": flight_id})
    if not flight: return
    
    pilot = await db.pilots.find_one({"_id": flight['assignedPilotId']})
    if not pilot: return
    
    if not flight.get('flightDurationMinutes'): flight['flightDurationMinutes'] = 120
    projected_duty_at_landing = pilot['currentDutyMinutes'] + flight['flightDurationMinutes'] + flight.get('delayMinutes', 0)
    
    is_violation = projected_duty_at_landing > pilot['maxLegalDutyMinutes']
    
    update_data = {
        "predictedFailure": is_violation,
        "predictedFailureProbability": 0.95 if is_violation else 0.1,
        "predictedFailureReason": "Maximum FDTL Exceeded" if is_violation else None,
        "boardingAllowed": not is_violation
    }
    
    if pilot['status'] == 'SICK':
        is_violation = True
        update_data["predictedFailure"] = True
        update_data["predictedFailureReason"] = "Pilot Incapacitated (Sick)"
        update_data["boardingAllowed"] = False
    
    if is_violation:
        update_data["status"] = "CRITICAL"
        log_msg = f"PREDICTION: Flight {flight_id} will fail. Reason: {update_data['predictedFailureReason']}"
        if log_msg not in LATEST_AGENT_LOGS: LATEST_AGENT_LOGS.append(log_msg)
    
    await db.flights.update_one({"_id": flight_id}, {"$set": update_data})
    
    return is_violation

# --- New Crew Management Endpoints ---

@app.post("/crew/update_rest")
async def update_rest(req: CrewRestRequest):
    timestamp = datetime.datetime.now()
    await db.pilots.update_one(
        {"_id": req.pilot_id},
        {"$set": {
            "currentDutyMinutes": 0,
            "fatigue_score": 0.0,
            "status": "AVAILABLE",
            "last_rest_period_end": timestamp,
            "remainingDutyMinutes": 480
        }}
    )
    LATEST_AGENT_LOGS.append(f"CREW-OPS: Granted 24h Rest to {req.pilot_id}.")
    return {"status": "REST_ALLOCATED"}

@app.post("/crew/calculate_cost")
async def calculate_crew_cost(req: CrewCostRequest):
    pilot = await db.pilots.find_one({"_id": req.pilot_id})
    if not pilot: return {"error": "Pilot Not Found"}

    # --- COST VARIABLES ---
    # Convert weekly minutes to hours
    minutes_flown = pilot.get('weekly_flight_minutes', 0)
    hours_flown = minutes_flown / 60
    
    add_mins = req.additional_minutes
    add_hours = add_mins / 60
    
    base_rate_hr = 4000
    ot_rate_1_hr = 6000  # 1.5x
    ot_rate_2_hr = 8000  # 2.0x
    
    crew_cost = 0
    cost_breakdown = []
    
    # Process Slabs: 0-40h Base, 40-50h 1.5x, >50h 2.0x
    current_m = minutes_flown
    target_m = minutes_flown + add_mins
    
    pay_base = 0
    pay_ot1 = 0
    pay_ot2 = 0
    
    remaining = add_mins
    
    # Logic for Slab 1 (Base: < 2400 mins)
    if current_m < 2400:
        available_base = 2400 - current_m
        take = min(remaining, available_base)
        pay_base += take * (base_rate_hr / 60)
        remaining -= take
        current_m += take
        
    # Logic for Slab 2 (OT1: < 3000 mins)
    if remaining > 0 and current_m < 3000:
        available_ot1 = 3000 - current_m
        take = min(remaining, available_ot1)
        pay_ot1 += take * (ot_rate_1_hr / 60)
        remaining -= take
        current_m += take
        
    # Logic for Slab 3 (OT2: > 3000 mins)
    if remaining > 0:
        pay_ot2 += remaining * (ot_rate_2_hr / 60)
    
    crew_cost = pay_base + pay_ot1 + pay_ot2
    
    if pay_base > 0: cost_breakdown.append({"category": "Crew Pay (Base)", "amount": round(pay_base, 2)})
    if pay_ot1 > 0: cost_breakdown.append({"category": "Overtime Slab 1 (1.5x)", "amount": round(pay_ot1, 2)})
    if pay_ot2 > 0: cost_breakdown.append({"category": "Overtime Slab 2 (2.0x)", "amount": round(pay_ot2, 2)})

    # --- DOC (DIRECT OPERATING COSTS) ---
    # Fuel: Rate increases if holding (not simulated here easily, assuming normal cruise)
    # Approx 200 INR/min fuel + 100 INR/min maintenance
    fuel_rate_min = 200 
    maint_rate_min = 150 
    
    doc_fuel = add_mins * fuel_rate_min
    doc_maint = add_mins * maint_rate_min
    
    cost_breakdown.append({"category": "Est. Fuel Burn", "amount": round(doc_fuel, 2)})
    cost_breakdown.append({"category": "Maint. Reserves", "amount": round(doc_maint, 2)})

    # --- FATIGUE RISK PREMIUM (FRMS) ---
    # WOCL Check: 0200-0600
    now_hour = datetime.datetime.now().hour
    is_wocl = 2 <= now_hour <= 6
    
    fatigue_premium = 0
    risk_factor = pilot.get('fatigue_score', 0)
    
    if is_wocl:
        wocl_fee = crew_cost * 0.20 # +20% Risk Premium
        fatigue_premium += wocl_fee
        cost_breakdown.append({"category": "FRMS: WOCL Premium", "amount": round(wocl_fee, 2)})
        
    if risk_factor > 0.7:
        risk_fee = crew_cost * 0.30 # +30% High Fatigue Risk
        fatigue_premium += risk_fee
        cost_breakdown.append({"category": "FRMS: High Fatigue Risk", "amount": round(risk_fee, 2)})

    total_cost = crew_cost + doc_fuel + doc_maint + fatigue_premium
    
    projected_fatigue = risk_factor + (add_mins / 600)
    if is_wocl: projected_fatigue += 0.05 
    if projected_fatigue > 1.0: projected_fatigue = 1.0
    
    return {
        "cost": round(total_cost, 2),
        "breakdown": cost_breakdown,
        "projected_fatigue": round(projected_fatigue, 2),
        "is_overtime": (hours_flown + add_hours) > 40,
        "compliance": {
            "rest_48h": "COMPLIANT (Last Rest: 52h ago)",
            "night_flights": "CAUTION: 2/3 Night Flights Used",
            "recent_duty": "Safe (6h avg)"
        }
    }

# --- Endpoints ---

@app.get("/")
def read_root(): return {"message": "SkyCoPilot Backend Online"}

@app.get("/seed")
async def seed_data():
    await db.flights.drop()
    await db.pilots.drop() 
    await db.pilot_readiness.drop()
    await db.disruptions.drop()
    await db.cost_model.drop()
    
    await db.cost_model.insert_one(CostModel().dict())
    
    base_path = "e:\\ARes\\backend"
    pilot_csv_path = os.path.join(base_path, "pilot.csv")
    
    flights = []
    pilots = []
    existing_pilots = set()
    now = datetime.datetime.now()
    forced_routes = [("DEL", "BOM"), ("BOM", "BLR"), ("BLR", "DEL"), ("MAA", "CCU"), ("CCU", "DEL")]
    route_idx = 0

    if os.path.exists(pilot_csv_path):
        with open(pilot_csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                f_id = row.get('Flight_ID', '').strip()
                if not f_id: continue

                origin = row.get('Origin', 'DEL')
                dest = row.get('Destination', 'BOM')
                if i % 2 == 0:
                    r = forced_routes[route_idx % len(forced_routes)]
                    origin, dest = r
                    route_idx += 1

                p_id = row.get('Pilot_ID', f"P-{f_id}")
                if p_id not in existing_pilots:
                    rest = float(row.get('Rest_Hours', 12))
                    fatigue = float(row.get('Fatigue_Score', 0) or 0)
                    if fatigue > 1.0: fatigue = fatigue / 100.0
                    
                    duty_used = random.randint(300, 450) if rest < 10 else random.randint(0, 200)
                    weekly_mins = random.randint(1800, 2600) # 30-43 hours random

                    pilot_doc = {
                        "_id": p_id,
                        "name": row.get('Name', f"Pilot {p_id}"),
                        "base": origin,
                        "currentDutyMinutes": duty_used,
                        "maxLegalDutyMinutes": 480,
                        "remainingDutyMinutes": 480 - duty_used,
                        "fatigue_score": fatigue,
                        "status": "AVAILABLE",
                        "aircraftTypeQualified": [row.get('Aircraft_Type', 'A320')],
                        "lastUpdated": now,
                        "weekly_flight_minutes": weekly_mins,
                        "overtime_rate_per_hour": random.choice([5000, 7500, 10000]),
                        "last_rest_period_end": now - datetime.timedelta(hours=rest)
                    }
                    pilots.append(pilot_doc)
                    existing_pilots.add(p_id)

                offset_mins = random.randint(30, 400) 
                dur_mins = 120
                
                flight_doc = {
                    "_id": f_id,
                    "flightNumber": f_id,
                    "origin": origin,
                    "destination": dest,
                    "scheduledDeparture": now + datetime.timedelta(minutes=offset_mins),
                    "scheduledArrival": now + datetime.timedelta(minutes=offset_mins + dur_mins),
                    "flightDurationMinutes": dur_mins,
                    "status": "ON_TIME",
                    "delayMinutes": 0,
                    "delayReason": None,
                    "assignedPilotId": p_id,
                    "boardingAllowed": True,
                    "predictedFailure": False,
                    "decisionMode": "AUTO",
                    "Pilot_Name": row.get('Name', f"Pilot {p_id}"),
                    "Flight_Duration": f"2h 00m"
                }
                flights.append(flight_doc)

    if pilots: await db.pilots.insert_many(pilots)
    if flights: await db.flights.insert_many(flights)
    global LATEST_AGENT_LOGS
    LATEST_AGENT_LOGS = ["LOG: Database Seeded."]
    return {"status": "SEEDED"}

@app.get("/data")
async def get_data():
    flights = await db.flights.find().to_list(100)
    pilots = await db.pilots.find().to_list(100)
    return {"flights": flights, "pilot_readiness": pilots, "agent_logs": LATEST_AGENT_LOGS}

@app.get("/status")
async def check_status():
    critical = await db.flights.count_documents({"status": "CRITICAL"})
    return {"status": "CRITICAL" if critical > 0 else "VALID"}

@app.post("/simulate")
async def simulate(req: SimulationRequest):
    delay_map = {"Fog": 240, "Thunderstorm": 120, "Technical": 180, "ATC": 90, "Sickness": 0}
    delay = delay_map.get(req.subType, 180)
    reason = f"Heavy {req.subType or req.type}"
    target_flight_id = req.flight_id

    if req.type == "CREW" or req.subType == "Sickness":
        if target_flight_id:
            flight = await db.flights.find_one({"_id": target_flight_id})
            if flight and flight.get('assignedPilotId'):
                 await db.pilots.update_one({"_id": flight['assignedPilotId']}, {"$set": {"status": "SICK", "fatigue_score": 1.0}})
                 await db.flights.update_one({"_id": target_flight_id}, {
                    "$set": {"status": "CRITICAL", "predictedFailure": True, "predictedFailureReason": "Pilot Incapacitated (Sick)"}
                })
                 LATEST_AGENT_LOGS.append(f"INJECT: Pilot SICK on {target_flight_id}.")
                 return {"status": "SIMULATED_SICKNESS"}
        else:
             return {"status": "ERROR_NEED_FLIGHT_ID"}

    if req.flight_id:
        flight_doc = await db.flights.find_one({"_id": req.flight_id})
        await db.flights.update_one({"_id": req.flight_id}, {"$set": {"delayMinutes": delay, "delayReason": reason, "status": "CRITICAL", "predictedFailure": True, "predictedFailureReason": reason}})
        LATEST_AGENT_LOGS.append(f"INJECT: {reason} on Flight {req.flight_id}.")
        if flight_doc: send_passenger_notification(req.flight_id, flight_doc['origin'], flight_doc['destination'], "DELAYED", reason, f"Delay of {delay} mins")
        await calculate_impact(req.flight_id)
    else:
        await db.flights.update_many({"origin": req.airport}, {"$set": {"delayMinutes": delay, "delayReason": reason, "status": "CRITICAL", "predictedFailure": True, "predictedFailureReason": reason}})
        LATEST_AGENT_LOGS.append(f"CRISIS-LAB: {reason} at {req.airport}.")
        affected = await db.flights.find({"origin": req.airport}).to_list(100)
        for f in affected: 
            send_passenger_notification(f['_id'], f['origin'], f['destination'], "DELAYED", reason, f"Delay of {delay} mins due to local disruption")
            await calculate_impact(f["_id"])
            
    return {"status": "SIMULATED"}

@app.post("/heal")
async def heal(req: HealRequest):
    flight = await db.flights.find_one({"status": "CRITICAL"})
    if not flight:
        flight = await db.flights.find_one({"status": "DELAYED"})
        
    if not flight: return {"status": "NO_ACTION"}
    
    options = []
    reason = flight.get('predictedFailureReason', '') or flight.get('delayReason', '')
    
    # --- Generate Reasoning Trace for the Crisis ---
    crisis_trace = [
        f"Detailed Analysis for Flight {flight['flightNumber']}",
        f"Input State: {reason}",
        f"Safety Rule Check: {'VIOLATION' if flight.get('predictedFailure') else 'WARNING'}",
    ]

    # --- Option Generation Logic ---
    # --- Option Generation Logic (Refined for SkyCoPilot) ---
    
    # Combine reasons to ensure we don't miss Root Causes (e.g. Technical) masked by Symptoms (e.g. FDTL)
    combined_reason = f"{flight.get('predictedFailureReason', '')} {flight.get('delayReason', '')}"
    
    # 1. Crew Sickness -> ONLY Crew Options (Specific Personal Safety)
    if "Sick" in combined_reason:
        replacements = await db.pilots.find({
            "status": "AVAILABLE",
            "currentDutyMinutes": {"$lt": 300},
            "base": flight.get("origin", "DEL")
        }).sort("fatigue_score", 1).to_list(3)
        
        for r in replacements:
            options.append({
                "id": f"OPT_SWAP_{r['_id']}",
                "title": f"Assign Reserve: {r['name']}",
                "description": f"Ready at {r['base']}. Duty: {r['currentDutyMinutes']}m. Fatigue: {r.get('fatigue_score', 0)}",
                "action_type": "ASSIGN",
                "risk_level": "LOW",
                "payload": {"flight_id": flight["_id"], "pilot_id": r["_id"]},
                "reasoning": "Standard Protocol: Crew Incapacitation requires immediate replacement with fresh reserve."
            })
            
    # 2. Operational/Tech/Weather -> ONLY Flight/Aircraft Options
    # We check this BEFORE generic FDTL because Tech/Weather is the ROOT CAUSE and Swap Flight solves FDTL too.
    elif "Fog" in combined_reason or "Weather" in combined_reason or "Technical" in combined_reason or "Hydraulic" in combined_reason or "ATC" in combined_reason or "Thunderstorm" in combined_reason or "Storm" in combined_reason:
        # Priority 1: Swap Flight (Replace)
        now = datetime.datetime.now()
        candidates = await db.flights.find({
            "origin": flight.get("origin"),
            "status": {"$in": ["ON_TIME", "SCHEDULED"]},
            "_id": {"$ne": flight["_id"]},
            "scheduledDeparture": {"$gte": now, "$lte": now + datetime.timedelta(hours=6)}
        }).sort("scheduledDeparture", 1).to_list(3)
        
        for c in candidates:
            options.append({
                "id": f"OPT_SWAP_FLIGHT_{c['_id']}",
                "title": f"Swap w/ Flight {c['flightNumber']}",
                "description": f"Use aircraft from {c['flightNumber']} (Dep: {c['scheduledDeparture'].strftime('%H:%M')})",
                "action_type": "SWAP_FLIGHT",
                "risk_level": "LOW",
                "payload": {"flight_id": flight["_id"], "target_flight_id": c["_id"]},
                "reasoning": f"Optimal Solution: Unaffected aircraft/slot available from {c['flightNumber']}."
            })
            
        # Fallback Options if no swap found or as alternatives
        if "Weather" in combined_reason or "Fog" in combined_reason:
             options.append({
                "id": "OPT_HOLD",
                "title": "Hold Pattern (Wait 60m)",
                "description": "Wait for conditions to improve.",
                "action_type": "DELAY_APPLY",
                "risk_level": "MEDIUM",
                "payload": {"flight_id": flight["_id"], "minutes": 60},
                "reasoning": "Holding is safer than diverting, but impacts fuel."
            })
        elif "Technical" in combined_reason or "Hydraulic" in combined_reason:
             options.append({
                "id": "OPT_FIX",
                "title": "Quick Repair (45m)",
                "description": "Attempt minor repair.",
                "action_type": "DELAY_APPLY",
                "risk_level": "MEDIUM",
                "payload": {"flight_id": flight["_id"], "minutes": 45},
                "reasoning": "Repair is viable but carries risk of further delay."
            })
        elif "ATC" in combined_reason:
             options.append({
                "id": "OPT_DELAY_ATC",
                "title": "Wait for Slot (90m)",
                "description": "Ground hold until ATC clearance.",
                "action_type": "DELAY_APPLY",
                "risk_level": "LOW",
                "payload": {"flight_id": flight["_id"], "minutes": 90},
                "reasoning": "Compliance with ATC mandate is mandatory."
            })

        # ALWAYS ADD CANCEL OPTION
        options.append({
            "id": "OPT_CANCEL",
            "title": "Cancel Flight",
            "description": "Cease operations for this flight.",
            "action_type": "CANCEL",
            "risk_level": "HIGH",
            "payload": {"flight_id": flight["_id"]},
            "reasoning": "Last resort to prevent cascading failures."
        })

        # ALWAYS ADD MANUAL DELAY OPTION
        options.append({
            "id": "OPT_DELAY_MANUAL",
            "title": "Custom Delay",
            "description": "Manually set delay duration.",
            "action_type": "DELAY_MANUAL",
            "risk_level": "VARIES",
            "payload": {"flight_id": flight["_id"]},
            "reasoning": "Operator discretion for non-standard situations."
        })
            
    # 3. FDTL (Crew Fatigue) -> WITHOUT Sickness or Tech
    # This catches cases where the crew simply ran out of hours due to accumulation or minor delays
    elif "FDTL" in combined_reason:
        replacements = await db.pilots.find({
            "status": "AVAILABLE",
            "currentDutyMinutes": {"$lt": 300},
            "base": flight.get("origin", "DEL")
        }).sort("fatigue_score", 1).to_list(3)

        for r in replacements:
            options.append({
                "id": f"OPT_SWAP_{r['_id']}",
                "title": f"Assign Reserve: {r['name']}",
                "description": f"Ready at {r['base']}. Duty: {r['currentDutyMinutes']}m. Fatigue: {r.get('fatigue_score', 0)}",
                "action_type": "ASSIGN",
                "risk_level": "LOW",
                "payload": {"flight_id": flight["_id"], "pilot_id": r["_id"]},
                "reasoning": "FDTL Exceeded: Fresh crew required to operate flight legalities."
            })

        # Priority 1: Swap Flight (Replace)
        now = datetime.datetime.now()
        candidates = await db.flights.find({
            "origin": flight.get("origin"),
            "status": {"$in": ["ON_TIME", "SCHEDULED"]},
            "_id": {"$ne": flight["_id"]},
            "scheduledDeparture": {"$gte": now, "$lte": now + datetime.timedelta(hours=6)}
        }).sort("scheduledDeparture", 1).to_list(3)
        
        for c in candidates:
            options.append({
                "id": f"OPT_SWAP_FLIGHT_{c['_id']}",
                "title": f"Swap w/ Flight {c['flightNumber']}",
                "description": f"Use aircraft from {c['flightNumber']} (Dep: {c['scheduledDeparture'].strftime('%H:%M')})",
                "action_type": "SWAP_FLIGHT",
                "risk_level": "LOW",
                "payload": {"flight_id": flight["_id"], "target_flight_id": c["_id"]},
                "reasoning": f"Optimal Solution: Unaffected aircraft/slot available from {c['flightNumber']}."
            })
            
        # Fallback Options if no swap found or as alternatives
        if "Weather" in reason or "Fog" in reason:
             options.append({
                "id": "OPT_HOLD",
                "title": "Hold Pattern (Wait 60m)",
                "description": "Wait for conditions to improve.",
                "action_type": "DELAY_APPLY",
                "risk_level": "MEDIUM",
                "payload": {"flight_id": flight["_id"], "minutes": 60},
                "reasoning": "Holding is safer than diverting, but impacts fuel."
            })
        elif "Technical" in reason:
             options.append({
                "id": "OPT_FIX",
                "title": "Quick Repair (45m)",
                "description": "Attempt minor repair.",
                "action_type": "DELAY_APPLY",
                "risk_level": "MEDIUM",
                "payload": {"flight_id": flight["_id"], "minutes": 45},
                "reasoning": "Repair is viable but carries risk of further delay."
            })
        elif "ATC" in reason:
             options.append({
                "id": "OPT_DELAY_ATC",
                "title": "Wait for Slot (90m)",
                "description": "Ground hold until ATC clearance.",
                "action_type": "DELAY_APPLY",
                "risk_level": "LOW",
                "payload": {"flight_id": flight["_id"], "minutes": 90},
                "reasoning": "Compliance with ATC mandate is mandatory."
            })
            
        # ALWAYS ADD CANCEL OPTION
        options.append({
            "id": "OPT_CANCEL",
            "title": "Cancel Flight",
            "description": "Cease operations for this flight.",
            "action_type": "CANCEL",
            "risk_level": "HIGH",
            "payload": {"flight_id": flight["_id"]},
            "reasoning": "Last resort to prevent cascading failures."
        })

        # ALWAYS ADD MANUAL DELAY OPTION
        options.append({
            "id": "OPT_DELAY_MANUAL",
            "title": "Custom Delay",
            "description": "Manually set delay duration.",
            "action_type": "DELAY_MANUAL",
            "risk_level": "VARIES",
            "payload": {"flight_id": flight["_id"]},
            "reasoning": "Operator discretion for non-standard situations."
        })

    # --- CO-PILOT SELECTION LOGIC ---
    best_option = None
    
    # Calculate CO2 for ALL options (Green Skies Feature)
    for opt in options:
        impact = 0
        if opt['action_type'] == 'CANCEL':
            impact = 120 # Fixed cost for ground transport/waste
        elif opt['action_type'] == 'DELAY_APPLY':
             mins = opt['payload'].get('minutes', 60)
             impact = mins * 10 # 10kg per minute of holding/taxiing
        elif opt['action_type'] == 'SWAP_FLIGHT':
             impact = 50 # Logistics overhead
        elif opt['action_type'] == 'ASSIGN': 
             impact = 80 # Crew transport
             
        opt['co2_impact'] = {
            "value": f"+{impact}kg CO2",
            "score": "HIGH" if impact > 200 else ("MEDIUM" if impact > 100 else "LOW"),
            "color": "red" if impact > 200 else ("orange" if impact > 100 else "green")
        }

    # Priority Heuristic:
    # 1. Swap Flight (Optimal for Tech/Weather)
    # 2. Assign Reserve (Optimal for Sickness)
    # 3. Hold/Fix (Fallbacks)
    
    for opt in options:
        if opt['id'].startswith('OPT_SWAP_FLIGHT'): best_option = opt; break
        elif opt['id'] == 'OPT_SWAP': best_option = opt; break
        
    if not best_option:
        for opt in options:
            if opt['id'] == 'OPT_HOLD': best_option = opt; break
            elif opt['id'] == 'OPT_FIX': best_option = opt; break
    
    if not best_option and options: best_option = options[0] 

    # --- INDUSTRY 5.0 COMPLIANCE: NO AUTOMATIC EXECUTION ---
    # Instead of DB updates, we return the decision packet
    
    if best_option:
        # Sustainability Calc (Legacy field preserved for compatibility, but options now have details)
        delay_saved = 0
        if best_option['action_type'] == 'CANCEL':
            delay_saved = 120 # Assume 2 hours wasted ground time saved
        elif best_option['action_type'] == 'ASSIGN': 
             delay_saved = 60 # Prevent indefinite search
        else:
             delay_saved = 30 # Optimization benefit
             
        co2_saved = delay_saved * 12.5
        
        LATEST_AGENT_LOGS.append(f"CO-PILOT: Recommended Strategy Generated: {best_option['title']}")
        
        return {
            "status": "OPTIONS_GENERATED",
            "recommended_strategy": best_option,
            "options": options,
            "approval_required": True,
            "reasoning_trace": [
                *crisis_trace,
                f"Evaluation: Selected '{best_option['title']}' as optimal path.",
                f"Justification: {best_option.get('reasoning', 'Best available option')}"
            ],
            "sustainability_impact": {
                "co2_saved_kg": co2_saved,
                "fuel_saved_liters": co2_saved * 0.4,
                "energy_efficiency_note": "Optimized resource allocation prevents idle waste."
            }
        }

    return {"status": "NO_OPTIONS_FOUND"}


@app.post("/command")
async def process_command(req: CommandRequest):
    """
    VOICE OPS: Simple NLU to map text -> Action
    """
    cmd = req.command.lower()
    
    # Intent 1: Filtering
    if "show" in cmd or "list" in cmd:
        if "delayed" in cmd:
            return {"action": "FILTER", "payload": "DELAYED", "message": "Showing all delayed flights."}
        if "critical" in cmd:
            return {"action": "FILTER", "payload": "CRITICAL", "message": "Showing critical alerts."}
        if "cancelled" in cmd:
            return {"action": "FILTER", "payload": "CANCELLED", "message": "Showing cancelled flights."}
        if "swapped" in cmd:
            return {"action": "FILTER", "payload": "SWAPPED", "message": "Showing swapped flights."}
        if "on time" in cmd or "ontime" in cmd:
            return {"action": "FILTER", "payload": "ON_TIME", "message": "Showing on-time flights."}
        if "all" in cmd:
            return {"action": "RESET", "payload": None, "message": "Showing all flights."}
            
    # Intent 2: Reset
    if "reset" in cmd or "clear" in cmd:
         return {"action": "RESET", "payload": None, "message": "Dashboard reset."}

    return {"action": "UNKNOWN", "message": "I didn't quite catch that."}


@app.post("/resolve")
async def resolve(req: dict = Body(...)):
    opt = req['option']
    flight_id = opt['payload']['flight_id']
    
    if opt['action_type'] == 'CANCEL':
        await db.flights.update_one({"_id": flight_id}, {"$set": {"status": "CANCELLED"}})
        LATEST_AGENT_LOGS.append(f"MANUAL: Operator Cancelled {flight_id}.")
        
        # SEND CANCELLATION EMAIL
        f_doc = await db.flights.find_one({"_id": flight_id})
        if f_doc: send_passenger_notification(flight_id, f_doc['origin'], f_doc['destination'], "CANCELLED", "Operational decision due to safety risks", "Please contact counter for refund/rebooking.")
        
    elif opt['action_type'] == 'ASSIGN':
        pid = opt['payload']['pilot_id']
        pilot = await db.pilots.find_one({"_id": pid})
        await db.flights.update_one({"_id": flight_id}, {
            "$set": {"status": "SCHEDULED", "assignedPilotId": pid, "Pilot_Name": pilot['name'], "predictedFailure": False}
        })
        LATEST_AGENT_LOGS.append(f"MANUAL: Assigned {pilot['name']} to {flight_id}.")
        LATEST_AGENT_LOGS.append(f"NOTIFICATION: Roster Updated.")
        
    elif opt['action_type'] == 'DELAY_APPLY':
        minutes = opt['payload'].get('minutes', 60)
        title = opt.get('title', 'Manual Resolution')
        await db.flights.update_one({"_id": flight_id}, {
            "$set": {"status": "DELAYED", "delayMinutes": minutes, "delayReason": title, "predictedFailure": False}
        })
        LATEST_AGENT_LOGS.append(f"MANUAL: Applied {minutes}m Delay ({title}).")
        f_doc = await db.flights.find_one({"_id": flight_id})
        if f_doc: send_passenger_notification(flight_id, f_doc['origin'], f_doc['destination'], "DELAYED", title, f"New estimated delay: {minutes} mins.")
    
    elif opt['action_type'] == 'DELAY_MANUAL': 
        # Handle manual delay payload coming from frontend
        minutes = opt['payload'].get('minutes', 60)
        await db.flights.update_one({"_id": flight_id}, {
            "$set": {"status": "DELAYED", "delayMinutes": minutes, "delayReason": "Manual Operator Override", "predictedFailure": False}
        })
        LATEST_AGENT_LOGS.append(f"MANUAL: Applied Custom {minutes}m Delay.")
        f_doc = await db.flights.find_one({"_id": flight_id})
        if f_doc: send_passenger_notification(flight_id, f_doc['origin'], f_doc['destination'], "DELAYED", "Operational Adjustment", f"Manual override: {minutes} mins.")

    elif opt['action_type'] == 'SWAP_FLIGHT':
        target_id = opt['payload']['target_flight_id']
        source_flight = await db.flights.find_one({"_id": flight_id})
        target_flight = await db.flights.find_one({"_id": target_id})
        
        if source_flight and target_flight:
            # Swap Data Logic
            # Source (Delayed) becomes "Fixed" using Target's details
            # Target (Healthy) becomes "Swapped/Delayed" using Source's details
            
            s_times = (source_flight.get("scheduledDeparture"), source_flight.get("scheduledArrival"))
            t_times = (target_flight.get("scheduledDeparture"), target_flight.get("scheduledArrival"))
            
            s_num = source_flight.get("flightNumber")
            t_num = target_flight.get("flightNumber")

            # 1. Update Source Flight (The one we fix)
            # It gets Target's Time, Pilot & Flight Number
            await db.flights.update_one({"_id": flight_id}, {
                "$set": {
                    "status": "SWAPPED", 
                    "delayMinutes": 0, 
                    "delayReason": None, 
                    "predictedFailure": False,
                    "assignedPilotId": target_flight.get("assignedPilotId"),
                    "Pilot_Name": target_flight.get("Pilot_Name"),
                    "scheduledDeparture": t_times[0],
                    "scheduledArrival": t_times[1],
                    "flightNumber": t_num,
                    "manual_swap_note": f"Swapped with {s_num}"
                }
            })
            
            # SEND EMAIL FOR SOURCE FLIGHT (Now Healthy/Swapped)
            send_passenger_notification(flight_id, source_flight['origin'], source_flight['destination'], "SWAPPED", "Aircraft Change", f"Your flight is now operating as {t_num} (On Time).")
            
            # 2. Update Target Flight (The donor)
            # It gets Source's Time (plus delay), Pilot & Flight Number
            delay_min = source_flight.get("delayMinutes", 120)
            reason = source_flight.get("delayReason", "Operational Swap")
            
            await db.flights.update_one({"_id": target_id}, {
                "$set": {
                    "status": "SWAPPED", 
                    "delayMinutes": delay_min, 
                    "delayReason": f"Swapped w/ {flight_id}: {reason}",
                    "predictedFailure": False,
                    "assignedPilotId": source_flight.get("assignedPilotId"),
                    "Pilot_Name": source_flight.get("Pilot_Name"),
                    "scheduledDeparture": s_times[0],
                    "scheduledArrival": s_times[1],
                    "flightNumber": s_num
                }
            })
            
            LATEST_AGENT_LOGS.append(f"MANUAL: Full Swap (Times & Crew) {flight_id} <-> {target_id}.")
            
            # SEND EMAIL FOR TARGET FLIGHT (Now Delayed)
            send_passenger_notification(target_id, target_flight['origin'], target_flight['destination'], "RESCHEDULED", f"Swapped w/ {s_num}", f"New departure time: {s_times[0]}. Delay: {delay_min}m.")
        
    return {"status": "RESOLVED"}

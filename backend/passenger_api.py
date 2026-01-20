from fastapi import APIRouter, HTTPException, Body
from database import db
from pydantic import BaseModel
import random
import datetime
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter(prefix="/passenger", tags=["passenger"])

class FeedbackRequest(BaseModel):
    flight_id: str
    rating: int
    comment: str

class ChatRequest(BaseModel):
    message: str
    context: str = "general"

class OptionRequest(BaseModel):
    flight_id: str
    option_id: str
    email: str

def send_passenger_email(to_email, subject, body_html):
    sender_email = os.getenv("EMAIL_USER")
    sender_password = os.getenv("EMAIL_PASS")
    
    if not sender_email or not sender_password:
        print(f"MOCK EMAIL to {to_email}: {subject}")
        return False

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject
    
    msg.attach(MIMEText(body_html, 'html'))
    
    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"EMAIL ERROR: {e}")
        return False

@router.post("/request-option")
async def request_passenger_option(req: OptionRequest):
    flight = await db.flights.find_one({"_id": req.flight_id})
    flight_num = flight.get("flightNumber", "Unknown") if flight else "Unknown"
    
    subject = ""
    body = ""
    
    if req.option_id == "WAIT":
        subject = f"✈️ Lounge Access Voucher - {flight_num}"
        body = f"""
        <h2>Relax While You Wait</h2>
        <p>We apologize for the delay on flight <b>{flight_num}</b>.</p>
        <p>Please use this voucher for complimentary access to the <b>Premium Plaza Lounge</b> (Gate 3).</p>
        <div style="border: 1px dashed #333; padding: 20px; text_align: center; margin: 20px 0;">
            <h3>LOUNGE PASS</h3>
            <p>Code: <b>LNG-{random.randint(10000,99999)}</b></p>
            <p>Valid for: 1 Passenger</p>
        </div>
        """
        
    elif req.option_id == "REBOOK":
        subject = f"🔁 Flight Rebooking Confirmation - {flight_num}"
        body = f"""
        <h2>Rebooking Request Received</h2>
        <p>We have received your request to rebook flight <b>{flight_num}</b>.</p>
        <p>Our systems are searching for the next available connection with <b>Star Alliance Partners</b>.</p>
        <p>You will receive a separate email with your new itinerary within 15 minutes.</p>
        <p><i>No extra charges will be applied.</i></p>
        """

    elif req.option_id == "REFUND":
        subject = f"💰 Refund Process Initiated - {flight_num}"
        body = f"""
        <h2>Refund Initiated</h2>
        <p>Your refund request for flight <b>{flight_num}</b> has been logged.</p>
        <p><b>Amount:</b> Full Base Fare + Taxes</p>
        <p><b>Reference ID:</b> RF-{random.randint(100000,999999)}</p>
        <p>Please allow 3-5 business days for the amount to reflect in your source account.</p>
        """
        
    elif req.option_id == "HOTEL":
        subject = f"🛏️ Hotel Accommodation Voucher - {flight_num}"
        body = f"""
        <h2>Overnight Accommodation</h2>
        <p>Due to the extended delay, we have arranged a stay for you at <b>The Airport Transit Hotel</b>.</p>
        <div style="border: 1px solid #ddd; padding: 15px; background: #f9f9f9;">
            <p><b>Hotel:</b> Holiday Inn Express T3</p>
            <p><b>Room Type:</b> Standard Single/Double</p>
            <p><b>Voucher:</b> HTL-{random.randint(1000,9999)}</p>
        </div>
        <p>A shuttle bus is waiting at Pillar 4 to take you there.</p>
        """

    if subject:
        # Append Footer
        body += "<hr><p><small>SkyCoPilot Passenger Support AI</small></p>"
        send_passenger_email(req.email, subject, body)
        
    return {"status": "SENT", "message": f"Email sent to {req.email}"}

# --- Helper: Plain Language Generator ---
def get_plain_language_reason(reason: str, delay_min: int):
    
    reason = reason.lower()
    if "fog" in reason or "weather" in reason:
        return "Safety Pause (Weather)", f"To ensure your safety during low visibility, we are holding for improved conditions."
    if "technical" in reason or "hydraulic" in reason:
        return "Safety Validation", "Our engineering team is performing a comprehensive safety check. We will not fly until 100% verified."
    if "doc" in reason or "crew" in reason or "fdtl" in reason or "sick" in reason:
        return "Crew Well-being Safety", "To respect safety regulations and crew fatigue limits, we are assigning a fresh team for your journey."
    if "atc" in reason:
        return "Airspace Management", "We are ready to depart and awaiting final safety clearance from Air Traffic Control."
    
    return "Optimizing Schedule", "We are adjusting the flight path for a smoother journey. We appreciate your patience."

@router.get("/flight/{flight_id}")
async def get_passenger_flight_status(flight_id: str):
    flight = await db.flights.find_one({"_id": flight_id})
    if not flight:
        # Try finding by flight number if ID search fails (case insensitive)
        flight = await db.flights.find_one({"flightNumber": {"$regex": f"^{flight_id}$", "$options": "i"}})
        
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
        
    # Calculate mock rights based on delay
    delay_min = flight.get("delayMinutes", 0)
    rights = []
    
    if delay_min > 120: 
        rights.append({
            "title": "Free Meal Voucher",
            "icon": "🍽️",
            "reason": "Delay > 2 Hours",
            "allowance": "Up to ₹500 per passenger",
            "timing": "Available immediately",
            "claim_process": "Scan the voucher QR code at any airport restaurant."
        })
    if delay_min > 240: 
        rights.append({
            "title": "Full Refund Option",
            "icon": "💰",
            "reason": "Delay > 4 Hours",
            "allowance": "100% refund of base fare + fuel surcharge",
            "timing": "Process initiated within 24 hours",
            "claim_process": "Select 'Leave & Refund' in the options menu below."
        })
        rights.append({
            "title": "Free Rescheduling",
            "icon": "🔁",
            "reason": "Delay > 4 Hours",
            "allowance": "Move to any flight within 7 days at no extra cost",
            "timing": "Immediate confirmation",
            "claim_process": "Use the 'Rebook' option or visit the transfer desk."
        })
    if delay_min > 360: 
        rights.append({
            "title": "Hotel Accommodation",
            "icon": "🏨",
            "reason": "Delay > 6 Hours / Overnight",
            "allowance": "One night stay at partner hotel + transport",
            "timing": "Shuttle departs every 30 mins",
            "claim_process": "Collect voucher from the Guest Services counter (Gate 4)."
        })
    
    plain_title, plain_desc = get_plain_language_reason(flight.get("delayReason"), delay_min)

    # Generate Mock Timeline (Read-only signals)
    timeline = []
    sched_dep = flight.get("scheduledDeparture")
    if sched_dep:
        timeline.append({"time": (sched_dep - datetime.timedelta(minutes=120)).strftime("%H:%M"), "title": "Check-in Open", "description": "Counters online.", "status": "DONE"})
        
    if flight.get("status") == "DELAYED" or flight.get("status") == "CRITICAL":
         timeline.append({"time": datetime.datetime.now().strftime("%H:%M"), "title": plain_title, "description": plain_desc, "status": "CRITICAL"})
         
         # Synthesize operational checks based on delay reason
         if "technical" in flight.get("delayReason", "").lower():
              timeline.append({"time": (datetime.datetime.now() + datetime.timedelta(minutes=30)).strftime("%H:%M"), "title": "Engineering Review", "description": "Technicians performing safety validation.", "status": "PENDING"})
         elif "weather" in flight.get("delayReason", "").lower():
               timeline.append({"time": (datetime.datetime.now() + datetime.timedelta(minutes=45)).strftime("%H:%M"), "title": "Met Department Update", "description": "Waiting for next visibility report.", "status": "PENDING"})
               
         timeline.append({"time": (sched_dep + datetime.timedelta(minutes=delay_min)).strftime("%H:%M"), "title": "New Estimated Departure", "description": "Revised slot pending ATC approval.", "status": "PENDING"})
    else:
         timeline.append({"time": sched_dep.strftime("%H:%M"), "title": "Boarding", "description": "Gate closes 20 mins prior.", "status": "PENDING"})

    return {
        "flight_id": flight["_id"],
        "flight_number": flight["flightNumber"],
        "origin": flight["origin"],
        "destination": flight["destination"],
        "status": flight["status"],
        "delay_minutes": delay_min,
        "plain_reason_title": plain_title,
        "plain_reason_desc": plain_desc,
        "rights": rights,
        "timeline": timeline,
        "vouchers": [
            {
                "type": "FOOD", 
                "amount": "500", 
                "currency": "INR", 
                "code": f"FOOD-{random.randint(1000,9999)}",
                "expiry": "Today, 23:59"
            }
        ] if delay_min > 120 else []
    }

@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    # Log anonymous feedback
    print(f"FEEDBACK [Flight {req.flight_id}]: {req.rating}/5 - {req.comment}")
    return {"status": "SUBMITTED", "message": "Thank you for your feedback."}

@router.post("/support")
async def support_chat(req: ChatRequest):
    import os
    from google import genai
    
    api_key = os.getenv("GEMINI_API_KEY")
    msg = req.message.lower()
    
    # 1. Fallback / Mock Logic (if no key or specific keywords)
    if not api_key:
        if "why" in msg and "delayed" in msg:
            return {"response": "The delay is primarily due to operational safety checks. See the status card for details."}
        if "food" in msg or "voucher" in msg:
            return {"response": "If your delay exceeds 2 hours, you are eligible for a meal voucher."}
        if "refund" in msg:
            return {"response": "Refunds are available for delays exceeding 4 hours. You can claim this at the desk."}
        return {"response": "I am in offline mode. Please ask about delay reasons, vouchers, or refunds."}

    # 2. Gemini Logic
    try:
        # The client automatically picks up GEMINI_API_KEY from environment
        client = genai.Client(api_key=api_key)
        
        # Context is passed from frontend, e.g. "Flight AI-565 is DELAYED by 120m due to Fog."
        system_prompt = f"""
        You are 'AeroAssist', a helpful, calm airline assistant for passengers facing delays.
        
        CURRENT CONTEXT: {req.context}
        
        RULES:
        - Be empathetic and reassuring.
        - Keep answers short (under 2 sentences).
        - Use the context provided (Flight status, delay reason).
        - If asked about compensation, mention they can check the 'Rights' tab.
        - Do not make up facts not in the context.
        """
        
        # Combine system prompt and user message
        full_prompt = f"{system_prompt}\n\nPassenger: {req.message}\nAssistant:"
        
        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=full_prompt
        )
        
        if response.text:
            return {"response": response.text}
        else:
            return {"response": "I'm having trouble thinking clearly right now. Please try again."}
        
    except Exception as e:
        print(f"Gemini Error: {e}")
        return {"response": "I'm having trouble connecting to the AI brain. Please check the dashboard for updates."}

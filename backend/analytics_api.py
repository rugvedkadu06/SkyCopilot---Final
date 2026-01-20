from fastapi import APIRouter
from database import db
from models import Pilot, Flight
import datetime
import analytics

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview")
async def get_overview():
    # 1. Flight Stats
    # Fetch all flights to do aggregate math
    flights = await db.flights.find().to_list(1000)
    
    total_flights = len(flights)
    delayed_flights = sum(1 for f in flights if f.get('status') in ["DELAYED", "CRITICAL"])
    cancelled_flights = sum(1 for f in flights if f.get('status') == "CANCELLED")
    
    otp = 100
    if total_flights > 0:
        otp = ((total_flights - delayed_flights - cancelled_flights) / total_flights) * 100
        
    # 2. Crew Stats
    high_fatigue_crew = await db.pilots.count_documents({"fatigue_score": {"$gt": 0.7}})
    
    # 3. Financials (REAL CALCULATION)
    cost_data = analytics.estimate_disruption_cost(flights)
    
    return {
        "otp": round(otp, 1),
        "total_flights": total_flights,
        "active_disruptions": delayed_flights,
        "high_risk_crew": high_fatigue_crew,
        "financials": cost_data
    }

@router.get("/fatigue_trends")
async def get_fatigue_trends():
    # Get top 5 highest fatigue pilots for the chart
    pilots = await db.pilots.find().sort("fatigue_score", -1).limit(5).to_list(100)
    
    trends = []
    for p in pilots:
        data = analytics.calculate_future_fatigue(p)
        trends.append({
            "name": p['name'],
            "current_score": p['fatigue_score'],
            "data": data
        })
        
    return trends

@router.get("/predictions")
async def get_predictions():
    # Fetch current state
    flights = await db.flights.find().to_list(200)
    pilots = await db.pilots.find().to_list(200)
    
    # Generate real predictions
    return analytics.get_disruption_predictions(flights, pilots)

@router.get("/ai_report")
async def get_ai_report():
    # Fetch current snapshot
    flights = await db.flights.find().to_list(200)
    pilots = await db.pilots.find().to_list(200)
    
    # Generate report using Gemini
    return analytics.generate_ai_report(flights, pilots)

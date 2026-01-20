from pydantic import BaseModel, Field
from typing import List, Optional
import datetime

class Pilot(BaseModel):
    id: str = Field(alias="_id")
    name: str
    base: str
    currentDutyMinutes: int
    maxLegalDutyMinutes: int = 480
    remainingDutyMinutes: int
    fatigue_score: float
    status: str
    aircraftTypeQualified: List[str]
    lastUpdated: datetime.datetime
    # New Fields for Crew Management
    weekly_flight_minutes: int = 0
    overtime_rate_per_hour: float = 5000.0
    last_rest_period_end: Optional[datetime.datetime] = None

class Flight(BaseModel):
    id: str = Field(alias="_id")
    flightNumber: str
    origin: str
    destination: str
    scheduledDeparture: datetime.datetime
    scheduledArrival: datetime.datetime
    flightDurationMinutes: int
    status: str 
    delayMinutes: int = 0
    delayReason: Optional[str] = None
    assignedPilotId: Optional[str]
    assignedCoPilotId: Optional[str] = None
    boardingAllowed: bool = True
    predictedFailure: bool = False
    predictedFailureProbability: float = 0.0
    predictedFailureReason: Optional[str] = None
    decisionMode: str = "AUTO" 
    lastUpdated: datetime.datetime
    Pilot_Name: Optional[str] = None
    Flight_Duration: Optional[str] = "2h 00m"

class Disruption(BaseModel):
    type: str 
    severity: str 
    affectedLocation: str
    startTime: datetime.datetime

class CostModel(BaseModel):
    passengerCompensationFlat: float = 5000.0
    hotelCostPerNight: float = 8000.0
    mealVoucherCost: float = 500.0
    tarmacFuelBurnPerMinute: float = 200.0 

class SimulationRequest(BaseModel):
    type: str # 'WEATHER', 'TECHNICAL', 'ATC', 'CREW'
    subType: Optional[str] = None # e.g. 'Fog', 'Hydraulic'
    flight_id: Optional[str] = None
    airport: Optional[str] = "DEL"
    severity: Optional[str] = "HIGH"

class HealRequest(BaseModel):
    mode: str = "AUTO" # 'AUTO' or 'MANUAL'

class CrewRestRequest(BaseModel):
    pilot_id: str

class CrewCostRequest(BaseModel):
    pilot_id: str
    additional_minutes: int

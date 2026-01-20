import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://admin:admin@cluster0.m13agr8.mongodb.net/?appName=Cluster0")
DB_NAME = os.getenv("DB_NAME", "aero_resilience")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

async def get_pilots(limit=1000):
    return await db.pilots.find().to_list(length=limit)

async def get_flights():
    return await db.flights.find().to_list(length=1000)

async def get_disruptions():
    return await db.disruptions.find().to_list(length=1000)

async def update_pilot_status(pilot_id: str, status: str):
    await db.pilots.update_one({"_id": pilot_id}, {"$set": {"status": status}})

async def assign_pilot_to_flight(flight_id: str, pilot_id: str):
    await db.flights.update_one({"_id": flight_id}, {"$set": {"assigned_pilot": pilot_id, "status": "SCHEDULED"}})

async def create_disruption(disruption: dict):
    await db.disruptions.insert_one(disruption)

async def seed_db(pilots, flights):
    # Clear existing for fresh start
    await db.pilots.delete_many({})
    await db.flights.delete_many({})
    await db.disruptions.delete_many({})
    
    if pilots:
        await db.pilots.insert_many(pilots)
    if flights:
        await db.flights.insert_many(flights)

from datetime import datetime, timedelta

class AgentSystem:
    def __init__(self, pilots, flights):
        # pilots and flights are lists of dicts (from DB)
        self.pilots = {p['_id']: p for p in pilots}
        self.flights = {f['_id']: f for f in flights}
        self.logs = []

    def log(self, agent, message):
        self.logs.append(f"[{agent}] {message}")

    def run_healing(self, unassigned_flight_ids):
        assignments = {}
        
        for fid in unassigned_flight_ids:
            if fid not in self.flights:
                continue
                
            flight = self.flights[fid]
            self.log("SchedulerAgent", f"Flight {fid} unassigned. Initiating search.")
            
            assigned = False
            
            # Sort pilots by fatigue to try best first (or worst first to show rejection?)
            # Let's simple iterate.
            sorted_pilots = sorted(self.pilots.values(), key=lambda x: x['fatigue_score'])
            
            for pilot in sorted_pilots:
                pid = pilot['_id']
                
                # Ask PilotAgent
                response, reason = self._pilot_agent_decision(pilot, flight)
                
                if response == "REJECT":
                    self.log(f"PilotAgent-{pid}", f"Fatigue {pilot['fatigue_score']} -> REJECT ({reason})")
                    continue
                
                # Check SafetyAgent
                if self._safety_agent_validate(pilot, flight):
                    decision_text = "ACCEPT"
                    if response == "ACCEPT_WITH_REST":
                        decision_text = "ACCEPT WITH 48h REST"
                    
                    self.log(f"PilotAgent-{pid}", f"Fatigue {pilot['fatigue_score']} -> {decision_text}")
                    self.log("SafetyAgent", "All DGCA constraints satisfied")
                    self.log("System", f"Roster healed. Flight {fid} assigned to {pid}.")
                    
                    assignments[fid] = pid
                    assigned = True
                    break
                else:
                    self.log("SafetyAgent", f"Block assignment {pid} -> {fid}. Constraints violated.")
            
            if not assigned:
                self.log("SchedulerAgent", f"CRITICAL: Could not heal flight {fid}. No pilots available.")

        return assignments, self.logs

    def _pilot_agent_decision(self, pilot, flight):        
        fatigue = pilot.get('fatigue_score', 0)
        
        if fatigue > 80:
            return "REJECT", "Fatigue > 80"
            
        if flight.get('is_night_duty') and pilot.get('last_night_duty'):
            return "REJECT", "Back-to-back Night Duty"
            
        if 60 <= fatigue <= 80:
            return "ACCEPT_WITH_REST", "Fatigue 60-80"
            
        return "ACCEPT", "OK"

    def _safety_agent_validate(self, pilot, flight):
        # Final gatekeeper
        # Double check hard constraints
        if pilot.get('fatigue_score', 0) > 80:
            return False
        if flight.get('is_night_duty') and pilot.get('last_night_duty'):
            return False
            
        # Check landings
        # "Maximum 2 landings during duty overlapping 00:00–06:00"
        # We assume if flight is night duty, it falls in this window.
        if flight.get('is_night_duty') and flight.get('landings', 0) > 2:
            # This is a FLIGHT constraint, strictly speaking, 
            # likely making the flight itself illegal for *anyone*, 
            # but we assume the flight is valid and we check if the PILOT handles it?
            # Actually if the flight has > 2 landings at night, NO pilot can fly it under these rules.
            # But maybe the rule is "Pilot cannot perform MORE than 2 landings".
            # If flight has 3, then it's False.
            return False
            
        return True

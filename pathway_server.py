import pathway as pw
from dotenv import load_dotenv
load_dotenv()

class WardSchema(pw.Schema):
    ward_name: str
    Population: float
    PM25: float
    Avg_Temp: float
    Green_Are: float
    Open_Land: float
    Priority_Sci: float
    Priority_Level: str

ward_table = pw.io.csv.read(
    "data/ward_priority.csv",
    schema=WardSchema,
    mode="streaming"
)

# Write live updates to JSONL file
pw.io.jsonlines.write(ward_table, "data/live_wards.jsonl")

if __name__ == "__main__":
    pw.run()
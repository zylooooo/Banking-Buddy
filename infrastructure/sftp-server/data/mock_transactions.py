import csv, random
from datetime import datetime, timedelta
from pathlib import Path

# Configuration
N = 20000             # number of rows to generate
CLIENTS = [
    'CLT-cb9d7e84-a1d5-4d33-8051-afd6c4e2e442',
    'CLT-3733f47b-6e7a-4642-8481-ec700881656a',
    'CLT-c55bc2b7-368b-44fd-bcf7-f309410d71d4',
    'CLT-e1c863a2-f3f0-42fa-afe6-7dc02ca6d816',
    'CLT-82cf91f6-c766-44c6-b0d8-7b20eb42239e',
    'CLT-aee57b8d-5e3e-4a2b-8c58-20f719ae4fd3',
    'CLT-8aff96b7-a888-423f-a633-21859f32627a',
    'CLT-d5b5e304-adbe-4b68-b262-84c2373e59ad',
    'CLT-c40b11f9-3bed-4e80-a6da-1a529412785b',
    'CLT-0c147535-9764-4efc-acce-81e64d9a2bcf',
    'CLT-b3a05f1c-26d8-4651-8833-a6522f20da98',
    'CLT-b6c29ff6-292a-4942-8b7d-90095181f8dd'
]
START_DATE = datetime.today() - timedelta(days=120)  # last ~4 months
END_DATE = datetime.today()
TXN_TYPES = [("Deposit", 0.6), ("Withdrawal", 0.4)]
STATUSES = [("Completed", 0.75), ("Pending", 0.15), ("Failed", 0.10)]
MIN_AMT, MAX_AMT = 1.00, 10000.00  # amounts in absolute value

random.seed(301)  # reproducible

# Create output directory if it doesn't exist
OUTPUT_FILE = Path(__file__).parent / "transactions.csv"
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

def pick_weighted(choices):
    r = random.random()
    cum = 0.0
    for v, w in choices:
        cum += w
        if r <= cum:
            return v
    return choices[-1][0]

def generate_iso_date(start: datetime, end: datetime) -> str:
    """
    Generate a random date in ISO 8601 format (YYYY-MM-DD)
    Ensures proper banking standard date format
    """
    delta = end - start
    seconds = random.randint(0, int(delta.total_seconds()))
    random_date = start + timedelta(seconds=seconds)
    return random_date.strftime("%Y-%m-%d")

# Write to CSV file 
with open(OUTPUT_FILE, 'w', newline='') as csvfile:
    writer = csv.writer(csvfile, lineterminator="\n")
    writer.writerow(["id", "client_id", "transaction", "amount", "date", "status"])
    
    for i in range(1, N + 1):
        tx_id = f"T{i:08d}"
        client_id = random.choice(CLIENTS)
        tx_type = pick_weighted(TXN_TYPES)
        status = pick_weighted(STATUSES)
        amount = round(random.uniform(MIN_AMT, MAX_AMT), 2)
        date_str = generate_iso_date(START_DATE, END_DATE)
        writer.writerow([tx_id, client_id, tx_type, f"{amount:.2f}", date_str, status])

print(f"Generated {N} transactions in transactions.csv")
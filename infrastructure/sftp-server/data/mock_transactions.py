import csv, random
from datetime import datetime, timedelta
from pathlib import Path

# Configuration
N = 20000             # number of rows to generate
CLIENTS = 1000        # distinct clients
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
        client_id = f"CUS{random.randint(1, CLIENTS):06d}"
        tx_type = pick_weighted(TXN_TYPES)
        status = pick_weighted(STATUSES)
        amount = round(random.uniform(MIN_AMT, MAX_AMT), 2)
        date_str = generate_iso_date(START_DATE, END_DATE)
        writer.writerow([tx_id, client_id, tx_type, f"{amount:.2f}", date_str, status])

print(f"Generated {N} transactions in transactions.csv")
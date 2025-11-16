import csv, random
from datetime import datetime, timedelta
from pathlib import Path

# Configuration
N = 20000             # number of rows to generate
CLIENTS = [
    'CLT-0615de40-9d19-4539-b518-b21f1ad2a41f',
    'CLT-0e2d8be4-801c-4de4-9a74-0b7201a68f05',
    'CLT-123a18de-57d3-41f2-b1ff-74bdca24408c',
    'CLT-2ec14f96-c97b-43c1-b16d-24499f8103ab',
    'CLT-313a401c-f1dd-4761-abc5-3a957683089d',
    'CLT-3b99a55e-113d-4362-841c-4e1755fefffd',
    'CLT-4c9e6621-078c-4357-8faa-6b503169506d ',
    'CLT-56782ce6-1f72-4f78-a735-7e3cfd097c30',
    'CLT-65a14945-3481-4e67-b7ab-666a8f0cafd3',
    'CLT-67959b14-5c34-4c85-885d-c0d4e4827f7a',
    'CLT-75e73860-1da7-48f1-8c4f-a3bf8651515c',
    'CLT-aa02bd2b-7c6c-4b41-9bfa-5515848c8626',
    'CLT-ade94c6d-ea57-46a2-9211-74ff5c9d91ba',
    'CLT-b320b7bc-cd27-4283-ad8e-9c269a73c8b5',
    'CLT-ea3b21a7-0e7f-407e-a72f-c1ae1a6e6342',
    'CLT-eddbf1f0-c2f1-40b4-8516-ba02b7604c22',
    'CLT-ff92e85d-f485-45fc-a2f1-3be714a1ca33'
]
START_DATE = datetime.today() - timedelta(days=120)  # last ~4 months
END_DATE = datetime.today()
TXN_TYPES = [("DEPOSIT", 0.6), ("WITHDRAWAL", 0.4)]
STATUSES = [("COMPLETED", 0.75), ("PENDING", 0.15), ("FAILED", 0.10)]
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
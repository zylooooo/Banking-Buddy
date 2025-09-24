import paramiko
import csv
from typing import List, Dict, Any
from .transaction_validator import validate_transaction_record

class TransactionSFTPClient:
    def __init__(self, host: str, port: int, username: str, password: str):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.sftp = None
        self.ssh = None
    
    def connect(self) -> bool:
        """Connect to SFTP server"""
        try:
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.ssh.connect(
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                timeout=30
            )
            self.sftp = self.ssh.open_sftp()
            print(f"Connected to SFTP server at {self.host}:{self.port}")
            return True
        except Exception as e:
            print(f"Failed to connect: {e}")
            return False
    
    def download_transactions(self, remote_file: str, local_file: str) -> bool:
        """Download transactions CSV from SFTP server"""
        try:
            self.sftp.get(remote_file, local_file)
            print(f"Downloaded {remote_file} to {local_file}")
            return True
        except Exception as e:
            print(f"Failed to download {remote_file}: {e}")
            return False
    
    def parse_transactions_csv(self, csv_file: str) -> List[Dict[str, Any]]:
        """Parse CSV file and return list of validated transaction dictionaries"""
        transactions = []
        invalid_count = 0
        
        try:
            with open(csv_file, 'r', newline='', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                # Check if required headers exist
                required_headers = ['id', 'client_id', 'transaction', 'amount', 'date', 'status']
                if not all(header in reader.fieldnames for header in required_headers):
                    print(f"CSV file missing required headers. Expected: {required_headers}, Found: {reader.fieldnames}")
                    return []
                
                for row_number, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                    validated_transaction = validate_transaction_record(row, row_number)
                    
                    if validated_transaction:
                        transactions.append(validated_transaction)
                    else:
                        invalid_count += 1
                
                print(f"Parsed {len(transactions)} valid transactions from CSV")
                if invalid_count > 0:
                    print(f"Skipped {invalid_count} invalid transactions")
                
                return transactions
                
        except FileNotFoundError:
            print(f"CSV file not found: {csv_file}")
            return []
        except Exception as e:
            print(f"Failed to parse CSV: {e}")
            return []
    
    def disconnect(self):
        """Close SFTP connection"""
        if self.sftp:
            self.sftp.close()
        if self.ssh:
            self.ssh.close()
        print("Disconnected from SFTP server")

import mysql.connector
from typing import List, Dict, Any, Optional, Tuple
from contextlib import contextmanager

class DatabaseClient:
    """
    Database client for persisting ingested transaction data.
    """

    def __init__(
        self,
        username: str,
        password: str,
        host: str,
        port: int,
        database: str
    ):
        self.username = username
        self.password = password
        self.host = host
        self.port = port
        self.database = database
        self.connection = None
        self.cursor = None
    
    def connect(self):
        """Database connection"""
        try:
            self.connection = mysql.connector.connect(
                user=self.username,
                password=self.password,
                host=self.host,
                port=self.port,
                database=self.database
            )
            self.cursor = self.connection.cursor()
            print(f"Connected to MySQL database at {self.host}:{self.port}")
            return True
        except mysql.connector.Error as e:
            print(f"Failed to connect to MySQL database: {e}")
            return False

    def test_connection(self) -> bool:
        """Test database connection"""
        if not self.connection or not self.connection.is_connected():
            return False
        
        try:
            self.cursor.execute("SELECT 1")
            self.cursor.fetchone()
            return True
        except mysql.connector.Error:
            return False
    
    def disconnect(self):
        """Database disconnection"""
        if self.cursor:
            self.cursor.close()
        if self.connection and self.connection.is_connected():
            self.connection.close()
            print("Disconnected from MySQL database")
    
    def store_transactions(self, transactions: List[Dict[str, Any]]) -> Tuple[bool, int, int]:
        """
        Store transactions in database table

        Returns:
            Tuple of (success: bool, stored_count: int, failed_count: int)
        """
        stored_count = 0
        failed_count = 0

        if not transactions:
            return True, stored_count, failed_count
        
        if not self.connection or not self.connection.is_connected():
            print("Database not connected!")
            return False, stored_count, failed_count
        
        try:
            # Insert statement with duplicate key handling for idempotency
            sql = """
                INSERT INTO transactions
                (id, client_id, transaction, amount, date, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    transaction = VALUES(transaction),
                    amount = VALUES(amount),
                    date = VALUES(date),
                    status = VALUES(status)
            """

            # Process each transaction
            for transaction in transactions:
                try:
                    data = (
                        transaction['id'],
                        transaction['client_id'],
                        transaction['transaction'],
                        transaction['amount'],
                        transaction['date'],
                        transaction['status']
                    )
                    self.cursor.execute(sql, data)
                    stored_count += 1
                except (KeyError, mysql.connector.Error) as e:
                    print(f"Failed to store transaction {transaction.get('id')}: {e}")
                    failed_count += 1
                    continue
            
            # Commit all successful transactions
            self.connection.commit()

            print(f"Successfully stored {stored_count} transactions, {failed_count} failed")
            return True, stored_count, failed_count
        except mysql.connector.Error as e:
            print(f"Database connection error during transaction storage: {e}")
            if self.connection:
                self.connection.rollback()
            return False, stored_count, failed_count
    
    def get_transaction_count(self) -> int:
        """Get total transaction count for verification"""
        if not self.connection or not self.connection.is_connected():
            return 0
        
        try:
            self.cursor.execute("SELECT COUNT(*) FROM `transactions`")
            result = self.cursor.fetchone()
            return result[0] if result else 0
        except mysql.connector.Error as e:
            print(f"Database error during transaction count retrieval: {e}")
            return 0

import tempfile
import os
from src.sftp_client import TransactionSFTPClient

class TestDataParsing:
    
    def create_test_csv(self, content):
        """Helper to create test CSV."""
        temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv')
        temp_file.write(content)
        temp_file.close()
        return temp_file.name
    
    def test_parse_mixed_valid_invalid_data(self):
        """Test parsing CSV with mix of valid/invalid transactions."""
        csv_content = """id,client_id,transaction,amount,date,status
T001,CUS000123,Deposit,100.50,2024-01-15,Completed
T002,,Withdrawal,75.25,2024-01-16,Pending
T003,CUS000456,Deposit,50.00,2024-01-17,Completed"""
        
        temp_csv = self.create_test_csv(csv_content)
        client = TransactionSFTPClient('localhost', 2222, 'user', 'pass')
        
        try:
            transactions = client.parse_transactions_csv(temp_csv)
            # Should get 2 valid transactions (T001, T003)
            assert len(transactions) == 2
            valid_ids = [t['id'] for t in transactions]
            assert 'T001' in valid_ids
            assert 'T003' in valid_ids
        finally:
            os.unlink(temp_csv)
    
    def test_parse_empty_csv(self):
        """Test parsing empty CSV file."""
        csv_content = """id,client_id,transaction,amount,date,status"""
        
        temp_csv = self.create_test_csv(csv_content)
        client = TransactionSFTPClient('localhost', 2222, 'user', 'pass')
        
        try:
            transactions = client.parse_transactions_csv(temp_csv)
            assert len(transactions) == 0
        finally:
            os.unlink(temp_csv)

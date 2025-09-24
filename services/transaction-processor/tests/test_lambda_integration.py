import pytest
import json
import os
import tempfile
import time
from unittest.mock import Mock, patch
from src.database_client import DatabaseClient

class TestLambdaIntegration:
    
    @pytest.fixture
    def lambda_context(self):
        """Mock Lambda context."""
        context = Mock()
        context.function_name = 'transaction-processor'
        context.remaining_time_in_millis = lambda: 30000
        return context
    
    @pytest.fixture
    def clean_database(self):
        """Ensure clean database state for each test."""
        db_client = DatabaseClient(
            username=os.getenv('DB_USERNAME'),
            password=os.getenv('DB_PASSWORD'),
            host=os.getenv('DB_HOST'),
            port=int(os.getenv('DB_PORT')),
            database=os.getenv('DB_NAME')
        )
        
        if db_client.connect():
            try:
                # Clean any test data before test
                db_client.cursor.execute("DELETE FROM transactions WHERE id LIKE 'TEST_%'")
                db_client.connection.commit()
                yield db_client
            finally:
                db_client.disconnect()
        else:
            yield None
    
    @pytest.fixture
    def test_transactions_csv(self):
        """Create controlled test CSV data for precise verification."""
        test_data = """id,client_id,transaction,amount,date,status
TEST_001,CUS012345,Deposit,1000.50,2024-01-15,Completed
TEST_002,CUS067890,Withdrawal,250.75,2024-01-16,Pending
TEST_003,CUS011111,Deposit,500.00,2024-01-17,Failed
TEST_004,CUS022222,Withdrawal,99.99,2024-01-18,Completed"""
        
        # Create temporary CSV file
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
        temp_file.write(test_data)
        temp_file.close()
        
        expected_transactions = [
            {'id': 'TEST_001', 'client_id': 'CUS012345', 'transaction': 'Deposit', 'amount': 1000.50, 'date': '2024-01-15', 'status': 'Completed'},
            {'id': 'TEST_002', 'client_id': 'CUS067890', 'transaction': 'Withdrawal', 'amount': 250.75, 'date': '2024-01-16', 'status': 'Pending'},
            {'id': 'TEST_003', 'client_id': 'CUS011111', 'transaction': 'Deposit', 'amount': 500.00, 'date': '2024-01-17', 'status': 'Failed'},
            {'id': 'TEST_004', 'client_id': 'CUS022222', 'transaction': 'Withdrawal', 'amount': 99.99, 'date': '2024-01-18', 'status': 'Completed'}
        ]
        
        yield temp_file.name, expected_transactions
        
        # Cleanup
        try:
            os.unlink(temp_file.name)
        except:
            pass  # File might already be deleted
    
    @pytest.fixture
    def invalid_transactions_csv(self):
        """Create CSV with invalid data to test validation."""
        invalid_data = """id,client_id,transaction,amount,date,status
TEST_INVALID_001,,Deposit,1000.50,2024-01-15,Completed
TEST_INVALID_002,CUS067890,InvalidType,250.75,2024-01-16,Pending
TEST_VALID_001,CUS011111,Deposit,500.00,2024-01-17,Completed"""
        
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
        temp_file.write(invalid_data)
        temp_file.close()
        
        expected_valid = [
            {'id': 'TEST_VALID_001', 'client_id': 'CUS011111', 'transaction': 'Deposit', 'amount': 500.00, 'date': '2024-01-17', 'status': 'Completed'}
        ]
        
        yield temp_file.name, expected_valid, 2  # 2 invalid transactions
        
        try:
            os.unlink(temp_file.name)
        except:
            pass
    
    def test_lambda_controlled_data_success(self, lambda_context, clean_database, test_transactions_csv):
        """
        PRIMARY TEST: Complete Lambda flow with controlled data verification.
        Tests: SFTP → Parse → Validate → Store → Verify exact data in database.
        """
        from src.lambda_function import lambda_handler
        
        csv_file_path, expected_transactions = test_transactions_csv
        
        # Mock the SFTP download to use our controlled test data
        with patch('src.sftp_client.TransactionSFTPClient.download_transactions') as mock_download:
            def mock_download_func(remote_file, local_file):
                import shutil
                shutil.copy(csv_file_path, local_file)
                return True
            
            mock_download.side_effect = mock_download_func
            
            # Get initial database count
            initial_count = clean_database.get_transaction_count() if clean_database else 0
            
            # Execute Lambda function (complete flow)
            result = lambda_handler({}, lambda_context)
            
            # Verify Lambda execution succeeded
            assert result['statusCode'] == 200, f"Lambda should succeed, got: {result}"
            
            body = json.loads(result['body'])
            assert body['total_transactions'] == 4, f"Should process 4 transactions, got {body['total_transactions']}"
            assert body['stored_transactions'] == 4, f"Should store 4 transactions, got {body['stored_transactions']}"
            assert body['failed_transactions'] == 0, f"Should have 0 failed transactions, got {body['failed_transactions']}"
            assert 'Successfully retrieved, validated, and stored transactions' in body['message']
            
            # CRITICAL: Verify exact transactions were stored in database
            if clean_database:
                # Fix connection isolation: refresh connection to see committed transactions
                time.sleep(0.1)  # Brief wait for transaction commit
                clean_database.disconnect()
                clean_database.connect()
                
                final_count = clean_database.get_transaction_count()
                print(f"DEBUG: Initial count = {initial_count}, Final count = {final_count}")
                assert final_count == initial_count + 4, f"Database should have exactly 4 more transactions. Initial: {initial_count}, Final: {final_count}"
                
                # Verify each expected transaction exists with exact data
                for expected_tx in expected_transactions:
                    clean_database.cursor.execute("""
                        SELECT id, client_id, transaction, amount, date, status 
                        FROM transactions 
                        WHERE id = %s
                    """, (expected_tx['id'],))
                    
                    stored_tx = clean_database.cursor.fetchone()
                    assert stored_tx is not None, f"Transaction {expected_tx['id']} should exist in database"
                    
                    # Exact data verification
                    assert stored_tx[0] == expected_tx['id'], f"ID mismatch: {stored_tx[0]} != {expected_tx['id']}"
                    assert stored_tx[1] == expected_tx['client_id'], f"Client ID mismatch: {stored_tx[1]} != {expected_tx['client_id']}"
                    assert stored_tx[2] == expected_tx['transaction'], f"Type mismatch: {stored_tx[2]} != {expected_tx['transaction']}"
                    assert float(stored_tx[3]) == expected_tx['amount'], f"Amount mismatch: {stored_tx[3]} != {expected_tx['amount']}"
                    assert str(stored_tx[4]) == expected_tx['date'], f"Date mismatch: {stored_tx[4]} != {expected_tx['date']}"
                    assert stored_tx[5] == expected_tx['status'], f"Status mismatch: {stored_tx[5]} != {expected_tx['status']}"
            
            print(f"SFTP: Downloaded and parsed {body['total_transactions']} controlled transactions")
            print(f"Database: Stored {body['stored_transactions']} transactions")
            print(f"Verified all {len(expected_transactions)} transactions match expected data exactly")
    
    def test_lambda_controlled_data_with_validation_errors(self, lambda_context, clean_database, invalid_transactions_csv):
        """
        Test Lambda handles invalid data correctly - stores valid, skips invalid.
        """
        from src.lambda_function import lambda_handler
        
        csv_file_path, expected_valid, expected_invalid_count = invalid_transactions_csv
        
        with patch('src.sftp_client.TransactionSFTPClient.download_transactions') as mock_download:
            def mock_download_func(remote_file, local_file):
                import shutil
                shutil.copy(csv_file_path, local_file)
                return True
            
            mock_download.side_effect = mock_download_func
            
            initial_count = clean_database.get_transaction_count() if clean_database else 0
            
            result = lambda_handler({}, lambda_context)
            
            # Should succeed even with some invalid data
            assert result['statusCode'] == 200
            
            body = json.loads(result['body'])
            assert body['total_transactions'] == 1, f"Should process 1 valid transaction, got {body['total_transactions']}"
            assert body['stored_transactions'] == 1, f"Should store 1 transaction, got {body['stored_transactions']}"
            
            # Verify only valid transaction was stored
            if clean_database:
                # Fix connection isolation: refresh connection to see committed transactions
                time.sleep(0.1)  # Brief wait for transaction commit
                clean_database.disconnect()
                clean_database.connect()
                
                final_count = clean_database.get_transaction_count()
                print(f"DEBUG: Initial count = {initial_count}, Final count = {final_count}")
                assert final_count == initial_count + 1, f"Should store only 1 valid transaction. Initial: {initial_count}, Final: {final_count}"
                
                # Verify the valid transaction exists
                valid_tx = expected_valid[0]
                clean_database.cursor.execute("""
                    SELECT id, client_id, transaction, amount, date, status 
                    FROM transactions 
                    WHERE id = %s
                """, (valid_tx['id'],))
                
                stored_tx = clean_database.cursor.fetchone()
                assert stored_tx is not None, f"Valid transaction {valid_tx['id']} should be stored"
                assert stored_tx[0] == valid_tx['id']
                assert stored_tx[1] == valid_tx['client_id']
            
            print(f"Correctly processed {body['stored_transactions']} valid transactions, skipped invalid ones")
    
    def test_lambda_idempotency_controlled_data(self, lambda_context, clean_database, test_transactions_csv):
        """
        Test Lambda idempotency: running twice with same data doesn't create duplicates.
        """
        from src.lambda_function import lambda_handler
        
        csv_file_path, expected_transactions = test_transactions_csv
        
        with patch('src.sftp_client.TransactionSFTPClient.download_transactions') as mock_download:
            def mock_download_func(remote_file, local_file):
                import shutil
                shutil.copy(csv_file_path, local_file)
                return True
            
            mock_download.side_effect = mock_download_func
            
            # First execution
            result1 = lambda_handler({}, lambda_context)
            assert result1['statusCode'] == 200
            
            if clean_database:
                # Fix connection isolation for first execution
                time.sleep(0.1)
                clean_database.disconnect()
                clean_database.connect()
                count_after_first = clean_database.get_transaction_count()
            
            # Second execution (should be idempotent)
            result2 = lambda_handler({}, lambda_context)
            assert result2['statusCode'] == 200
            
            if clean_database:
                # Fix connection isolation for second execution
                time.sleep(0.1)
                clean_database.disconnect()
                clean_database.connect()
                count_after_second = clean_database.get_transaction_count()
                
                # Database count should be stable (due to ON DUPLICATE KEY UPDATE)
                assert count_after_second == count_after_first, \
                    f"Database should not have duplicates: {count_after_first} != {count_after_second}"
            
            body1 = json.loads(result1['body'])
            body2 = json.loads(result2['body'])
            
            print(f"First run: {body1['stored_transactions']} stored")
            print(f"Second run: {body2['stored_transactions']} processed (idempotent)")
            print(f"Database stable: {count_after_first if clean_database else 'N/A'} transactions")
    
    def test_lambda_success_with_real_sftp(self, lambda_context):
        """
        PRODUCTION-LIKE TEST: Test with real SFTP data for performance validation.
        This keeps your original test but as secondary validation.
        """
        from src.lambda_function import lambda_handler
        
        result = lambda_handler({}, lambda_context)
        
        assert result['statusCode'] == 200
        body = json.loads(result['body'])
        assert 'Successfully retrieved, validated, and stored transactions' in body['message']
        assert body['total_transactions'] > 0, "Should process transactions from real SFTP"
        
        print(f"Production-like test: processed {body['total_transactions']} transactions from real SFTP")
    
    def test_lambda_database_connection_failure(self, lambda_context):
        """Test Lambda behavior when database connection fails."""
        from src.lambda_function import lambda_handler
        
        original_host = os.environ.get('DB_HOST')
        os.environ['DB_HOST'] = 'unreachable-database'
        
        try:
            result = lambda_handler({}, lambda_context)
            assert result['statusCode'] == 500
            body = json.loads(result['body'])
            assert 'Failed to connect to databsae' in body['error']  # Matches your typo
        finally:
            if original_host:
                os.environ['DB_HOST'] = original_host
    
    def test_lambda_sftp_connection_failure(self, lambda_context):
        """Test Lambda behavior when SFTP server is unreachable."""
        from src.lambda_function import lambda_handler
        
        original_host = os.environ['SFTP_HOST']
        os.environ['SFTP_HOST'] = 'unreachable-host'
        
        try:
            result = lambda_handler({}, lambda_context)
            assert result['statusCode'] == 500
            body = json.loads(result['body'])
            assert 'Failed to connect to SFTP server' in body['error']
        finally:
            os.environ['SFTP_HOST'] = original_host
    
    def test_lambda_invalid_credentials(self, lambda_context):
        """Test Lambda behavior with wrong SFTP credentials."""
        from src.lambda_function import lambda_handler
        
        original_user = os.environ['SFTP_USERNAME']
        os.environ['SFTP_USERNAME'] = 'wrong_user'
        
        try:
            result = lambda_handler({}, lambda_context)
            assert result['statusCode'] == 500
        finally:
            os.environ['SFTP_USERNAME'] = original_user
    
    def test_lambda_missing_file(self, lambda_context):
        """Test Lambda behavior when CSV file doesn't exist."""
        from src.lambda_function import lambda_handler
        
        original_file = os.environ['SFTP_REMOTE_FILE']
        os.environ['SFTP_REMOTE_FILE'] = '/data/nonexistent.csv'
        
        try:
            result = lambda_handler({}, lambda_context)
            assert result['statusCode'] == 500
            body = json.loads(result['body'])
            assert 'Failed to download' in body['error']
        finally:
            os.environ['SFTP_REMOTE_FILE'] = original_file

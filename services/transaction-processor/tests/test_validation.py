import pytest
from src.transaction_validator import validate_transaction_record

class TestTransactionValidation:
    
    def test_valid_transaction(self):
        """Test valid transaction passes validation."""
        valid_row = {
            'id': 'T001',
            'client_id': 'CUS000123', 
            'transaction': 'Deposit',
            'amount': '100.50',
            'date': '2024-01-15',
            'status': 'Completed'
        }
        
        result = validate_transaction_record(valid_row, 1)
        
        assert result is not None
        assert result['id'] == 'T001'
        assert result['client_id'] == 'CUS000123'
        assert result['amount'] == 100.50
    
    @pytest.mark.parametrize("field,bad_value", [
        ('id', ''),                    # Missing ID
        ('client_id', ''),             # Missing client ID  
        ('client_id', 'abc'),          # Invalid client ID
        ('transaction', 'Transfer'),    # Invalid transaction type
        ('amount', '-100'),            # Negative amount
        ('date', '2024-13-01'),        # Invalid date
        ('status', 'Processing'),      # Invalid status
    ])
    def test_invalid_transactions(self, field, bad_value):
        """Test various invalid transaction scenarios."""
        base_row = {
            'id': 'T001', 'client_id': 'CUS000123', 'transaction': 'Deposit',
            'amount': '100.50', 'date': '2024-01-15', 'status': 'Completed'
        }
        base_row[field] = bad_value
        
        result = validate_transaction_record(base_row, 1)
        assert result is None

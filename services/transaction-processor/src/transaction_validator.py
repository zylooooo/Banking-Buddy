from datetime import datetime
from typing import Dict, Any, Optional
import re

def validate_transaction_record(row: Dict[str, str], row_number: int) -> Optional[Dict[str, Any]]:
    """
    Validate a single transaction record based on business rules
    
    Business Rules:
    - ID: Non-empty, unique identifier (T followed by 8 digits)
    - Client ID: String, unique identifier (CLT-{UUID} format)
    - Transaction: Must be 'Deposit' or 'Withdrawal'
    - Amount: Must be positive number
    - Date: Must be valid date format (YYYY-MM-DD)
    - Status: Must be 'Completed', 'Pending', or 'Failed'
    """
    errors = []
    
    try:
        # 1. ID validation (T followed by 8 digits)
        transaction_id = row.get('id', '').strip()
        if not transaction_id:
            errors.append("ID is missing or empty")
        elif not re.match(r'^T\d{8}$', transaction_id):
            errors.append(f"ID must be in format T########, got: {transaction_id}")
        
        # 2. Client ID validation (CLT-{UUID} format)
        client_id_str = row.get('client_id', '').strip()
        if not client_id_str:
            errors.append("Client ID is missing or empty")
        elif not re.match(r'^CLT-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', client_id_str, re.IGNORECASE):
            errors.append(f"Client ID must be in format CLT-{{UUID}}, got: {client_id_str}")
        
        # 3. Transaction type validation (Deposit or Withdrawal)
        transaction = row.get('transaction', '').strip()
        if not transaction:
            errors.append("Transaction type is missing or empty")
        elif transaction.lower() not in ['deposit', 'withdrawal']:
            transaction = transaction.capitalize()
            errors.append(f"Transaction type must be 'DEPOSIT' or 'WITHDRAWAL', got: {transaction}")
        
        # 4. Amount validation (positive number)
        amount_str = row.get('amount', '').strip()
        if not amount_str:
            errors.append("Amount is missing or empty")
        else:
            try:
                amount = float(amount_str)
                if amount <= 0:
                    errors.append(f"Amount must be positive, got: {amount}")
            except ValueError:
                errors.append(f"Amount must be a valid number, got: {amount_str}")
        
        # 5. Date validation (valid date format)
        date_str = row.get('date', '').strip()
        if not date_str:
            errors.append("Date is missing or empty")
        else:
            try:
                # Try to parse the date (assuming YYYY-MM-DD format)
                datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                errors.append(f"Date must be in YYYY-MM-DD format, got: {date_str}")
        
        # 6. Status validation (Completed, Pending, Failed)
        status = row.get('status', '').strip()
        if not status:
            errors.append("Status is missing or empty")
        elif status.lower() not in ['completed', 'pending', 'failed']:
            status = status.capitalize()
            errors.append(f"Status must be 'COMPLETED', 'PENDING', or 'FAILED', got: {status}")
        
        # If there are validation errors, log them and return None
        if errors:
            print(f"Row {row_number}: Validation failed - {'; '.join(errors)}")
            return None
        
        # If validation passes, return the validated record
        return {
            'id': transaction_id,
            'client_id': client_id_str,
            'transaction': transaction,
            'amount': float(amount_str),
            'date': date_str,
            'status': status,
            'processed_at': datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Row {row_number}: Unexpected error during validation: {e}")
        return None
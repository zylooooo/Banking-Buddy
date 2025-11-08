import json
from datetime import datetime

try:
    from config import load_config
    from sftp_client import TransactionSFTPClient
    from database_client import DatabaseClient
except ImportError:
    from .config import load_config
    from .sftp_client import TransactionSFTPClient
    from .database_client import DatabaseClient

def create_transactions_table(db_client):
    """Create transactions table if it doesn't exist"""
    try:
        # Table creation SQL
        create_table_sql = """
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(50) PRIMARY KEY COMMENT 'Unique transaction ID',
                client_id VARCHAR(50) NOT NULL COMMENT 'Unique client ID',
                transaction ENUM('DEPOSIT', 'WITHDRAWAL'),
                amount DECIMAL(15, 2) NOT NULL,
                date DATETIME(6) NOT NULL COMMENT 'The Transaction Date',
                status ENUM('COMPLETED', 'PENDING', 'FAILED') NOT NULL,

                -- Indexes 
                INDEX idx_client_id (client_id),
                INDEX idx_date (date),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            COMMENT='Transaction table for CRM services consumption';
        """
        
        db_client.cursor.execute(create_table_sql)
        db_client.connection.commit()
        print("Transactions table created/verified successfully")
        return True
    except Exception as e:
        print(f"Error creating transactions table: {e}")
        return False

def lambda_handler(event, context):
    """
    AWS Lambda handler function
    This will be called by CloudWatch Events for scheduled batch jobs
    """
    
    try:
        # Load SFTP configuration
        config = load_config()

        # Initialize database client
        db_client = DatabaseClient(
            username=config.DB_USERNAME,
            password=config.DB_PASSWORD,
            host=config.DB_HOST,
            port=config.DB_PORT,
            database=config.DB_NAME
        )

        # Connect to database
        if not db_client.connect():
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': 'Failed to connect to database',
                    'timestamp': datetime.now().isoformat()
                })
            }
        
        # Create transactions table if it doesn't exist
        if not create_transactions_table(db_client):
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': 'Failed to create transactions table',
                    'timestamp': datetime.now().isoformat()
                })
            }
        
        # Initialize SFTP client
        sftp_client = TransactionSFTPClient(
            host=config.SFTP_HOST,
            port=config.SFTP_PORT,
            username=config.SFTP_USERNAME,
            password=config.SFTP_PASSWORD
        )
        
        # Connect to SFTP server
        if not sftp_client.connect():
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': 'Failed to connect to SFTP server',
                    'timestamp': datetime.now().isoformat()
                })
            }
        
        # Download transactions file
        if not sftp_client.download_transactions(config.SFTP_REMOTE_FILE, config.SFTP_LOCAL_FILE):
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': 'Failed to download transactions file',
                    'timestamp': datetime.now().isoformat()
                })
            }
        
        # Parse and validate transactions
        transactions = sftp_client.parse_transactions_csv(config.SFTP_LOCAL_FILE)
        
        if not transactions:
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': 'No valid transactions found after parsing and validation',
                    'timestamp': datetime.now().isoformat()
                })
            }
        
        # Store transactions in RDS database
        print(f"Storing {len(transactions)} transactions in database")
        success, stored_count, failed_count = db_client.store_transactions(transactions)

        if not success:
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': 'Failed to store transactions in database',
                    'timestamp': datetime.now().isoformat()
                })
            }
        
        # Return success response with validated transaction data
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Successfully retrieved, validated, and stored transactions',
                'total_transactions': len(transactions),
                'stored_transactions': stored_count,
                'failed_transactions': failed_count,
                'timestamp': datetime.now().isoformat()
            })
        }
        
    except Exception as e:
        print(f"Lambda execution failed: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f'Lambda execution failed: {str(e)}',
                'timestamp': datetime.now().isoformat()
            })
        }
    
    finally:
        # Always disconnect
        if 'sftp_client' in locals():
            sftp_client.disconnect()
        if 'db_client' in locals():
            db_client.disconnect()

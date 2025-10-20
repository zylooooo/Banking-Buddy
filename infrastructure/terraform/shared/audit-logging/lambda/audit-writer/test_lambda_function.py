"""
Unit tests for audit-writer Lambda function.
Uses pytest and moto for mocking AWS services.
"""
import json
import os
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
from moto import mock_aws
import boto3

# Set environment variables before importing lambda_function
os.environ['DYNAMODB_TABLE_NAME'] = 'test-audit-logs'
os.environ['MAX_RETRIES'] = '3'
os.environ['LOG_RETENTION_DAYS'] = '2555'

# Import after setting environment
from lambda_function import (
    lambda_handler,
    validate_audit_message,
    write_to_dynamodb
)


@pytest.fixture
def valid_create_message():
    """Valid CREATE audit message fixture"""
    return {
        'log_id': 'test-log-123',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'client_id': 'client-789',
        'agent_id': 'agent-456',
        'crud_operation': 'CREATE',
        'source_service': 'user-service',
        'ttl': 1924905600,  # Far future epoch
        'after_value': 'TAN|XX'
    }


@pytest.fixture
def valid_update_message():
    """Valid UPDATE audit message fixture"""
    return {
        'log_id': 'test-log-456',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'client_id': 'client-789',
        'agent_id': 'agent-456',
        'crud_operation': 'UPDATE',
        'source_service': 'user-service',
        'ttl': 1924905600,
        'attribute_name': 'name',
        'before_value': 'LEE|ABC',
        'after_value': 'TAN|XX'
    }


@pytest.fixture
def valid_delete_message():
    """Valid DELETE audit message fixture"""
    return {
        'log_id': 'test-log-789',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'client_id': 'client-789',
        'agent_id': 'agent-456',
        'crud_operation': 'DELETE',
        'source_service': 'user-service',
        'ttl': 1924905600,
        'before_value': 'LEE|ABC'
    }


@pytest.fixture
def valid_read_message():
    """Valid READ audit message fixture"""
    return {
        'log_id': 'test-log-101',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'client_id': 'client-789',
        'agent_id': 'agent-456',
        'crud_operation': 'READ',
        'source_service': 'user-service',
        'ttl': 1924905600
    }


@pytest.fixture
def sqs_event(valid_create_message):
    """SQS event fixture with valid CREATE message"""
    return {
        'Records': [
            {
                'messageId': 'msg-123',
                'body': json.dumps(valid_create_message)
            }
        ]
    }


@pytest.fixture
def dynamodb_table():
    """Create mock DynamoDB table with correct schema"""
    with mock_aws():
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table = dynamodb.create_table(
            TableName='test-audit-logs',
            KeySchema=[
                {'AttributeName': 'client_id', 'KeyType': 'HASH'},
                {'AttributeName': 'timestamp', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'client_id', 'AttributeType': 'S'},
                {'AttributeName': 'timestamp', 'AttributeType': 'S'},
                {'AttributeName': 'agent_id', 'AttributeType': 'S'},
                {'AttributeName': 'crud_operation', 'AttributeType': 'S'}
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'AgentIndex',
                    'KeySchema': [
                        {'AttributeName': 'agent_id', 'KeyType': 'HASH'},
                        {'AttributeName': 'timestamp', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                },
                {
                    'IndexName': 'OperationIndex',
                    'KeySchema': [
                        {'AttributeName': 'crud_operation', 'KeyType': 'HASH'},
                        {'AttributeName': 'timestamp', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                }
            ],
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        yield table


class TestValidateAuditMessage:
    """Test validate_audit_message function"""
    
    def test_valid_create_message(self, valid_create_message):
        """Should not raise exception for valid CREATE message"""
        validate_audit_message(valid_create_message)
    
    def test_valid_update_message(self, valid_update_message):
        """Should not raise exception for valid UPDATE message"""
        validate_audit_message(valid_update_message)
    
    def test_valid_delete_message(self, valid_delete_message):
        """Should not raise exception for valid DELETE message"""
        validate_audit_message(valid_delete_message)
    
    def test_valid_read_message(self, valid_read_message):
        """Should not raise exception for valid READ message"""
        validate_audit_message(valid_read_message)
    
    def test_missing_required_field(self, valid_create_message):
        """Should raise ValueError for missing client_id"""
        del valid_create_message['client_id']
        with pytest.raises(ValueError, match="Missing required field: client_id"):
            validate_audit_message(valid_create_message)
    
    def test_empty_required_field(self, valid_create_message):
        """Should raise ValueError for empty agent_id"""
        valid_create_message['agent_id'] = ''
        with pytest.raises(ValueError, match="Field agent_id cannot be empty"):
            validate_audit_message(valid_create_message)
    
    def test_invalid_crud_operation(self, valid_create_message):
        """Should raise ValueError for invalid CRUD operation"""
        valid_create_message['crud_operation'] = 'INVALID'
        with pytest.raises(ValueError, match="Invalid crud_operation"):
            validate_audit_message(valid_create_message)
    
    def test_invalid_timestamp_format(self, valid_create_message):
        """Should raise ValueError for invalid timestamp"""
        valid_create_message['timestamp'] = 'not-a-timestamp'
        with pytest.raises(ValueError, match="Invalid timestamp format"):
            validate_audit_message(valid_create_message)
    
    def test_update_missing_attribute_name(self, valid_update_message):
        """Should raise ValueError for UPDATE without attribute_name"""
        del valid_update_message['attribute_name']
        with pytest.raises(ValueError, match="attribute_name is required for UPDATE"):
            validate_audit_message(valid_update_message)
    
    def test_update_missing_before_value(self, valid_update_message):
        """Should raise ValueError for UPDATE without before_value"""
        del valid_update_message['before_value']
        with pytest.raises(ValueError, match="before_value is required for UPDATE"):
            validate_audit_message(valid_update_message)
    
    def test_create_missing_after_value(self, valid_create_message):
        """Should raise ValueError for CREATE without after_value"""
        del valid_create_message['after_value']
        with pytest.raises(ValueError, match="after_value is required for CREATE"):
            validate_audit_message(valid_create_message)


class TestWriteToDynamoDB:
    """Test write_to_dynamodb function"""
    
    def test_write_create_success(self, dynamodb_table, valid_create_message):
        """Should successfully write CREATE message to DynamoDB"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        write_to_dynamodb(valid_create_message)
        
        # Verify item was written (use client_id + timestamp as key)
        response = dynamodb_table.get_item(
            Key={
                'client_id': valid_create_message['client_id'],
                'timestamp': valid_create_message['timestamp']
            }
        )
        assert 'Item' in response
        item = response['Item']
        assert item['client_id'] == 'client-789'
        assert item['crud_operation'] == 'CREATE'
        assert item['after_value'] == 'TAN|XX'
        assert item['source_service'] == 'user-service'
        assert 'attribute_name' not in item  # CREATE doesn't have attribute_name
        assert 'before_value' not in item   # CREATE doesn't have before_value
    
    def test_write_update_with_all_fields(self, dynamodb_table, valid_update_message):
        """Should write UPDATE message with attribute_name, before_value, after_value"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        write_to_dynamodb(valid_update_message)
        
        response = dynamodb_table.get_item(
            Key={
                'client_id': valid_update_message['client_id'],
                'timestamp': valid_update_message['timestamp']
            }
        )
        item = response['Item']
        assert item['attribute_name'] == 'name'
        assert item['before_value'] == 'LEE|ABC'
        assert item['after_value'] == 'TAN|XX'
    
    def test_write_delete_with_before_value(self, dynamodb_table, valid_delete_message):
        """Should write DELETE message with before_value"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        write_to_dynamodb(valid_delete_message)
        
        response = dynamodb_table.get_item(
            Key={
                'client_id': valid_delete_message['client_id'],
                'timestamp': valid_delete_message['timestamp']
            }
        )
        item = response['Item']
        assert item['before_value'] == 'LEE|ABC'
        assert 'after_value' not in item
        assert 'attribute_name' not in item


class TestLambdaHandler:
    """Test lambda_handler function"""
    
    def test_successful_processing(self, dynamodb_table, sqs_event):
        """Should process valid SQS message successfully"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        result = lambda_handler(sqs_event, None)
        
        assert result['batchItemFailures'] == []
    
    def test_multiple_messages(self, dynamodb_table, valid_create_message):
        """Should process multiple CREATE messages in batch"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        event = {
            'Records': [
                {
                    'messageId': f'msg-{i}',
                    'body': json.dumps({
                        **valid_create_message,
                        'log_id': f'log-{i}',
                        'client_id': f'client-{i}'
                    })
                }
                for i in range(5)
            ]
        }
        
        result = lambda_handler(event, None)
        
        assert result['batchItemFailures'] == []
        
        # Verify all items were written
        for i in range(5):
            response = dynamodb_table.get_item(
                Key={
                    'client_id': f'client-{i}',
                    'timestamp': valid_create_message['timestamp']
                }
            )
            assert 'Item' in response
    
    def test_invalid_message_not_retried(self, dynamodb_table):
        """Should not retry malformed messages (missing required fields)"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        event = {
            'Records': [
                {
                    'messageId': 'msg-invalid',
                    'body': json.dumps({'invalid': 'message'})
                }
            ]
        }
        
        result = lambda_handler(event, None)
        
        # Malformed messages should not be retried
        assert result['batchItemFailures'] == []
    
    def test_partial_batch_failure(self, dynamodb_table, valid_create_message):
        """Should process valid messages even if some are invalid"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        event = {
            'Records': [
                {
                    'messageId': 'msg-valid',
                    'body': json.dumps(valid_create_message)
                },
                {
                    'messageId': 'msg-invalid',
                    'body': json.dumps({'missing': 'fields'})
                }
            ]
        }
        
        result = lambda_handler(event, None)
        
        # Only validation errors shouldn't be retried
        assert result['batchItemFailures'] == []
        
        # Verify valid message was written
        response = dynamodb_table.get_item(
            Key={
                'client_id': valid_create_message['client_id'],
                'timestamp': valid_create_message['timestamp']
            }
        )
        assert 'Item' in response
    
    @patch('lambda_function.table')
    def test_dynamodb_error_retried(self, mock_table, sqs_event):
        """Should retry on DynamoDB errors"""
        from botocore.exceptions import ClientError
        
        # Simulate DynamoDB error
        mock_table.put_item.side_effect = ClientError(
            {'Error': {'Code': 'ProvisionedThroughputExceededException'}},
            'PutItem'
        )
        
        result = lambda_handler(sqs_event, None)
        
        # Should report failure for retry
        assert len(result['batchItemFailures']) == 1
        assert result['batchItemFailures'][0]['itemIdentifier'] == 'msg-123'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

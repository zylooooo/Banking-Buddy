"""
Lambda function to consume audit log messages from SQS and write to DynamoDB.
Handles batch processing with retry logic and partial failure reporting.
"""
import json
import os
import logging
from datetime import datetime
from typing import Dict, List, Any
import boto3
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.environ['DYNAMODB_TABLE_NAME']
table = dynamodb.Table(table_name)

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Process SQS messages containing audit log entries and write to DynamoDB.
    
    Args:
        event: SQS event containing Records array
        context: Lambda context
        
    Returns:
        Response with batchItemFailures for partial failure handling
    """
    logger.info(f"Processing {len(event['Records'])} audit log messages")
    
    batch_item_failures = []
    
    for record in event['Records']:
        message_id = record['messageId']
        try:
            # Parse message body
            message_body = json.loads(record['body'])
            
            # Validate required fields
            validate_audit_message(message_body)
            
            # Write to DynamoDB
            write_to_dynamodb(message_body)
            
            logger.info(f"Successfully processed message {message_id}")
            
        except ValueError as e:
            # Validation error - message is malformed, don't retry
            logger.error(f"Validation error for message {message_id}: {str(e)}")
            # Don't add to failures - let it be deleted from queue
            
        except ClientError as e:
            # DynamoDB error - could be transient, retry
            error_code = e.response['Error']['Code']
            logger.error(f"DynamoDB error for message {message_id}: {error_code} - {str(e)}")
            batch_item_failures.append({"itemIdentifier": message_id})
            
        except Exception as e:
            # Unexpected error - retry
            logger.error(f"Unexpected error for message {message_id}: {str(e)}")
            batch_item_failures.append({"itemIdentifier": message_id})
    
    # Return failed message IDs for SQS to retry
    logger.info(f"Completed processing. Failures: {len(batch_item_failures)}")
    return {"batchItemFailures": batch_item_failures}


def validate_audit_message(message: Dict[str, Any]) -> None:
    """
    Validate that audit message contains all required fields based on the 7 requirements.
    
    Requirements:
    1. CRUD - CREATE, READ, UPDATE, DELETE
    2. Attribute name - For UPDATE only (e.g., "First Name|Address")
    3. Before Value - For UPDATE and DELETE (e.g., "LEE|ABC")
    4. After Value - For CREATE and UPDATE (e.g., "TAN|XX")
    5. Agent ID
    6. Client ID
    7. DateTime - ISO 8601 format
    
    Args:
        message: Audit message to validate
        
    Raises:
        ValueError: If required fields are missing or invalid
    """
    # Always required fields
    required_fields = [
        'log_id', 'timestamp', 'client_id', 'agent_id', 
        'crud_operation', 'source_service', 'ttl'
    ]
    
    for field in required_fields:
        if field not in message:
            raise ValueError(f"Missing required field: {field}")
        if not message[field]:
            raise ValueError(f"Field {field} cannot be empty")
    
    # Validate CRUD operation
    valid_operations = ['CREATE', 'READ', 'UPDATE', 'DELETE']
    operation = message['crud_operation']
    if operation not in valid_operations:
        raise ValueError(f"Invalid crud_operation: {operation}")
    
    # Validate conditional fields based on operation
    if operation == 'CREATE':
        # Requirement 4: After value required for CREATE
        if 'after_value' not in message or not message['after_value']:
            raise ValueError("after_value is required for CREATE operation")
    
    elif operation == 'UPDATE':
        # Requirement 2: Attribute name required for UPDATE
        if 'attribute_name' not in message or not message['attribute_name']:
            raise ValueError("attribute_name is required for UPDATE operation")
        # Requirement 3: Before value required for UPDATE
        if 'before_value' not in message or not message['before_value']:
            raise ValueError("before_value is required for UPDATE operation")
        # Requirement 4: After value required for UPDATE
        if 'after_value' not in message or not message['after_value']:
            raise ValueError("after_value is required for UPDATE operation")
    
    elif operation == 'DELETE':
        # Requirement 3: Before value required for DELETE
        if 'before_value' not in message or not message['before_value']:
            raise ValueError("before_value is required for DELETE operation")
    
    # Requirement 7: Validate timestamp format (ISO 8601)
    try:
        datetime.fromisoformat(message['timestamp'].replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        raise ValueError(f"Invalid timestamp format: {message['timestamp']}")


def write_to_dynamodb(message: Dict[str, Any]) -> None:
    """
    Write audit message to DynamoDB table matching the 7 requirements.
    
    Args:
        message: Audit message to write
        
    Raises:
        ClientError: If DynamoDB operation fails
    """
    operation = message['crud_operation']
    
    # Always present fields
    item = {
        'log_id': message['log_id'],
        'timestamp': message['timestamp'],
        'client_id': message['client_id'],
        'agent_id': message['agent_id'],
        'crud_operation': operation,
        'source_service': message['source_service'],
        'ttl': message['ttl']
    }
    
    # Add conditional fields based on operation type
    if operation == 'CREATE':
        # CREATE: Only after_value
        item['after_value'] = message['after_value']
    
    elif operation == 'UPDATE':
        # UPDATE: attribute_name, before_value, after_value
        item['attribute_name'] = message['attribute_name']
        item['before_value'] = message['before_value']
        item['after_value'] = message['after_value']
    
    elif operation == 'DELETE':
        # DELETE: Only before_value
        item['before_value'] = message['before_value']
    
    # READ operation: No additional fields
    
    # Write to DynamoDB
    table.put_item(Item=item)
    
    logger.debug(f"Wrote audit log {item['log_id']} ({operation}) for client {item['client_id']} to DynamoDB")

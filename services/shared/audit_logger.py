import boto3
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class AuditLogger:
    """
    Shared library for sending audit log messages to SQS queue.
    
    This library should be used by all services that need to log CRUD operations
    for compliance and audit purposes.
    """
    
    def __init__(self, queue_url: str, source_service: str):
        """
        Initialize the audit logger.
        
        Args:
            queue_url: SQS queue URL for audit logs
            source_service: Name of the service using this logger
        """
        self.sqs = boto3.client('sqs')
        self.queue_url = queue_url
        self.source_service = source_service
        
    def log_create(self, client_id: str, agent_id: str, after_value: str, 
                   correlation_id: Optional[str] = None) -> bool:
        """
        Log a CREATE operation.
        
        Args:
            client_id: ID of the client
            agent_id: ID of the agent performing the operation
            after_value: The value created (e.g., "LEE|ABC")
            correlation_id: Optional correlation ID for request tracing
            
        Returns:
            True if log was sent successfully, False otherwise
        """
        return self._send_log(
            crud_operation='CREATE',
            client_id=client_id,
            agent_id=agent_id,
            after_value=after_value,
            correlation_id=correlation_id
        )
    
    def log_read(self, client_id: str, agent_id: str, 
                 correlation_id: Optional[str] = None) -> bool:
        """
        Log a READ operation.
        
        Args:
            client_id: ID of the client
            agent_id: ID of the agent performing the operation
            correlation_id: Optional correlation ID for request tracing
            
        Returns:
            True if log was sent successfully, False otherwise
        """
        return self._send_log(
            crud_operation='READ',
            client_id=client_id,
            agent_id=agent_id,
            correlation_id=correlation_id
        )
    
    def log_update(self, client_id: str, agent_id: str, attribute_name: str,
                   before_value: str, after_value: str,
                   correlation_id: Optional[str] = None) -> bool:
        """
        Log an UPDATE operation.
        
        Args:
            client_id: ID of the client
            agent_id: ID of the agent performing the operation
            attribute_name: Name of the attribute being updated (e.g., "First Name")
            before_value: Previous value (e.g., "LEE")
            after_value: New value (e.g., "TAN")
            correlation_id: Optional correlation ID for request tracing
            
        Returns:
            True if log was sent successfully, False otherwise
        """
        return self._send_log(
            crud_operation='UPDATE',
            client_id=client_id,
            agent_id=agent_id,
            attribute_name=attribute_name,
            before_value=before_value,
            after_value=after_value,
            correlation_id=correlation_id
        )
    
    def log_delete(self, client_id: str, agent_id: str, before_value: str,
                   correlation_id: Optional[str] = None) -> bool:
        """
        Log a DELETE operation.
        
        Args:
            client_id: ID of the client
            agent_id: ID of the agent performing the operation
            before_value: The value being deleted (e.g., "LEE|ABC")
            correlation_id: Optional correlation ID for request tracing
            
        Returns:
            True if log was sent successfully, False otherwise
        """
        return self._send_log(
            crud_operation='DELETE',
            client_id=client_id,
            agent_id=agent_id,
            before_value=before_value,
            correlation_id=correlation_id
        )
    
    def _send_log(self, crud_operation: str, client_id: str, agent_id: str,
                  attribute_name: Optional[str] = None,
                  before_value: Optional[str] = None,
                  after_value: Optional[str] = None,
                  correlation_id: Optional[str] = None) -> bool:
        """
        Internal method to send audit log message to SQS.
        
        Args:
            crud_operation: CRUD operation type
            client_id: Client ID
            agent_id: Agent ID
            attribute_name: Attribute name (for UPDATE operations)
            before_value: Previous value
            after_value: New value
            correlation_id: Correlation ID for tracing
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Create the audit log message
            message = {
                'crud_operation': crud_operation,
                'client_id': client_id,
                'agent_id': agent_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',  # ISO 8601 format
                'source_service': self.source_service,
                'correlation_id': correlation_id or str(uuid.uuid4())
            }
            
            # Add optional fields if provided
            if attribute_name:
                message['attribute_name'] = attribute_name
            if before_value:
                message['before_value'] = before_value
            if after_value:
                message['after_value'] = after_value
            
            # Send message to SQS
            response = self.sqs.send_message(
                QueueUrl=self.queue_url,
                MessageBody=json.dumps(message),
                MessageAttributes={
                    'operation_type': {
                        'StringValue': crud_operation,
                        'DataType': 'String'
                    },
                    'client_id': {
                        'StringValue': client_id,
                        'DataType': 'String'
                    },
                    'source_service': {
                        'StringValue': self.source_service,
                        'DataType': 'String'
                    }
                }
            )
            
            logger.info(f"Audit log sent successfully. MessageId: {response['MessageId']}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to send audit log to SQS: {e.response['Error']['Message']}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending audit log: {str(e)}")
            return False


# Convenience function to create logger instance from environment variables
def create_audit_logger_from_env(source_service: str) -> AuditLogger:
    """
    Create an AuditLogger instance using environment variables.
    
    Expected environment variables:
    - AUDIT_LOG_QUEUE_URL: SQS queue URL for audit logs
    
    Args:
        source_service: Name of the service using this logger
        
    Returns:
        Configured AuditLogger instance
        
    Raises:
        ValueError: If required environment variables are missing
    """
    import os
    
    queue_url = os.environ.get('AUDIT_LOG_QUEUE_URL')
    if not queue_url:
        raise ValueError("AUDIT_LOG_QUEUE_URL environment variable is required")
    
    return AuditLogger(queue_url=queue_url, source_service=source_service)
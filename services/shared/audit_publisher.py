"""
Asynchronous audit publisher for services.
Publishes audit messages to SQS matching the 7 audit requirements.

Requirements:
1. CRUD - CREATE, READ, UPDATE, DELETE
2. Attribute name - For UPDATE only (e.g., "First Name|Address")
3. Before Value - For UPDATE and DELETE (e.g., "LEE|ABC")
4. After Value - For CREATE and UPDATE (e.g., "TAN|XX")
5. Agent ID
6. Client ID
7. DateTime - ISO 8601 format
"""
import json
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class AuditPublisher:
    """
    Publishes audit messages to SQS queue for asynchronous processing.
    Non-blocking: does not raise exceptions on failure.
    """
    
    def __init__(self, queue_url: Optional[str] = None, source_service: Optional[str] = None,
                 retention_days: int = 2555):
        """
        Initialize audit publisher with SQS client.
        
        Args:
            queue_url: SQS queue URL. If not provided, reads from environment variable.
            source_service: Name of the service using this publisher.
            retention_days: Number of days to retain logs (default: 2555 = 7 years).
        """
        self.queue_url = queue_url or os.environ.get('AUDIT_SQS_QUEUE_URL')
        self.source_service = source_service or os.environ.get('SERVICE_NAME', 'unknown-service')
        self.retention_days = retention_days
        
        if not self.queue_url:
            logger.warning("Audit SQS queue URL not configured. Audit logging disabled.")
            self.sqs_client = None
        else:
            self.sqs_client = boto3.client('sqs')
    
    def log_create(self, client_id: str, agent_id: str, after_value: str) -> None:
        """
        Log a CREATE operation.
        Requirement 4: After value is required for CREATE.
        
        Args:
            client_id: ID of the client
            agent_id: ID of the agent performing the operation
            after_value: The value created (e.g., "LEE|ABC Street")
        """
        self._publish_audit_message(
            crud_operation='CREATE',
            client_id=client_id,
            agent_id=agent_id,
            attribute_name=None,
            before_value=None,
            after_value=after_value
        )
    
    def log_read(self, client_id: str, agent_id: str) -> None:
        """
        Log a READ operation.
        No additional values required for READ.
        
        Args:
            client_id: ID of the client
            agent_id: ID of the agent performing the operation
        """
        self._publish_audit_message(
            crud_operation='READ',
            client_id=client_id,
            agent_id=agent_id,
            attribute_name=None,
            before_value=None,
            after_value=None
        )
    
    def log_update(self, client_id: str, agent_id: str, attribute_name: str,
                   before_value: str, after_value: str) -> None:
        """
        Log an UPDATE operation.
        Requirement 2: Attribute name required for UPDATE (e.g., "First Name|Address").
        Requirement 3: Before value required for UPDATE.
        Requirement 4: After value required for UPDATE.
        
        Args:
            client_id: ID of the client
            agent_id: ID of the agent performing the operation
            attribute_name: Name of the attribute being updated (e.g., "First Name|Address")
            before_value: Previous value (e.g., "LEE|ABC")
            after_value: New value (e.g., "TAN|XX")
        """
        self._publish_audit_message(
            crud_operation='UPDATE',
            client_id=client_id,
            agent_id=agent_id,
            attribute_name=attribute_name,
            before_value=before_value,
            after_value=after_value
        )
    
    def log_delete(self, client_id: str, agent_id: str, before_value: str) -> None:
        """
        Log a DELETE operation.
        Requirement 3: Before value required for DELETE.
        
        Args:
            client_id: ID of the client
            agent_id: ID of the agent performing the operation
            before_value: The value being deleted (e.g., "Active Account")
        """
        self._publish_audit_message(
            crud_operation='DELETE',
            client_id=client_id,
            agent_id=agent_id,
            attribute_name=None,
            before_value=before_value,
            after_value=None
        )
    
    def _publish_audit_message(self, crud_operation: str, client_id: str, agent_id: str,
                               attribute_name: Optional[str], before_value: Optional[str],
                               after_value: Optional[str]) -> None:
        """
        Publish audit message to SQS queue matching the 7 requirements.
        Does not raise exceptions on failure - logs errors and continues.
        
        Args:
            crud_operation: CRUD operation (CREATE, READ, UPDATE, DELETE)
            client_id: Client ID (Requirement 6)
            agent_id: Agent ID (Requirement 5)
            attribute_name: Attribute name for UPDATE only (Requirement 2)
            before_value: Before value for UPDATE/DELETE (Requirement 3)
            after_value: After value for CREATE/UPDATE (Requirement 4)
        """
        if not self.sqs_client:
            logger.debug("SQS client not initialized. Skipping audit log.")
            return
        
        # Validate required fields
        if not client_id or not client_id.strip():
            logger.warning("Skipping audit log: Client ID is empty")
            return
        if not agent_id or not agent_id.strip():
            logger.warning("Skipping audit log: Agent ID is empty")
            return
        
        # Validate conditional fields based on operation
        if crud_operation == 'CREATE' and not after_value:
            logger.warning("Skipping audit log: after_value required for CREATE")
            return
        elif crud_operation == 'UPDATE':
            if not attribute_name or not before_value or not after_value:
                logger.warning("Skipping audit log: attribute_name, before_value, after_value required for UPDATE")
                return
        elif crud_operation == 'DELETE' and not before_value:
            logger.warning("Skipping audit log: before_value required for DELETE")
            return
        
        try:
            # Requirement 7: DateTime using ISO 8601 format
            timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            
            # Calculate TTL (retention_days from now)
            ttl_datetime = datetime.now(timezone.utc) + timedelta(days=self.retention_days)
            ttl = int(ttl_datetime.timestamp())
            
            # Build audit message matching the CORRECT schema
            message = {
                'log_id': str(uuid.uuid4()),
                'timestamp': timestamp,
                'client_id': client_id.strip(),
                'agent_id': agent_id.strip(),
                'crud_operation': crud_operation,
                'source_service': self.source_service,
                'ttl': ttl
            }
            
            # Add conditional fields based on operation
            if crud_operation == 'CREATE':
                message['after_value'] = after_value
            elif crud_operation == 'UPDATE':
                message['attribute_name'] = attribute_name
                message['before_value'] = before_value
                message['after_value'] = after_value
            elif crud_operation == 'DELETE':
                message['before_value'] = before_value
            # READ has no additional fields
            
            # Send to SQS
            response = self.sqs_client.send_message(
                QueueUrl=self.queue_url,
                MessageBody=json.dumps(message)
            )
            
            logger.debug(
                f"Audit message published: {crud_operation} for client {client_id} "
                f"(MessageId: {response['MessageId']})"
            )
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            logger.error(f"Failed to publish audit message to SQS: {error_code} - {str(e)}")
            # Non-blocking: don't raise exception
            
        except Exception as e:
            logger.error(f"Unexpected error publishing audit message: {str(e)}")
            # Non-blocking: don't raise exception

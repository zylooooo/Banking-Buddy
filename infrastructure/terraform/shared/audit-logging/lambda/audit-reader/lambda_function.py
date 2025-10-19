"""
Lambda function to query audit logs from DynamoDB with role-based access control.
Agents can only see their own logs via AgentIndex, admins see all logs.
"""
import json
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from decimal import Decimal
import boto3
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.environ['DYNAMODB_TABLE_NAME']
table = dynamodb.Table(table_name)
agent_index_name = os.environ['AGENT_INDEX_NAME']
operation_index_name = os.environ['OPERATION_INDEX_NAME']


class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder for DynamoDB Decimal types"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Query audit logs based on user role and query parameters.
    
    Args:
        event: API Gateway event with requestContext containing JWT claims
        context: Lambda context
        
    Returns:
        API Gateway response with audit logs
    """
    try:
        # Extract user context from JWT claims
        user_context = extract_user_context(event)
        
        # Extract query parameters
        query_params = event.get('queryStringParameters') or {}
        
        # Query audit logs based on role
        audit_logs = query_audit_logs(user_context, query_params)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'logs': audit_logs,
                'count': len(audit_logs)
            }, cls=DecimalEncoder)
        }
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }
        
    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Internal server error'})
        }
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Internal server error'})
        }


def extract_user_context(event: Dict[str, Any]) -> Dict[str, str]:
    """
    Extract user ID and role from JWT claims in API Gateway event.
    
    Args:
        event: API Gateway event
        
    Returns:
        Dictionary with user_id and role
        
    Raises:
        ValueError: If JWT claims are missing or invalid
    """
    try:
        # API Gateway puts JWT claims in requestContext.authorizer.jwt.claims
        claims = event['requestContext']['authorizer']['jwt']['claims']
        
        user_id = claims.get('sub')
        role = claims.get('custom:role')
        
        if not user_id:
            raise ValueError("Missing user ID in JWT claims")
        if not role:
            raise ValueError("Missing role in JWT claims")
        
        logger.info(f"User {user_id} with role {role} requesting audit logs")
        
        return {
            'user_id': user_id,
            'role': role
        }
        
    except KeyError as e:
        raise ValueError(f"Invalid JWT structure: {str(e)}")


def query_audit_logs(
    user_context: Dict[str, str],
    query_params: Dict[str, str]
) -> List[Dict[str, Any]]:
    """
    Query audit logs based on user role and parameters.
    Agents can only see their own logs, admins see all logs.
    
    Args:
        user_context: Dictionary with user_id and role
        query_params: Query string parameters (operation, hours, limit)
        
    Returns:
        List of audit log items
    """
    role = user_context['role']
    user_id = user_context['user_id']
    
    # Parse query parameters
    hours = int(query_params.get('hours', '24'))
    limit = int(query_params.get('limit', '100'))
    operation = query_params.get('operation')  # Optional filter
    
    # Calculate time threshold (24 hours ago by default)
    time_threshold = (datetime.utcnow() - timedelta(hours=hours)).isoformat() + 'Z'
    
    logger.info(f"Querying logs: role={role}, hours={hours}, operation={operation}")
    
    # Query based on role
    if role == 'agent':
        # Agents can only see their own logs via AgentIndex
        items = query_agent_logs(user_id, time_threshold, limit, operation)
    elif role in ['admin', 'rootAdministrator']:
        # Admins can see all logs
        items = query_all_logs(time_threshold, limit, operation)
    else:
        raise ValueError(f"Invalid role: {role}")
    
    return items


def query_agent_logs(
    agent_id: str,
    time_threshold: str,
    limit: int,
    operation: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Query logs for a specific agent using AgentIndex.
    
    Args:
        agent_id: Agent user ID
        time_threshold: ISO timestamp to filter from
        limit: Maximum number of items to return
        operation: Optional CRUD operation filter
        
    Returns:
        List of audit log items
    """
    # Build query expression
    key_condition = 'agent_id = :agent_id AND #ts >= :threshold'
    expression_values = {
        ':agent_id': agent_id,
        ':threshold': time_threshold
    }
    
    # Add operation filter if specified
    filter_expression = None
    if operation:
        filter_expression = 'crud_operation = :operation'
        expression_values[':operation'] = operation.upper()
    
    # Query AgentIndex
    query_params = {
        'IndexName': agent_index_name,
        'KeyConditionExpression': key_condition,
        'ExpressionAttributeNames': {'#ts': 'timestamp'},
        'ExpressionAttributeValues': expression_values,
        'Limit': limit,
        'ScanIndexForward': False  # Most recent first
    }
    
    if filter_expression:
        query_params['FilterExpression'] = filter_expression
    
    response = table.query(**query_params)
    return response.get('Items', [])


def query_all_logs(
    time_threshold: str,
    limit: int,
    operation: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Query all logs for admins using Scan or OperationIndex.
    
    Args:
        time_threshold: ISO timestamp to filter from
        limit: Maximum number of items to return
        operation: Optional CRUD operation filter
        
    Returns:
        List of audit log items
    """
    # If operation specified, use OperationIndex for efficiency
    if operation:
        key_condition = 'crud_operation = :operation AND #ts >= :threshold'
        expression_values = {
            ':operation': operation.upper(),
            ':threshold': time_threshold
        }
        
        response = table.query(
            IndexName=operation_index_name,
            KeyConditionExpression=key_condition,
            ExpressionAttributeNames={'#ts': 'timestamp'},
            ExpressionAttributeValues=expression_values,
            Limit=limit,
            ScanIndexForward=False
        )
    else:
        # Scan entire table with time filter
        filter_expression = '#ts >= :threshold'
        expression_values = {':threshold': time_threshold}
        
        response = table.scan(
            FilterExpression=filter_expression,
            ExpressionAttributeNames={'#ts': 'timestamp'},
            ExpressionAttributeValues=expression_values,
            Limit=limit
        )
    
    items = response.get('Items', [])
    
    # Sort by timestamp descending (most recent first)
    items.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    
    return items

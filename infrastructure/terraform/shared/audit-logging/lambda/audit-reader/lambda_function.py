"""
Lambda function to query audit logs from DynamoDB with role-based access control.
Agents can only see their own logs via AgentIndex, admins see all logs.
"""
import json
import os
import logging
import base64
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
    Query audit logs based on user role and route.
    
    Routes:
    - GET /api/v1/audit/logs - Query by agent/admin (existing)
    - GET /api/v1/audit/logs/client/{client_id} - Query by client (NEW)
    
    Args:
        event: API Gateway event with requestContext containing JWT claims
        context: Lambda context
        
    Returns:
        API Gateway response with audit logs
    """
    try:
        # Extract user context from JWT claims
        user_context = extract_user_context(event)
        
        # Extract route and parameters from event
        route_key = event.get('routeKey', '')  # e.g., "GET /api/v1/audit/logs/client/{client_id}"
        path_parameters = event.get('pathParameters') or {}
        query_params = event.get('queryStringParameters') or {}
        
        # Parse pagination parameters
        page_size = query_params.get('page_size')
        next_token = query_params.get('next_token')
        
        # Decode pagination token if provided
        exclusive_start_key = None
        if next_token:
            try:
                exclusive_start_key = json.loads(
                    base64.urlsafe_b64decode(next_token.encode()).decode()
                )
                logger.info(f"Decoded pagination token: {exclusive_start_key}")
            except Exception as e:
                logger.error(f"Invalid pagination token: {str(e)}")
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Invalid pagination token'})
                }
        
        # Determine page_size (default 10 if page_size provided, otherwise use limit for backward compatibility)
        if page_size:
            page_size = int(page_size)
            page_size = max(1, min(page_size, 100))  # Clamp between 1-100
        
        logger.info(f"Route: {route_key}, Path params: {path_parameters}, page_size: {page_size}, has_token: {next_token is not None}")
        
        # Route detection
        result = None
        if route_key == 'GET /api/v1/audit/logs':
            # Existing endpoint - query by agent/admin
            result = query_audit_logs(user_context, query_params, page_size, exclusive_start_key)
        
        elif route_key == 'GET /api/v1/audit/logs/client/{client_id}':
            # NEW endpoint - query by client_id
            client_id = path_parameters.get('client_id')
            if not client_id:
                raise ValueError("Missing client_id in path")
            
            result = query_client_logs(user_context, client_id, query_params, page_size, exclusive_start_key)
        
        else:
            raise ValueError(f"Unknown route: {route_key}")
        
        # Extract results
        audit_logs = result['items']
        last_evaluated_key = result.get('last_evaluated_key')
        
        # Encode pagination token for response
        response_next_token = None
        if last_evaluated_key:
            response_next_token = base64.urlsafe_b64encode(
                json.dumps(last_evaluated_key).encode()
            ).decode()
            logger.info(f"Generated next_token for {len(audit_logs)} items")
        
        # Build response
        response_body = {
            'logs': audit_logs,
            'count': len(audit_logs),
            'next_token': response_next_token,
            'has_more': response_next_token is not None
        }
        
        # Add page_size to response if pagination was used
        if page_size:
            response_body['page_size'] = page_size
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response_body, cls=DecimalEncoder)
        }
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        # Determine status code based on error message
        status_code = 400
        if "not found" in str(e).lower():
            status_code = 404
        elif "only" in str(e).lower():  # "agents only" message
            status_code = 403
        
        return {
            'statusCode': status_code,
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
    query_params: Dict[str, str],
    page_size: Optional[int] = None,
    exclusive_start_key: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Query audit logs based on user role and parameters.
    Agents can only see their own logs, admins see all logs.
    
    Args:
        user_context: Dictionary with user_id and role
        query_params: Query string parameters (operation, hours, limit)
        page_size: Number of items per page (if pagination enabled)
        exclusive_start_key: DynamoDB pagination cursor (decoded from next_token)
        
    Returns:
        Dictionary with 'items' (list of logs) and 'last_evaluated_key' (pagination cursor)
    """
    role = user_context['role']
    user_id = user_context['user_id']
    
    # Parse query parameters
    hours = query_params.get('hours')  # Optional time filter
    limit = int(query_params.get('limit', '100'))
    operation = query_params.get('operation')  # Optional filter
    
    # Use page_size if provided, otherwise fall back to limit for backward compatibility
    effective_limit = page_size if page_size else limit
    
    # Calculate time threshold if hours specified
    # For pagination (page_size specified), default to no time filter to get ALL logs
    if hours:
        time_threshold = (datetime.utcnow() - timedelta(hours=int(hours))).isoformat() + 'Z'
    elif page_size:
        # Pagination mode: get all logs (set very old threshold)
        time_threshold = '2000-01-01T00:00:00Z'
    else:
        # Legacy mode: default to 24 hours for backward compatibility
        time_threshold = (datetime.utcnow() - timedelta(hours=24)).isoformat() + 'Z'
    
    logger.info(f"Querying logs: role={role}, hours={hours}, operation={operation}, limit={effective_limit}, threshold={time_threshold}")
    
    # Query based on role
    if role == 'agent':
        # Agents can only see their own logs via AgentIndex
        result = query_agent_logs(user_id, time_threshold, effective_limit, operation, exclusive_start_key)
    elif role in ['admin', 'rootAdministrator']:
        # Admins can see all logs
        result = query_all_logs(time_threshold, effective_limit, operation, exclusive_start_key)
    else:
        raise ValueError(f"Invalid role: {role}")
    
    return result


def query_agent_logs(
    agent_id: str,
    time_threshold: str,
    limit: int,
    operation: Optional[str] = None,
    exclusive_start_key: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Query logs for a specific agent using AgentIndex.
    
    Args:
        agent_id: Agent user ID
        time_threshold: ISO timestamp to filter from
        limit: Maximum number of items to return
        operation: Optional CRUD operation filter
        exclusive_start_key: DynamoDB pagination cursor (for continuing from previous page)
        
    Returns:
        Dictionary with 'items' (list of logs) and 'last_evaluated_key' (pagination cursor)
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
    
    # If operation filter is specified, we need to keep querying until we get enough items
    # because FilterExpression is applied AFTER Limit
    if filter_expression:
        # If continuing from a previous page, do a single query to maintain cursor consistency
        if exclusive_start_key:
            query_params = {
                'IndexName': agent_index_name,
                'KeyConditionExpression': key_condition,
                'ExpressionAttributeNames': {'#ts': 'timestamp'},
                'ExpressionAttributeValues': expression_values,
                'FilterExpression': filter_expression,
                'Limit': limit * 2,  # Request more to account for filtering
                'ScanIndexForward': False,
                'ExclusiveStartKey': exclusive_start_key
            }
            
            response = table.query(**query_params)
            items = response.get('Items', [])
            items_to_return = items[:limit]
            
            # Determine if there's more data
            has_last_key = response.get('LastEvaluatedKey') is not None
            has_more = len(items) > limit or (len(items) == limit and has_last_key)
            
            return {
                'items': items_to_return,
                'last_evaluated_key': response.get('LastEvaluatedKey') if has_more else None
            }
        
        # First page: Keep querying until we have enough items
        all_items = []
        last_evaluated_key = None
        
        while len(all_items) < limit:
            query_params = {
                'IndexName': agent_index_name,
                'KeyConditionExpression': key_condition,
                'ExpressionAttributeNames': {'#ts': 'timestamp'},
                'ExpressionAttributeValues': expression_values,
                'FilterExpression': filter_expression,
                'Limit': limit * 2,  # Request more to account for filtering
                'ScanIndexForward': False
            }
            
            if last_evaluated_key:
                query_params['ExclusiveStartKey'] = last_evaluated_key
            
            response = table.query(**query_params)
            items = response.get('Items', [])
            all_items.extend(items)
            
            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break  # No more data
        
        # Trim to requested limit
        items_to_return = all_items[:limit]
        has_more_items = len(all_items) > limit or (len(all_items) == limit and last_evaluated_key is not None)
        
        return {
            'items': items_to_return,
            'last_evaluated_key': last_evaluated_key if has_more_items else None
        }
    else:
        # No FilterExpression, so Limit works as expected
        query_params = {
            'IndexName': agent_index_name,
            'KeyConditionExpression': key_condition,
            'ExpressionAttributeNames': {'#ts': 'timestamp'},
            'ExpressionAttributeValues': expression_values,
            'Limit': limit,
            'ScanIndexForward': False  # Most recent first
        }
        
        # Add pagination support
        if exclusive_start_key:
            query_params['ExclusiveStartKey'] = exclusive_start_key
        
        response = table.query(**query_params)
        
        return {
            'items': response.get('Items', []),
            'last_evaluated_key': response.get('LastEvaluatedKey')
        }


def query_all_logs(
    time_threshold: str,
    limit: int,
    operation: Optional[str] = None,
    exclusive_start_key: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Query all logs for admins using OperationIndex.
    
    When no operation is specified, queries all operations (CREATE, READ, UPDATE, DELETE)
    and merges results in timestamp order to maintain proper pagination.
    
    Args:
        time_threshold: ISO timestamp to filter from
        limit: Maximum number of items to return
        operation: Optional CRUD operation filter
        exclusive_start_key: DynamoDB pagination cursor (for continuing from previous page)
        
    Returns:
        Dictionary with 'items' (list of logs) and 'last_evaluated_key' (pagination cursor)
    """
    # If operation specified, use OperationIndex for that specific operation
    if operation:
        key_condition = 'crud_operation = :operation AND #ts >= :threshold'
        expression_values = {
            ':operation': operation.upper(),
            ':threshold': time_threshold
        }
        
        query_params = {
            'IndexName': operation_index_name,
            'KeyConditionExpression': key_condition,
            'ExpressionAttributeNames': {'#ts': 'timestamp'},
            'ExpressionAttributeValues': expression_values,
            'Limit': limit,
            'ScanIndexForward': False
        }
        
        # Add pagination support
        if exclusive_start_key:
            query_params['ExclusiveStartKey'] = exclusive_start_key
        
        response = table.query(**query_params)
        items = response.get('Items', [])
        
        # Already sorted by timestamp descending due to ScanIndexForward=False
        
        return {
            'items': items,
            'last_evaluated_key': response.get('LastEvaluatedKey')
        }
    else:
        # Query all operations using OperationIndex and merge results
        # This ensures proper timestamp ordering for pagination
        operations = ['CREATE', 'READ', 'UPDATE', 'DELETE']
        
        # Strategy for pagination with multiple operations:
        # 1. Query each operation with the limit
        # 2. Merge and sort by timestamp
        # 3. Take top N items
        # 4. For next_token, encode the last timestamp + operations queried
        
        all_items = []
        operation_cursors = {}
        
        # If exclusive_start_key is provided, it contains pagination state for each operation
        if exclusive_start_key:
            # Extract cursor per operation from exclusive_start_key
            operation_cursors = exclusive_start_key.get('operation_cursors', {})
            last_timestamp = exclusive_start_key.get('last_timestamp')
        else:
            last_timestamp = None
        
        # Query each operation
        for op in operations:
            key_condition = 'crud_operation = :operation AND #ts >= :threshold'
            expression_values = {
                ':operation': op,
                ':threshold': time_threshold
            }
            
            query_params = {
                'IndexName': operation_index_name,
                'KeyConditionExpression': key_condition,
                'ExpressionAttributeNames': {'#ts': 'timestamp'},
                'ExpressionAttributeValues': expression_values,
                'Limit': limit,
                'ScanIndexForward': False  # Most recent first
            }
            
            # If continuing pagination, use operation-specific cursor
            if op in operation_cursors:
                query_params['ExclusiveStartKey'] = operation_cursors[op]
            
            response = table.query(**query_params)
            items = response.get('Items', [])
            
            # Filter out items we've already returned (based on last_timestamp from previous page)
            if last_timestamp:
                items = [item for item in items if item.get('timestamp', '') < last_timestamp]
            
            all_items.extend(items)
            
            # Store cursor for this operation if there's more data
            if response.get('LastEvaluatedKey'):
                operation_cursors[op] = response['LastEvaluatedKey']
            elif op in operation_cursors:
                # No more data for this operation, remove cursor
                del operation_cursors[op]
        
        # Sort all items by timestamp descending
        all_items.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Take only the requested limit
        items_to_return = all_items[:limit]
        
        # Determine if there's more data
        has_more = len(operation_cursors) > 0
        
        # Build next pagination token with operation cursors and last timestamp
        next_last_evaluated_key = None
        if has_more and items_to_return:
            next_last_evaluated_key = {
                'operation_cursors': operation_cursors,
                'last_timestamp': items_to_return[-1].get('timestamp')
            }
        
        return {
            'items': items_to_return,
            'last_evaluated_key': next_last_evaluated_key
        }


def query_client_logs(
    user_context: Dict[str, str],
    client_id: str,
    query_params: Dict[str, str],
    page_size: Optional[int] = None,
    exclusive_start_key: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Query audit logs for a specific client with authorization.
    Agents can only query their own clients.
    
    This endpoint is optimized for "recent activity" display on client detail pages.
    Uses DynamoDB partition key (client_id) for O(1) lookup performance.
    
    Args:
        user_context: Dictionary with user_id and role
        client_id: Client ID to query logs for
        query_params: Query string parameters (limit, operation)
        page_size: Number of items per page (if pagination enabled)
        exclusive_start_key: DynamoDB pagination cursor (for continuing from previous page)
        
    Returns:
        Dictionary with 'items' (list of logs) and 'last_evaluated_key' (pagination cursor)
        
    Raises:
        ValueError: If role is not agent OR agent doesn't own this client
    """
    role = user_context['role']
    user_id = user_context['user_id']
    
    # Parse query parameters
    limit = int(query_params.get('limit', '10'))
    limit = min(limit, 20)  # Cap at 20 for performance
    operation = query_params.get('operation')  # Optional: CREATE, UPDATE, DELETE
    
    # Use page_size if provided, otherwise fall back to limit for backward compatibility
    effective_limit = page_size if page_size else limit
    
    logger.info(f"Querying logs for client {client_id}: role={role}, limit={effective_limit}, operation={operation}")
    
    # Authorization: AGENT ONLY
    if role not in ['agent']:
        logger.warning(f"Non-agent role {role} attempted to access client-specific endpoint")
        raise ValueError("This endpoint is for agents only. Admins should use GET /api/v1/audit/logs")
    
    # Verify agent owns this client (only if not paginating - skip verification on subsequent pages)
    if not exclusive_start_key:
        # Strategy: Query ONE log to get agent_id, then verify ownership
        verification_response = table.query(
            KeyConditionExpression='client_id = :client_id',
            ExpressionAttributeValues={':client_id': client_id},
            Limit=1,
            ScanIndexForward=False  # Most recent first
        )
        
        if not verification_response.get('Items'):
            # No logs found - client doesn't exist or has no activity
            logger.warning(f"No logs found for client {client_id}")
            raise ValueError("Client not found")
        
        # Check if agent owns this client
        client_agent_id = verification_response['Items'][0].get('agent_id')
        if client_agent_id != user_id:
            logger.warning(f"Agent {user_id} attempted to access client {client_id} owned by {client_agent_id}")
            raise ValueError("Client not found")  # Don't reveal client exists
        
        logger.info(f"Agent {user_id} authorized to query logs for client {client_id}")
    
    # Build query expression
    key_condition = 'client_id = :client_id'
    expression_values = {':client_id': client_id}
    
    # Add operation filter if specified
    filter_expression = None
    if operation:
        operation_upper = operation.upper()
        if operation_upper in ['CREATE', 'READ', 'UPDATE', 'DELETE']:
            filter_expression = 'crud_operation = :operation'
            expression_values[':operation'] = operation_upper
        else:
            logger.warning(f"Invalid operation filter: {operation}")
    
    # If operation filter is specified, we need to keep querying until we get enough items
    # because FilterExpression is applied AFTER Limit
    if filter_expression:
        # If continuing from a previous page, do a single query to maintain cursor consistency
        if exclusive_start_key:
            query_params_ddb = {
                'KeyConditionExpression': key_condition,
                'ExpressionAttributeValues': expression_values,
                'FilterExpression': filter_expression,
                'Limit': effective_limit * 2,  # Request more to account for filtering
                'ScanIndexForward': False,
                'ExclusiveStartKey': exclusive_start_key
            }
            
            response = table.query(**query_params_ddb)
            items = response.get('Items', [])
            items_to_return = items[:effective_limit]
            
            # Determine if there's more data
            has_last_key = response.get('LastEvaluatedKey') is not None
            has_more = len(items) > effective_limit or (len(items) == effective_limit and has_last_key)
            
            logger.info(f"Retrieved {len(items_to_return)} logs for client {client_id} (continuation with operation filter)")
            
            return {
                'items': items_to_return,
                'last_evaluated_key': response.get('LastEvaluatedKey') if has_more else None
            }
        
        # First page: Keep querying until we have enough items
        all_items = []
        last_evaluated_key = None
        
        while len(all_items) < effective_limit:
            query_params_ddb = {
                'KeyConditionExpression': key_condition,
                'ExpressionAttributeValues': expression_values,
                'FilterExpression': filter_expression,
                'Limit': effective_limit * 2,  # Request more to account for filtering
                'ScanIndexForward': False
            }
            
            if last_evaluated_key:
                query_params_ddb['ExclusiveStartKey'] = last_evaluated_key
            
            response = table.query(**query_params_ddb)
            items = response.get('Items', [])
            all_items.extend(items)
            
            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break  # No more data
        
        # Trim to requested limit
        items_to_return = all_items[:effective_limit]
        has_more_items = len(all_items) > effective_limit or (len(all_items) == effective_limit and last_evaluated_key is not None)
        
        logger.info(f"Retrieved {len(items_to_return)} logs for client {client_id} (with operation filter)")
        
        return {
            'items': items_to_return,
            'last_evaluated_key': last_evaluated_key if has_more_items else None
        }
    else:
        # No FilterExpression, so Limit works as expected
        query_params_ddb = {
            'KeyConditionExpression': key_condition,
            'ExpressionAttributeValues': expression_values,
            'Limit': effective_limit,
            'ScanIndexForward': False  # Most recent first (DESC)
        }
        
        # Add pagination support
        if exclusive_start_key:
            query_params_ddb['ExclusiveStartKey'] = exclusive_start_key
        
        response = table.query(**query_params_ddb)
        items = response.get('Items', [])
        
        logger.info(f"Retrieved {len(items)} logs for client {client_id}")
        
        return {
            'items': items,
            'last_evaluated_key': response.get('LastEvaluatedKey')
        }

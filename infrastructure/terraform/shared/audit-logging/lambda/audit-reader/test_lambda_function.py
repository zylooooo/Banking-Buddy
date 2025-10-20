"""
Unit tests for audit-reader Lambda function.
Uses pytest and moto for mocking AWS services.
"""
import json
import os
import pytest
from datetime import datetime, timedelta
from moto import mock_aws
import boto3

# Set environment variables before importing
os.environ['DYNAMODB_TABLE_NAME'] = 'test-audit-logs'
os.environ['AGENT_INDEX_NAME'] = 'AgentIndex'
os.environ['OPERATION_INDEX_NAME'] = 'OperationIndex'

from lambda_function import (
    lambda_handler,
    extract_user_context,
    query_audit_logs,
    query_agent_logs,
    query_all_logs
)


@pytest.fixture
def dynamodb_table():
    """Create mock DynamoDB table with test data (correct schema)"""
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
        
        # Add test data with correct schema
        now = datetime.utcnow()
        test_items = [
            {
                'log_id': 'log-1',
                'timestamp': (now - timedelta(minutes=30)).isoformat() + 'Z',  # 30 mins ago (within 1 hour)
                'client_id': 'client-456',
                'agent_id': 'agent-123',
                'crud_operation': 'CREATE',
                'source_service': 'user-service',
                'ttl': 1924905600,
                'after_value': 'TAN|XX'
            },
            {
                'log_id': 'log-2',
                'timestamp': (now - timedelta(hours=2)).isoformat() + 'Z',
                'client_id': 'client-789',
                'agent_id': 'agent-123',
                'crud_operation': 'UPDATE',
                'source_service': 'user-service',
                'ttl': 1924905600,
                'attribute_name': 'name',
                'before_value': 'LEE|ABC',
                'after_value': 'TAN|DEF'
            },
            {
                'log_id': 'log-3',
                'timestamp': (now - timedelta(hours=3)).isoformat() + 'Z',
                'client_id': 'client-111',
                'agent_id': 'agent-999',
                'crud_operation': 'DELETE',
                'source_service': 'user-service',
                'ttl': 1924905600,
                'before_value': 'ABC|XYZ'
            },
            {
                'log_id': 'log-4',
                'timestamp': (now - timedelta(hours=30)).isoformat() + 'Z',
                'client_id': 'client-222',
                'agent_id': 'agent-123',
                'crud_operation': 'READ',
                'source_service': 'user-service',
                'ttl': 1924905600
            }
        ]
        
        for item in test_items:
            table.put_item(Item=item)
        
        yield table


@pytest.fixture
def api_gateway_event_agent():
    """API Gateway event for agent role"""
    return {
        'requestContext': {
            'authorizer': {
                'jwt': {
                    'claims': {
                        'sub': 'agent-123',
                        'custom:role': 'agent'
                    }
                }
            }
        },
        'queryStringParameters': {
            'hours': '24',
            'limit': '100'
        }
    }


@pytest.fixture
def api_gateway_event_admin():
    """API Gateway event for admin role"""
    return {
        'requestContext': {
            'authorizer': {
                'jwt': {
                    'claims': {
                        'sub': 'admin-456',
                        'custom:role': 'admin'
                    }
                }
            }
        },
        'queryStringParameters': {
            'hours': '24',
            'limit': '100'
        }
    }


class TestExtractUserContext:
    """Test extract_user_context function"""
    
    def test_valid_jwt_claims(self, api_gateway_event_agent):
        """Should extract user context from valid JWT"""
        context = extract_user_context(api_gateway_event_agent)
        
        assert context['user_id'] == 'agent-123'
        assert context['role'] == 'agent'
    
    def test_missing_user_id(self):
        """Should raise ValueError for missing user ID"""
        event = {
            'requestContext': {
                'authorizer': {
                    'jwt': {
                        'claims': {
                            'custom:role': 'agent'
                        }
                    }
                }
            }
        }
        
        with pytest.raises(ValueError, match="Missing user ID"):
            extract_user_context(event)
    
    def test_missing_role(self):
        """Should raise ValueError for missing role"""
        event = {
            'requestContext': {
                'authorizer': {
                    'jwt': {
                        'claims': {
                            'sub': 'user-123'
                        }
                    }
                }
            }
        }
        
        with pytest.raises(ValueError, match="Missing role"):
            extract_user_context(event)
    
    def test_invalid_jwt_structure(self):
        """Should raise ValueError for invalid JWT structure"""
        event = {'requestContext': {}}
        
        with pytest.raises(ValueError, match="Invalid JWT structure"):
            extract_user_context(event)


class TestQueryAgentLogs:
    """Test query_agent_logs function"""
    
    def test_query_agent_logs_24h(self, dynamodb_table):
        """Should return only agent's logs from last 24 hours"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        now = datetime.utcnow()
        time_threshold = (now - timedelta(hours=24)).isoformat() + 'Z'
        
        logs = query_agent_logs('agent-123', time_threshold, 100)
        
        # Should get 2 logs (log-1 and log-2), not log-4 (>24h old)
        assert len(logs) == 2
        assert all(log['agent_id'] == 'agent-123' for log in logs)
    
    def test_query_agent_logs_with_operation_filter(self, dynamodb_table):
        """Should filter by operation when specified"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        now = datetime.utcnow()
        time_threshold = (now - timedelta(hours=24)).isoformat() + 'Z'
        
        logs = query_agent_logs('agent-123', time_threshold, 100, 'CREATE')
        
        # Should get only log-1 (CREATE operation)
        assert len(logs) == 1
        assert logs[0]['crud_operation'] == 'CREATE'
    
    def test_query_different_agent(self, dynamodb_table):
        """Should not return logs from other agents"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        now = datetime.utcnow()
        time_threshold = (now - timedelta(hours=24)).isoformat() + 'Z'
        
        logs = query_agent_logs('agent-999', time_threshold, 100)
        
        # Should get only log-3
        assert len(logs) == 1
        assert logs[0]['agent_id'] == 'agent-999'


class TestQueryAllLogs:
    """Test query_all_logs function"""
    
    def test_query_all_logs_24h(self, dynamodb_table):
        """Should return all logs from last 24 hours"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        now = datetime.utcnow()
        time_threshold = (now - timedelta(hours=24)).isoformat() + 'Z'
        
        logs = query_all_logs(time_threshold, 100)
        
        # Should get 3 logs (log-1, log-2, log-3), not log-4 (>24h old)
        assert len(logs) == 3
    
    def test_query_all_logs_with_operation(self, dynamodb_table):
        """Should use OperationIndex when operation specified"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        now = datetime.utcnow()
        time_threshold = (now - timedelta(hours=24)).isoformat() + 'Z'
        
        logs = query_all_logs(time_threshold, 100, 'UPDATE')
        
        # Should get only log-2 (UPDATE operation within 24h)
        assert len(logs) == 1
        assert logs[0]['crud_operation'] == 'UPDATE'


class TestLambdaHandler:
    """Test lambda_handler function"""
    
    def test_agent_query_success(self, dynamodb_table, api_gateway_event_agent):
        """Should return agent's logs successfully"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        response = lambda_handler(api_gateway_event_agent, None)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert 'logs' in body
        assert 'count' in body
        assert body['count'] == 2  # agent-123 has 2 logs in last 24h
    
    def test_admin_query_success(self, dynamodb_table, api_gateway_event_admin):
        """Should return all logs for admin"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        response = lambda_handler(api_gateway_event_admin, None)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['count'] == 3  # All logs in last 24h
    
    def test_query_with_custom_hours(self, dynamodb_table, api_gateway_event_agent):
        """Should respect custom hours parameter"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        # Query last 1 hour only
        api_gateway_event_agent['queryStringParameters']['hours'] = '1'
        
        response = lambda_handler(api_gateway_event_agent, None)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        # Should only get log-1 (1 hour old)
        assert body['count'] == 1
    
    def test_invalid_role(self, dynamodb_table):
        """Should return 400 for invalid role"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        event = {
            'requestContext': {
                'authorizer': {
                    'jwt': {
                        'claims': {
                            'sub': 'user-123',
                            'custom:role': 'invalid_role'
                        }
                    }
                }
            },
            'queryStringParameters': {}
        }
        
        response = lambda_handler(event, None)
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
    
    def test_missing_jwt_claims(self, dynamodb_table):
        """Should return 400 for missing JWT claims"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        event = {'requestContext': {}}
        
        response = lambda_handler(event, None)
        
        assert response['statusCode'] == 400
    
    def test_no_query_parameters(self, dynamodb_table):
        """Should use default values when no query parameters"""
        import lambda_function
        lambda_function.table = dynamodb_table
        
        event = {
            'requestContext': {
                'authorizer': {
                    'jwt': {
                        'claims': {
                            'sub': 'agent-123',
                            'custom:role': 'agent'
                        }
                    }
                }
            }
            # No queryStringParameters
        }
        
        response = lambda_handler(event, None)
        
        # Should succeed with defaults (24h, 100 limit)
        assert response['statusCode'] == 200


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

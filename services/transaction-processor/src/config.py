import os
import json
import boto3
from dataclasses import dataclass

@dataclass
class Config:
    # SFTP configuration
    SFTP_HOST: str
    SFTP_PORT: int
    SFTP_USERNAME: str
    SFTP_PASSWORD: str
    SFTP_REMOTE_FILE: str
    SFTP_LOCAL_FILE: str

    # Database configuration
    DB_HOST: str
    DB_PORT: int
    DB_USERNAME: str
    DB_PASSWORD: str
    DB_NAME: str

def get_secret(secret_name: str) -> dict:
    """Retrieve secret from AWS Secrets Manager"""
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager'
    )
    
    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
        secret = json.loads(get_secret_value_response['SecretString'])
        return secret
    except Exception as e:
        print(f"Error retrieving secret {secret_name}: {e}")
        raise e

def load_config() -> Config:
    # Get secret names from environment
    rds_secret_name = os.getenv('RDS_SECRET_NAME')
    sftp_secret_name = os.getenv('SFTP_SECRET_NAME')
    
    # Retrieve secrets
    rds_secrets = get_secret(rds_secret_name)
    sftp_secrets = get_secret(sftp_secret_name)
    
    return Config(
        SFTP_HOST=os.getenv('SFTP_HOST'),
        SFTP_PORT=int(os.getenv('SFTP_PORT')),
        SFTP_USERNAME=sftp_secrets['username'],
        SFTP_PASSWORD=sftp_secrets['password'],
        SFTP_REMOTE_FILE=os.getenv('SFTP_REMOTE_FILE'),
        SFTP_LOCAL_FILE=os.getenv('SFTP_LOCAL_FILE'),
        DB_HOST=os.getenv('DB_HOST'),
        DB_PORT=int(os.getenv('DB_PORT')),
        DB_USERNAME=rds_secrets['username'],
        DB_PASSWORD=rds_secrets['password'],
        DB_NAME=rds_secrets['dbname']
    )
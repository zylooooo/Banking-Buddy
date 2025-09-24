import os
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

def load_config() -> Config:
    return Config(
        SFTP_HOST=os.getenv('SFTP_HOST'),
        SFTP_PORT=int(os.getenv('SFTP_PORT')),
        SFTP_USERNAME=os.getenv('SFTP_USERNAME'),
        SFTP_PASSWORD=os.getenv('SFTP_PASSWORD'),
        SFTP_REMOTE_FILE=os.getenv('SFTP_REMOTE_FILE'),
        SFTP_LOCAL_FILE=os.getenv('SFTP_LOCAL_FILE'),
        DB_HOST=os.getenv('DB_HOST'),
        DB_PORT=int(os.getenv('DB_PORT')),
        DB_USERNAME=os.getenv('DB_USERNAME'),
        DB_PASSWORD=os.getenv('DB_PASSWORD'),
        DB_NAME=os.getenv('DB_NAME')
    )
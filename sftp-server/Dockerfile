FROM atmoz/sftp:alpine

# Set working directory
WORKDIR /home/sftpuser

# Create data directory
RUN mkdir -p /home/sftpuser/data

# Set permissions
RUN chmod 755 /home/sftpuser/data

# Expose SFTP port
EXPOSE 22

# Start SFTP server
# For local development, the credentials are:
# username: sftpuser
# password: password123
# user ID: 1001
# group ID: 1001
# working directory: /home/sftpuser
# data directory: /home/sftpuser/data
CMD ["sftpuser:password123:1001:1001:data"]
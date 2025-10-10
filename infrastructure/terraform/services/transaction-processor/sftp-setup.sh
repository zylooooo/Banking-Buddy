#!/bin/bash
set -e  # Exit on any error

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/sftp-setup.log
}

log "Starting SFTP setup..."

# Install required packages
log "Installing packages..."
yum update -y
yum install -y vsftpd awscli jq

# Retrieve SFTP credentials from Secrets Manager
log "Retrieving SFTP credentials from Secrets Manager..."
SFTP_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id ${sftp_secret_name} \
    --query SecretString \
    --output text)

SFTP_USERNAME=$(echo $SFTP_SECRET | jq -r '.username')
SFTP_PASSWORD=$(echo $SFTP_SECRET | jq -r '.password')

# Create SFTP user with proper shell for chrooted SFTP
log "Creating SFTP user..."
useradd -m -s /bin/false $SFTP_USERNAME
echo "$SFTP_USERNAME:$SFTP_PASSWORD" | chpasswd

# Enable password authentication for SFTP
log "Configuring SSH authentication..."
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config

# Create data directory with proper permissions for chrooted SFTP
log "Setting up directories..."
mkdir -p /home/$SFTP_USERNAME/data
chown root:root /home/$SFTP_USERNAME
chmod 755 /home/$SFTP_USERNAME
chown $SFTP_USERNAME:$SFTP_USERNAME /home/$SFTP_USERNAME/data
chmod 755 /home/$SFTP_USERNAME/data

# Configure AWS CLI for S3 access
log "Configuring AWS CLI..."
mkdir -p /home/$SFTP_USERNAME/.aws
cat > /home/$SFTP_USERNAME/.aws/config << EOF
[default]
region = ap-southeast-1
output = json
EOF
chown -R $SFTP_USERNAME:$SFTP_USERNAME /home/$SFTP_USERNAME/.aws

# Create script to sync S3 data
log "Creating S3 sync script..."
cat > /home/$SFTP_USERNAME/sync_from_s3.sh << EOF
#!/bin/bash
set -e
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting S3 sync..." >> /var/log/sftp-setup.log
aws s3 cp s3://${s3_bucket_name}/transaction-processor/transactions.csv /home/$SFTP_USERNAME/data/transactions.csv
chown $SFTP_USERNAME:$SFTP_USERNAME /home/$SFTP_USERNAME/data/transactions.csv
echo "[$(date '+%Y-%m-%d %H:%M:%S')] S3 sync completed" >> /var/log/sftp-setup.log
EOF

chmod +x /home/$SFTP_USERNAME/sync_from_s3.sh
chown $SFTP_USERNAME:$SFTP_USERNAME /home/$SFTP_USERNAME/sync_from_s3.sh

# Configure SFTP - Remove existing entries first to prevent duplicates
log "Configuring SFTP..."
sed -i '/Subsystem sftp/d' /etc/ssh/sshd_config
sed -i "/Match User $SFTP_USERNAME/,+3d" /etc/ssh/sshd_config

# Add clean SFTP configuration
cat >> /etc/ssh/sshd_config << EOF

# SFTP Configuration
Subsystem sftp internal-sftp
Match User $SFTP_USERNAME
    ChrootDirectory /home/$SFTP_USERNAME
    ForceCommand internal-sftp
    PasswordAuthentication yes
EOF

# Test SSH configuration before restarting
log "Testing SSH configuration..."
if ! sshd -t; then
    log "ERROR: SSH configuration test failed"
    exit 1
fi

# Restart SSH service
log "Restarting SSH service..."
systemctl restart sshd
systemctl enable sshd

# Wait for SSH to be ready
sleep 5

# Test SSH service
if ! systemctl is-active --quiet sshd; then
    log "ERROR: SSH service failed to start"
    exit 1
fi

log "SSH service restarted successfully"

# Wait for S3 to be ready (with retry logic)
log "Waiting for S3 to be ready..."
for i in {1..30}; do
    if aws s3 ls s3://${s3_bucket_name}/transaction-processor/transactions.csv >/dev/null 2>&1; then
        log "S3 file found, proceeding with sync..."
        break
    fi
    if [ $i -eq 30 ]; then
        log "WARNING: S3 file not found after 30 attempts, creating empty file"
        touch /home/$SFTP_USERNAME/data/transactions.csv
        chown $SFTP_USERNAME:$SFTP_USERNAME /home/$SFTP_USERNAME/data/transactions.csv
        break
    fi
    log "S3 file not ready, attempt $i/30, waiting 10 seconds..."
    sleep 10
done

# Initial sync from S3
log "Starting initial S3 sync..."
/home/$SFTP_USERNAME/sync_from_s3.sh

log "SFTP setup completed successfully"

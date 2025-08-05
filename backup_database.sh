#!/bin/bash

# MrkTahsilatWeb Veritabanı Backup Script
# Bu script günlük, haftalık ve aylık backuplar oluşturur

set -e

# Configuration
DB_SERVER="localhost"
DB_USER="sa"
DB_PASSWORD="MrkTahsilat2024!"
DB_NAME="MrkTahsilatDB"
BACKUP_DIR="/home/$USER/backups/database"
LOG_FILE="/var/log/backup.log"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Backup function
create_backup() {
    local backup_type=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/${backup_type}_${DB_NAME}_${timestamp}.bak"
    
    log "Creating $backup_type backup: $backup_file"
    
    # Create SQL Server backup
    sqlcmd -S $DB_SERVER -U $DB_USER -P $DB_PASSWORD -Q \
        "BACKUP DATABASE [$DB_NAME] TO DISK = '$backup_file' WITH FORMAT, INIT, COMPRESSION"
    
    if [ $? -eq 0 ]; then
        log "Backup created successfully: $backup_file"
        
        # Compress backup
        gzip "$backup_file"
        log "Backup compressed: ${backup_file}.gz"
        
        return 0
    else
        log "ERROR: Backup failed"
        return 1
    fi
}

# Cleanup old backups
cleanup_backups() {
    local backup_type=$1
    local keep_days=$2
    
    log "Cleaning up old $backup_type backups (keeping last $keep_days days)"
    
    find $BACKUP_DIR -name "${backup_type}_*.bak.gz" -mtime +$keep_days -delete
    
    local deleted_count=$(find $BACKUP_DIR -name "${backup_type}_*.bak.gz" -mtime +$keep_days | wc -l)
    log "Deleted $deleted_count old $backup_type backups"
}

# Database health check
db_health_check() {
    log "Performing database health check"
    
    # Check if SQL Server is running
    if ! systemctl is-active --quiet mssql-server; then
        log "ERROR: SQL Server is not running"
        return 1
    fi
    
    # Test database connection
    if sqlcmd -S $DB_SERVER -U $DB_USER -P $DB_PASSWORD -Q "SELECT 1" >/dev/null 2>&1; then
        log "Database connection successful"
        return 0
    else
        log "ERROR: Cannot connect to database"
        return 1
    fi
}

# Send notification (customize as needed)
send_notification() {
    local status=$1
    local message=$2
    
    # Example: Send to Slack, Discord, or email
    # curl -X POST -H 'Content-type: application/json' \
    #   --data '{"text":"MrkTahsilatWeb DB Backup: '$status' - '$message'"}' \
    #   YOUR_WEBHOOK_URL
    
    log "Notification sent: $status - $message"
}

# Main backup logic
main() {
    local backup_type=${1:-daily}
    
    log "Starting $backup_type backup process"
    
    # Health check first
    if ! db_health_check; then
        send_notification "FAILED" "Database health check failed"
        exit 1
    fi
    
    # Create backup
    if create_backup $backup_type; then
        # Cleanup old backups based on type
        case $backup_type in
            "daily")
                cleanup_backups "daily" 7
                ;;
            "weekly")
                cleanup_backups "weekly" 30
                ;;
            "monthly")
                cleanup_backups "monthly" 365
                ;;
        esac
        
        send_notification "SUCCESS" "$backup_type backup completed"
        log "$backup_type backup process completed successfully"
    else
        send_notification "FAILED" "$backup_type backup failed"
        log "ERROR: $backup_type backup process failed"
        exit 1
    fi
}

# Restore function
restore_backup() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        echo "Usage: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log "ERROR: Backup file not found: $backup_file"
        exit 1
    fi
    
    log "Starting restore from: $backup_file"
    
    # If compressed, decompress first
    if [[ $backup_file == *.gz ]]; then
        log "Decompressing backup file"
        gunzip "$backup_file"
        backup_file="${backup_file%.gz}"
    fi
    
    # Restore database
    sqlcmd -S $DB_SERVER -U $DB_USER -P $DB_PASSWORD -Q \
        "RESTORE DATABASE [$DB_NAME] FROM DISK = '$backup_file' WITH REPLACE"
    
    if [ $? -eq 0 ]; then
        log "Database restored successfully from: $backup_file"
        send_notification "SUCCESS" "Database restored from backup"
    else
        log "ERROR: Database restore failed"
        send_notification "FAILED" "Database restore failed"
        exit 1
    fi
}

# List available backups
list_backups() {
    echo "Available backups in $BACKUP_DIR:"
    ls -lah $BACKUP_DIR/*.bak.gz 2>/dev/null | awk '{print $9, $5, $6, $7, $8}' || echo "No backups found"
}

# Handle command line arguments
case "$1" in
    "daily"|"weekly"|"monthly")
        main $1
        ;;
    "restore")
        restore_backup $2
        ;;
    "list")
        list_backups
        ;;
    "health")
        db_health_check
        ;;
    *)
        echo "Usage: $0 {daily|weekly|monthly|restore <file>|list|health}"
        echo ""
        echo "Commands:"
        echo "  daily   - Create daily backup"
        echo "  weekly  - Create weekly backup"
        echo "  monthly - Create monthly backup"
        echo "  restore - Restore from backup file"
        echo "  list    - List available backups"
        echo "  health  - Check database health"
        exit 1
        ;;
esac

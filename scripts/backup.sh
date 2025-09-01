#!/bin/bash

# P&ID Smart Digitizer - Database Backup Script
# This script creates backups of the SQLite database and manages retention

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DATA_DIR="${DATA_DIR:-/data}"
DB_FILE="app.db"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup-${TIMESTAMP}.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to create backup
create_backup() {
    log "Starting database backup..."
    
    if [ ! -f "$DATA_DIR/$DB_FILE" ]; then
        log "ERROR: Database file not found at $DATA_DIR/$DB_FILE"
        exit 1
    fi
    
    # Create backup using SQLite backup command
    sqlite3 "$DATA_DIR/$DB_FILE" ".backup $BACKUP_DIR/$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        log "Backup created successfully: $BACKUP_FILE"
        
        # Get backup file size
        BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
        log "Backup size: $BACKUP_SIZE"
    else
        log "ERROR: Backup failed"
        exit 1
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    DELETED_COUNT=$(find "$BACKUP_DIR" -name "backup-*.db" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    
    if [ "$DELETED_COUNT" -gt 0 ]; then
        log "Deleted $DELETED_COUNT old backup(s)"
    else
        log "No old backups to clean up"
    fi
}

# Function to verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."
    
    # Test if backup can be opened and contains expected tables
    TABLES=$(sqlite3 "$BACKUP_DIR/$BACKUP_FILE" ".tables" | tr '\n' ' ')
    
    if echo "$TABLES" | grep -q "users\|projects\|file_uploads"; then
        log "Backup verification successful. Tables found: $TABLES"
    else
        log "WARNING: Backup verification failed. Expected tables not found."
        exit 1
    fi
}

# Function to create backup summary
create_summary() {
    log "Creating backup summary..."
    
    SUMMARY_FILE="$BACKUP_DIR/backup-summary-${TIMESTAMP}.txt"
    
    {
        echo "P&ID Smart Digitizer Backup Summary"
        echo "==================================="
        echo "Backup Date: $(date)"
        echo "Backup File: $BACKUP_FILE"
        echo "Backup Size: $(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)"
        echo ""
        echo "Database Statistics:"
        sqlite3 "$BACKUP_DIR/$BACKUP_FILE" "
        SELECT 'Users: ' || COUNT(*) FROM users;
        SELECT 'Projects: ' || COUNT(*) FROM projects;
        SELECT 'File Uploads: ' || COUNT(*) FROM file_uploads;
        SELECT 'User Settings: ' || COUNT(*) FROM user_settings;
        SELECT 'Shared Settings: ' || COUNT(*) FROM shared_settings;
        SELECT 'Audit Logs: ' || COUNT(*) FROM audit_logs;
        "
        echo ""
        echo "Backup Files in Directory:"
        ls -lah "$BACKUP_DIR"/backup-*.db
    } > "$SUMMARY_FILE"
    
    log "Backup summary created: backup-summary-${TIMESTAMP}.txt"
}

# Main execution
main() {
    log "Starting P&ID Smart Digitizer backup process..."
    
    create_backup
    verify_backup
    cleanup_old_backups
    create_summary
    
    log "Backup process completed successfully"
}

# Run main function
main "$@"
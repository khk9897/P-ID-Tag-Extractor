#!/bin/bash

# P&ID Smart Digitizer - Health Check Script
# This script monitors the health of all services

set -e

# Configuration
SERVER_URL=${SERVER_URL:-"http://localhost:3000"}
CLIENT_URL=${CLIENT_URL:-"http://localhost:80"}
LOG_FILE=${LOG_FILE:-"/tmp/health-check.log"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Log to file
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    # Log to console with colors
    case $level in
        "ERROR")
            echo -e "${RED}[$timestamp] [ERROR] $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[$timestamp] [SUCCESS] $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}[$timestamp] [WARNING] $message${NC}"
            ;;
        *)
            echo "[$timestamp] [$level] $message"
            ;;
    esac
}

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local service_name=$2
    local expected_status=${3:-200}
    
    log "INFO" "Checking $service_name at $url"
    
    # Use curl with timeout
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        log "SUCCESS" "$service_name is healthy (HTTP $response)"
        return 0
    else
        log "ERROR" "$service_name is unhealthy (HTTP $response)"
        return 1
    fi
}

# Function to check database
check_database() {
    local db_path=${1:-"/app/data/app.db"}
    
    if [ ! -f "$db_path" ]; then
        log "ERROR" "Database file not found at $db_path"
        return 1
    fi
    
    # Try to query the database
    if sqlite3 "$db_path" "SELECT COUNT(*) FROM users;" >/dev/null 2>&1; then
        local user_count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM users;")
        log "SUCCESS" "Database is accessible ($user_count users)"
        return 0
    else
        log "ERROR" "Database is not accessible or corrupted"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    local data_dir=${1:-"/app/data"}
    local uploads_dir=${2:-"/app/uploads"}
    local threshold=${3:-80}  # Warning threshold in percentage
    
    for dir in "$data_dir" "$uploads_dir"; do
        if [ -d "$dir" ]; then
            usage=$(df "$dir" | awk 'NR==2 {print $5}' | sed 's/%//')
            
            if [ "$usage" -ge "$threshold" ]; then
                log "WARNING" "Disk usage high in $dir: ${usage}%"
            else
                log "SUCCESS" "Disk usage OK in $dir: ${usage}%"
            fi
        else
            log "WARNING" "Directory not found: $dir"
        fi
    done
}

# Function to check container health (if running in Docker)
check_container_health() {
    if command -v docker >/dev/null 2>&1; then
        log "INFO" "Checking Docker container health..."
        
        for container in "pid-digitizer-server" "pid-digitizer-client"; do
            if docker ps --filter "name=$container" --filter "status=running" --quiet | grep -q .; then
                health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
                case $health in
                    "healthy")
                        log "SUCCESS" "Container $container is healthy"
                        ;;
                    "unhealthy")
                        log "ERROR" "Container $container is unhealthy"
                        ;;
                    "starting")
                        log "WARNING" "Container $container is starting"
                        ;;
                    *)
                        log "WARNING" "Container $container health status: $health"
                        ;;
                esac
            else
                log "ERROR" "Container $container is not running"
            fi
        done
    fi
}

# Function to generate summary report
generate_summary() {
    local total_checks=$1
    local failed_checks=$2
    local warnings=$3
    
    echo ""
    echo "================================"
    echo "Health Check Summary"
    echo "================================"
    echo "Total Checks: $total_checks"
    echo "Failed Checks: $failed_checks"
    echo "Warnings: $warnings"
    echo "Success Rate: $(( (total_checks - failed_checks) * 100 / total_checks ))%"
    echo "Timestamp: $(date)"
    echo "Log File: $LOG_FILE"
    echo "================================"
}

# Main health check function
main() {
    log "INFO" "Starting P&ID Smart Digitizer health check..."
    
    local total_checks=0
    local failed_checks=0
    local warnings=0
    
    # Check server health endpoint
    total_checks=$((total_checks + 1))
    if ! check_http "$SERVER_URL/health" "Server"; then
        failed_checks=$((failed_checks + 1))
    fi
    
    # Check client health endpoint
    total_checks=$((total_checks + 1))
    if ! check_http "$CLIENT_URL/health" "Client"; then
        failed_checks=$((failed_checks + 1))
    fi
    
    # Check server API endpoint
    total_checks=$((total_checks + 1))
    if ! check_http "$SERVER_URL/api/test" "Server API"; then
        failed_checks=$((failed_checks + 1))
    fi
    
    # Check database (if accessible)
    if [ -f "/app/data/app.db" ]; then
        total_checks=$((total_checks + 1))
        if ! check_database "/app/data/app.db"; then
            failed_checks=$((failed_checks + 1))
        fi
    fi
    
    # Check disk space
    check_disk_space "/app/data" "/app/uploads" 80
    
    # Check Docker containers
    check_container_health
    
    # Generate summary
    generate_summary $total_checks $failed_checks $warnings
    
    # Exit with appropriate code
    if [ $failed_checks -gt 0 ]; then
        log "ERROR" "Health check completed with $failed_checks failures"
        exit 1
    else
        log "SUCCESS" "All health checks passed"
        exit 0
    fi
}

# Handle command line arguments
case ${1:-check} in
    "check")
        main
        ;;
    "server-only")
        check_http "$SERVER_URL/health" "Server"
        ;;
    "client-only")
        check_http "$CLIENT_URL/health" "Client"
        ;;
    "database-only")
        check_database "/app/data/app.db"
        ;;
    *)
        echo "Usage: $0 [check|server-only|client-only|database-only]"
        exit 1
        ;;
esac
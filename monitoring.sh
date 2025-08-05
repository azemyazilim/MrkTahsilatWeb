#!/bin/bash

# MrkTahsilatWeb Sistem Monitoring Script
# Bu script sistem durumunu kontrol eder ve sorun durumunda alarm verir

set -e

# Configuration
PROJECT_DIR="/var/www/mrktahsilat"
LOG_FILE="/var/log/monitoring.log"
ALERT_EMAIL="admin@yourdomain.com"
WEBHOOK_URL=""  # Slack/Discord webhook URL

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=80
DISK_THRESHOLD=85
LOAD_THRESHOLD=4.0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

alert() {
    echo -e "${RED}ALERT: $1${NC}" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}WARNING: $1${NC}" | tee -a $LOG_FILE
}

success() {
    echo -e "${GREEN}OK: $1${NC}" | tee -a $LOG_FILE
}

# Send notification
send_alert() {
    local message="$1"
    local severity="$2"
    
    # Send to webhook if configured
    if [ ! -z "$WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"🚨 MrkTahsilatWeb Alert ['$severity']: '$message'"}' \
            "$WEBHOOK_URL" 2>/dev/null || true
    fi
    
    # Send email if configured
    if [ ! -z "$ALERT_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "MrkTahsilatWeb Alert [$severity]" "$ALERT_EMAIL" 2>/dev/null || true
    fi
    
    log "Alert sent: $message"
}

# Check system resources
check_system_resources() {
    log "Checking system resources..."
    
    # CPU Usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    cpu_usage=${cpu_usage%.*}  # Remove decimal part
    
    if [ "$cpu_usage" -gt "$CPU_THRESHOLD" ]; then
        alert "High CPU usage: ${cpu_usage}%"
        send_alert "CPU usage is ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)" "HIGH"
    else
        success "CPU usage: ${cpu_usage}%"
    fi
    
    # Memory Usage
    memory_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
    
    if [ "$memory_usage" -gt "$MEMORY_THRESHOLD" ]; then
        alert "High memory usage: ${memory_usage}%"
        send_alert "Memory usage is ${memory_usage}% (threshold: ${MEMORY_THRESHOLD}%)" "HIGH"
    else
        success "Memory usage: ${memory_usage}%"
    fi
    
    # Disk Usage
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt "$DISK_THRESHOLD" ]; then
        alert "High disk usage: ${disk_usage}%"
        send_alert "Disk usage is ${disk_usage}% (threshold: ${DISK_THRESHOLD}%)" "HIGH"
    else
        success "Disk usage: ${disk_usage}%"
    fi
    
    # Load Average
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    if (( $(echo "$load_avg > $LOAD_THRESHOLD" | bc -l) )); then
        alert "High load average: $load_avg"
        send_alert "Load average is $load_avg (threshold: $LOAD_THRESHOLD)" "MEDIUM"
    else
        success "Load average: $load_avg"
    fi
}

# Check application services
check_services() {
    log "Checking application services..."
    
    # Check Nginx
    if systemctl is-active --quiet nginx; then
        success "Nginx is running"
    else
        alert "Nginx is not running"
        send_alert "Nginx service is down" "CRITICAL"
    fi
    
    # Check SQL Server
    if systemctl is-active --quiet mssql-server; then
        success "SQL Server is running"
    else
        alert "SQL Server is not running"
        send_alert "SQL Server service is down" "CRITICAL"
    fi
    
    # Check PM2 process
    if pm2 list | grep -q "mrktahsilatweb-backend.*online"; then
        success "Backend application is running"
    else
        alert "Backend application is not running"
        send_alert "Backend application is down" "CRITICAL"
        
        # Try to restart
        log "Attempting to restart backend application"
        pm2 restart mrktahsilatweb-backend
        sleep 5
        
        if pm2 list | grep -q "mrktahsilatweb-backend.*online"; then
            success "Backend application restarted successfully"
            send_alert "Backend application was restarted automatically" "INFO"
        else
            alert "Failed to restart backend application"
            send_alert "Failed to restart backend application - manual intervention required" "CRITICAL"
        fi
    fi
}

# Check application health
check_application_health() {
    log "Checking application health..."
    
    # Check backend API
    if curl -f -s http://localhost:5000/api/health >/dev/null 2>&1; then
        success "Backend API is responding"
    else
        warning "Backend API health check failed"
        # Try alternative endpoint
        if curl -f -s http://localhost:5000/ >/dev/null 2>&1; then
            warning "Backend is responding but health endpoint may be missing"
        else
            alert "Backend API is not responding"
            send_alert "Backend API is not responding to requests" "CRITICAL"
        fi
    fi
    
    # Check frontend
    if curl -f -s http://localhost/ >/dev/null 2>&1; then
        success "Frontend is accessible"
    else
        alert "Frontend is not accessible"
        send_alert "Frontend is not accessible" "HIGH"
    fi
    
    # Check database connectivity
    if sqlcmd -S localhost -U sa -P 'MrkTahsilat2024!' -Q "SELECT 1" >/dev/null 2>&1; then
        success "Database connection is working"
    else
        alert "Database connection failed"
        send_alert "Cannot connect to database" "CRITICAL"
    fi
}

# Check logs for errors
check_logs() {
    log "Checking application logs for errors..."
    
    # Check PM2 logs for errors in last 10 minutes
    error_count=$(pm2 logs mrktahsilatweb-backend --lines 100 --raw | \
                  awk -v since="$(date -d '10 minutes ago' '+%Y-%m-%d %H:%M:%S')" \
                  '$0 >= since' | grep -i "error\|exception\|fatal" | wc -l)
    
    if [ "$error_count" -gt 5 ]; then
        warning "Found $error_count errors in application logs (last 10 minutes)"
        send_alert "High error count in application logs: $error_count errors" "MEDIUM"
    else
        success "Application logs look healthy ($error_count errors)"
    fi
    
    # Check Nginx error logs
    nginx_errors=$(tail -100 /var/log/nginx/error.log | grep "$(date '+%Y/%m/%d')" | wc -l)
    
    if [ "$nginx_errors" -gt 10 ]; then
        warning "Found $nginx_errors errors in Nginx logs today"
        send_alert "High error count in Nginx logs: $nginx_errors errors today" "MEDIUM"
    else
        success "Nginx logs look healthy ($nginx_errors errors today)"
    fi
}

# Check SSL certificate expiry
check_ssl_certificate() {
    local domain="mrktahsilat.com"
    
    if [ ! -z "$domain" ] && [ "$domain" != "mrktahsilat.com" ]; then
        log "Checking SSL certificate for $domain..."
        
        expiry_date=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | \
                     openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
        
        if [ ! -z "$expiry_date" ]; then
            expiry_timestamp=$(date -d "$expiry_date" +%s)
            current_timestamp=$(date +%s)
            days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
            
            if [ "$days_until_expiry" -lt 30 ]; then
                warning "SSL certificate expires in $days_until_expiry days"
                send_alert "SSL certificate expires in $days_until_expiry days" "MEDIUM"
            else
                success "SSL certificate is valid ($days_until_expiry days remaining)"
            fi
        else
            warning "Could not check SSL certificate"
        fi
    fi
}

# Generate summary report
generate_summary() {
    log "=== Monitoring Summary ==="
    
    # System uptime
    uptime_info=$(uptime -p)
    log "System uptime: $uptime_info"
    
    # Application uptime
    app_uptime=$(pm2 show mrktahsilatweb-backend | grep "uptime" | awk '{print $4}')
    log "Application uptime: $app_uptime"
    
    # Active connections
    active_connections=$(netstat -an | grep :80 | grep ESTABLISHED | wc -l)
    log "Active HTTP connections: $active_connections"
    
    # Database connections
    # db_connections=$(sqlcmd -S localhost -U sa -P 'YourStrongPassword123!' -Q "SELECT COUNT(*) FROM sys.dm_exec_sessions WHERE is_user_process = 1" -h -1 2>/dev/null | tr -d ' ' || echo "N/A")
    # log "Active database connections: $db_connections"
    
    log "=== End of Summary ==="
}

# Main monitoring function
main() {
    log "Starting monitoring check..."
    
    check_system_resources
    check_services
    check_application_health
    check_logs
    check_ssl_certificate
    generate_summary
    
    log "Monitoring check completed"
}

# Handle different monitoring modes
case "${1:-full}" in
    "resources")
        check_system_resources
        ;;
    "services")
        check_services
        ;;
    "health")
        check_application_health
        ;;
    "logs")
        check_logs
        ;;
    "ssl")
        check_ssl_certificate
        ;;
    "summary")
        generate_summary
        ;;
    "full")
        main
        ;;
    *)
        echo "Usage: $0 {resources|services|health|logs|ssl|summary|full}"
        echo ""
        echo "Monitoring modes:"
        echo "  resources - Check CPU, memory, disk usage"
        echo "  services  - Check system services"
        echo "  health    - Check application health"
        echo "  logs      - Check logs for errors"
        echo "  ssl       - Check SSL certificate"
        echo "  summary   - Generate summary report"
        echo "  full      - Run all checks (default)"
        exit 1
        ;;
esac

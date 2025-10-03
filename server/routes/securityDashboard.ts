import { Router, Request, Response } from 'express';
import { securityLogger } from '../services/securityLogger';
import { jwtAuth, requireRole } from '../middleware/jwtAuth';
import { AppError, asyncHandler, sendSuccess } from '../middleware/errorHandler';
import { logDataAccess } from '../middleware/securityMonitoring';

const router = Router();

/**
 * GET /api/security-dashboard
 * Serve a simple HTML dashboard for security monitoring (admin only)
 */
router.get('/',
  jwtAuth,
  requireRole(['admin', 'enterprise']),
  logDataAccess('security_dashboard_view', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    // Get security metrics for the last 24 hours
    const metrics = await securityLogger.getSecurityMetrics(24);
    const recentAlerts = await securityLogger.getSecurityAlerts({ limit: 10, status: 'open' });
    const recentEvents = await securityLogger.getSecurityEvents({ 
      limit: 20, 
      success: false,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
    });

    // Generate a simple HTML dashboard
    const dashboardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Monitoring Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        .metric-label {
            color: #666;
            margin-top: 5px;
        }
        .alert-high { color: #dc3545; }
        .alert-medium { color: #fd7e14; }
        .alert-low { color: #28a745; }
        .section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            margin-top: 0;
            color: #333;
        }
        .event-list {
            max-height: 400px;
            overflow-y: auto;
        }
        .event-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .event-item:last-child {
            border-bottom: none;
        }
        .event-type {
            font-weight: bold;
            color: #495057;
        }
        .event-time {
            color: #6c757d;
            font-size: 0.9em;
        }
        .refresh-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .refresh-btn:hover {
            background: #0056b3;
        }
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-success { background-color: #28a745; }
        .status-warning { background-color: #ffc107; }
        .status-error { background-color: #dc3545; }
        .top-ips {
            display: grid;
            gap: 10px;
        }
        .ip-item {
            display: flex;
            justify-content: space-between;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Security Monitoring Dashboard</h1>
            <p>Real-time security monitoring and threat detection</p>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${metrics.totalEvents}</div>
                <div class="metric-label">Total Events (24h)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value alert-${metrics.failedLogins > 10 ? 'high' : metrics.failedLogins > 5 ? 'medium' : 'low'}">${metrics.failedLogins}</div>
                <div class="metric-label">Failed Logins (24h)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value alert-${metrics.suspiciousActivities > 5 ? 'high' : metrics.suspiciousActivities > 2 ? 'medium' : 'low'}">${metrics.suspiciousActivities}</div>
                <div class="metric-label">Suspicious Activities (24h)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value alert-${metrics.activeAlerts > 5 ? 'high' : metrics.activeAlerts > 2 ? 'medium' : 'low'}">${metrics.activeAlerts}</div>
                <div class="metric-label">Active Alerts</div>
            </div>
        </div>

        <div class="section">
            <h2>🚨 Active Security Alerts</h2>
            <div class="event-list">
                ${recentAlerts.length === 0 ? '<p>No active alerts</p>' : recentAlerts.map(alert => `
                    <div class="event-item">
                        <div>
                            <span class="status-indicator status-${alert.severity === 'critical' || alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'success'}"></span>
                            <span class="event-type">${alert.alertType}</span>
                            <div style="margin-top: 4px; color: #666; font-size: 0.9em;">${alert.description}</div>
                        </div>
                        <div class="event-time">${new Date(alert.timestamp).toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>⚠️ Recent Security Failures</h2>
            <div class="event-list">
                ${recentEvents.length === 0 ? '<p>No recent failures</p>' : recentEvents.map(event => `
                    <div class="event-item">
                        <div>
                            <span class="status-indicator status-error"></span>
                            <span class="event-type">${event.eventType}</span>
                            <div style="margin-top: 4px; color: #666; font-size: 0.9em;">${event.action} - ${event.ipAddress ?? 'Unknown IP'}</div>
                        </div>
                        <div class="event-time">${new Date(event.timestamp).toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>🌐 Top Failed IPs (24h)</h2>
            <div class="top-ips">
                ${metrics.topFailedIPs.length === 0 ? '<p>No failed attempts from specific IPs</p>' : metrics.topFailedIPs.map(ip => `
                    <div class="ip-item">
                        <span>${ip.ipAddress}</span>
                        <span class="alert-${ip.count > 10 ? 'high' : ip.count > 5 ? 'medium' : 'low'}">${ip.count} failures</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>📊 Event Types (24h)</h2>
            <div class="top-ips">
                ${metrics.eventsByType.map(event => `
                    <div class="ip-item">
                        <span>${event.eventType}</span>
                        <span>${event.count} events</span>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>

    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
            location.reload();
        }, 30000);
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(dashboardHtml);
  })
);

export default router;
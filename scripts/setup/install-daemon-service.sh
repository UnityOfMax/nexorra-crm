#!/bin/bash
# Run this once to install the nexorra-daemon systemd service
# Usage: sudo bash scripts/setup/install-daemon-service.sh

cat > /etc/systemd/system/nexorra-daemon.service << 'EOF'
[Unit]
Description=Nexorra Agent Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=max
WorkingDirectory=/home/max/crm
EnvironmentFile=/home/max/crm/.env.local
ExecStart=/usr/bin/npx tsx scripts/daemon/server.ts
Restart=always
RestartSec=15
StandardOutput=append:/home/max/crm/logs/daemon.log
StandardError=append:/home/max/crm/logs/daemon.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nexorra-daemon.service
systemctl start nexorra-daemon.service
systemctl status nexorra-daemon.service

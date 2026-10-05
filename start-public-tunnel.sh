#!/bin/bash

echo "🌐 Starting ZENITH Public HTTPS Tunnel..."
echo "Connecting to Pinggy Tunnel for http://localhost:3000..."
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:3000 a.pinggy.io

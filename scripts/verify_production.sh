#!/bin/bash

# Configuration
FRONTEND_URL="https://frontend-self-chi-89.vercel.app/"
BACKEND_URL="https://maritime-backend-tzzy.onrender.com/"
STATUS_ENDPOINT="${BACKEND_URL}/api/status"

echo "🔍 Starting Production Verification..."
echo "----------------------------------------"

# 1. Check Backend Health
echo -n "Checking Backend Status Endpoint... "
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STATUS_ENDPOINT")

if [ "$HTTP_STATUS" == "200" ]; then
  echo "✅ OK (200)"
  
  # Check JSON content
  RESPONSE=$(curl -s "$STATUS_ENDPOINT")
  echo "   Response: $RESPONSE"
  
  # Check component status
  AIS_STATUS=$(echo "$RESPONSE" | grep -o '"aisStream":"[^"]*"' | cut -d'"' -f4)
  DB_STATUS=$(echo "$RESPONSE" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
  
  if [ "$AIS_STATUS" == "ONLINE" ]; then
    echo "   ✅ AIS Stream: ONLINE"
  else
    echo "   ⚠️ AIS Stream: $AIS_STATUS (Check API Key)"
  fi
  
  if [ "$DB_STATUS" == "ONLINE" ]; then
    echo "   ✅ Database: ONLINE"
  else
    echo "   ❌ Database: $DB_STATUS"
  fi

else
  echo "❌ FAILED ($HTTP_STATUS)"
  echo "   URL: $STATUS_ENDPOINT"
fi

echo "----------------------------------------"

# 2. Check Frontend Availability
echo -n "Checking Frontend Availability... "
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")

if [ "$FRONTEND_STATUS" == "200" ]; then
  echo "✅ OK (200)"
else
  echo "❌ FAILED ($FRONTEND_STATUS)"
fi

echo "----------------------------------------"
echo "Verification Complete."

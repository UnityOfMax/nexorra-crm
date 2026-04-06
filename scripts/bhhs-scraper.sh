#!/bin/bash

CITY="Colorado Springs"
STATE="CO"
COUNTRY="USA"
TIMEZONE="MST"

# Base URL for BHHS Solr API
BASE_URL="https://www.bhhs.com/bin/bhhs/solrAgentSearchServlet"

# Function to title case a name
title_case() {
  local str="$1"
  echo "$str" | sed 's/\b\(.\)/\u\1/g'
}

# Function to check if name is valid
is_valid_name() {
  local name="$1"
  
  # Skip if contains skip patterns
  if [[ "$name" =~ LLC || "$name" =~ Inc || "$name" =~ Corp || "$name" =~ Group || "$name" =~ Team || "$name" =~ Realty ]]; then
    return 1
  fi
  
  # Skip if contains pipe, parentheses, quotes, ampersand
  if echo "$name" | grep -qE '[\|()\"&]'; then
    return 1
  fi
  
  # Skip if less than 2 words
  local word_count=$(echo "$name" | wc -w)
  if [ "$word_count" -lt 2 ]; then
    return 1
  fi
  
  return 0
}

# Initialize
PAGE=1
TOTAL_INSERTED=0

echo "[BHHS] Scraping $CITY, $STATE via Solr API..."

while [ $PAGE -le 10 ]; do
  echo "[BHHS] Fetching page $PAGE..."
  
  # Call BHHS Solr API (URL-encoded parameters)
  QUERY_CITY=$(echo -n "$CITY" | jq -sRr @uri)
  QUERY_STATE=$(echo -n "$STATE" | jq -sRr @uri)
  QUERY_COUNTRY=$(echo -n "$COUNTRY" | jq -sRr @uri)
  
  FULL_QUERY="${QUERY_CITY}%2C%2B${QUERY_STATE}%2C%2B${QUERY_COUNTRY}"
  
  RESPONSE=$(curl -s "${BASE_URL}?city=${FULL_QUERY}&resultSize=50&sortType=3&page=${PAGE}&geo_sort_param_name=city&geo_sort_param_value=${FULL_QUERY}")
  
  # Check if response is valid JSON
  if ! echo "$RESPONSE" | jq . > /dev/null 2>&1; then
    echo "[BHHS] Invalid JSON response on page $PAGE"
    break
  fi
  
  # Extract agents from response
  AGENT_COUNT=$(echo "$RESPONSE" | jq '.value | length // 0')
  
  if [ "$AGENT_COUNT" -eq 0 ]; then
    echo "[BHHS] Page $PAGE returned 0 agents, stopping."
    break
  fi
  
  echo "[BHHS] Found $AGENT_COUNT agents on page $PAGE"
  
  # Process each agent
  for i in $(seq 0 $((AGENT_COUNT - 1))); do
    AGENT=$(echo "$RESPONSE" | jq ".value[$i]")
    
    # Extract fields
    FULL_NAME=$(echo "$AGENT" | jq -r '.MemberFullName // empty')
    EMAIL=$(echo "$AGENT" | jq -r '.MemberEmail // empty')
    
    # Skip if no email
    if [ -z "$EMAIL" ] || [ "$EMAIL" == "null" ]; then
      continue
    fi
    
    # Skip if invalid name
    if ! is_valid_name "$FULL_NAME"; then
      continue
    fi
    
    # Extract first/last name
    FIRST_NAME=$(echo "$FULL_NAME" | awk '{print $1}')
    LAST_NAME=$(echo "$FULL_NAME" | awk '{$1=""; print substr($0, 2)}')
    
    # Title case
    FULL_NAME=$(title_case "$FULL_NAME")
    FIRST_NAME=$(title_case "$FIRST_NAME")
    LAST_NAME=$(title_case "$LAST_NAME")
    
    # Other fields
    PHONE=$(echo "$AGENT" | jq -r '.MemberMobilePhone // .MemberOfficePhone // empty')
    PROFILE_URL=$(echo "$AGENT" | jq -r '.MemberUrl // empty')
    PICTURE_URL=$(echo "$AGENT" | jq -r '.Photo // empty')
    
    # Convert empty strings to null
    [ -z "$PHONE" ] || [ "$PHONE" == "null" ] && PHONE="null" || PHONE="\"$PHONE\""
    [ -z "$PROFILE_URL" ] || [ "$PROFILE_URL" == "null" ] && PROFILE_URL="null" || PROFILE_URL="\"$PROFILE_URL\""
    [ -z "$PICTURE_URL" ] || [ "$PICTURE_URL" == "null" ] && PICTURE_URL="null" || PICTURE_URL="\"$PICTURE_URL\""
    
    # Build JSON and insert
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/leads" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{\"full_name\":\"$FULL_NAME\",\"first_name\":\"$FIRST_NAME\",\"last_name\":\"$LAST_NAME\",\"email\":\"$EMAIL\",\"phone\":$PHONE,\"profile_url\":$PROFILE_URL,\"profile_picture_url\":$PICTURE_URL,\"source_brokerage\":\"bhhs\",\"country\":\"US\",\"state_province\":\"$STATE\",\"city\":\"$CITY\",\"timezone\":\"$TIMEZONE\"}")
    
    if [ "$HTTP_CODE" == "201" ]; then
      echo "[BHHS] ✓ $FULL_NAME"
      ((TOTAL_INSERTED++))
    elif [ "$HTTP_CODE" == "409" ]; then
      echo "[BHHS] ~ $FULL_NAME (duplicate)"
    else
      echo "[BHHS] ERROR $HTTP_CODE: $FULL_NAME"
    fi
    
    sleep 5
  done
  
  if [ "$TOTAL_INSERTED" -ge 100 ]; then
    echo "[BHHS] Reached 100 leads, stopping."
    break
  fi
  
  PAGE=$((PAGE + 1))
  sleep 8
done

echo "[BHHS] ==== Colorado Springs BHHS: Inserted $TOTAL_INSERTED ===="

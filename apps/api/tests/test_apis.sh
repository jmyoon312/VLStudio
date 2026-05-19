#!/bin/bash
# Test script for new Phase 7-10 APIs

API_BASE="http://localhost:8000"

echo "========================================="
echo "🧪 ViraLoop API Test Suite"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" "$API_BASE$endpoint")
    else
        response=$(curl -s -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$API_BASE$endpoint")
    fi
    
    http_code="${response: -3}"
    body="${response:0:${#response}-3}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
        echo "   Response: $body"
        return 1
    fi
}

# Queue Management
echo "📋 Queue Management"
echo "-----------------------------------"
test_api "Get Queue Status" "GET" "/api/queue/status"
test_api "Get All Queue Items" "GET" "/api/queue"
test_api "Enqueue Video (mock)" "POST" "/api/queue" '{"video_id":"test_001","channel_id":"ch_001","title":"Test Video","video_file_path":"/test.mp4","source":"auto","priority":"normal"}'

# Verification
echo ""
echo "🔍 Processing Verification"
echo "-----------------------------------"
test_api "Get Processing Summary" "GET" "/api/verification/summary"
test_api "Get Missing Items" "GET" "/api/verification/missing?hours=24"
test_api "Get Active Alerts" "GET" "/api/verification/alerts"
test_api "Get SLA Report" "GET" "/api/verification/sla-report?hours=24"

# Dashboard & Reports
echo ""
echo "📊 Dashboard & Reports"
echo "-----------------------------------"
test_api "System Status" "GET" "/api/dashboard/status"
test_api "Quick Stats" "GET" "/api/dashboard/stats"
test_api "Daily Report" "GET" "/api/reports/daily"
test_api "Weekly Report" "GET" "/api/reports/weekly"
test_api "Report List" "GET" "/api/reports?limit=5"

# Metrics
echo ""
echo "📈 Metrics & KPIs"
echo "-----------------------------------"
test_api "Record Metric" "POST" "/api/metrics" '{"name":"test.metric","value":1.0}'
test_api "Get Metric" "GET" "/api/metrics/test.metric?hours=1"
test_api "All KPIs" "GET" "/api/metrics/kpis"
test_api "Dashboard Metrics" "GET" "/api/metrics/dashboard"

# Health & Deployment
echo ""
echo "🏥 Health & Deployment"
echo "-----------------------------------"
test_api "Health Check" "GET" "/api/health"
test_api "Health Summary" "GET" "/api/health/summary"
test_api "Resource Metrics" "GET" "/api/health/resources?hours=1"
test_api "Health Alerts" "GET" "/api/health/alerts"
test_api "Deployment Config" "GET" "/api/deploy/config/production"
test_api "K8s Manifests" "GET" "/api/deploy/manifests/production"

# ML Pipeline
echo ""
echo "🤖 ML Pipeline"
echo "-----------------------------------"
test_api "List Models" "GET" "/api/ml/models"
test_api "Train Model (mock)" "POST" "/api/ml/train" '{"name":"test_classifier","model_type":"classifier","features":["views","engagement"],"labels":["viral","not_viral"]}'
test_api "Get KPIs" "GET" "/api/metrics/kpis"

# A/B Testing
echo ""
echo "🔬 A/B Testing"
echo "-----------------------------------"
test_api "List Experiments" "GET" "/api/experiments"

# Search
echo ""
echo "🔍 Search Engine"
echo "-----------------------------------"
test_api "Index Content" "POST" "/api/search/index" '{"doc_id":"test_001","document":{"title":"Test Video","content":"About travel"}}'
test_api "Search" "GET" "/api/search?query=travel&limit=5"
test_api "Autocomplete" "GET" "/api/search/autocomplete?prefix=tra"

# Recommendations
echo ""
echo "🎯 Recommendations"
echo "-----------------------------------"
test_api "Get Recommendations" "GET" "/api/recommendations?user_id=1&niche=travel&limit=5"
test_api "Get Trending" "GET" "/api/recommendations/trending?timeframe=24h&limit=5"
test_api "Popular in Niche" "GET" "/api/recommendations/popular/travel?limit=5"

echo ""
echo "========================================="
echo "✅ API Test Complete"
echo "========================================="
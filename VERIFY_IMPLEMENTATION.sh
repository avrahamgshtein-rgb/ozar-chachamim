#!/bin/bash

echo "════════════════════════════════════════════════════════════════"
echo "  🔍 OZAR CHACHAMIM - AUTOMATED IMPLEMENTATION VERIFICATION"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

checks_passed=0
checks_failed=0

verify_check() {
  local description="$1"
  local file="$2"
  local pattern="$3"
  
  if grep -q "$pattern" "$file"; then
    echo -e "${GREEN}✅ PASS${NC} - $description"
    ((checks_passed++))
  else
    echo -e "${RED}❌ FAIL${NC} - $description"
    ((checks_failed++))
  fi
}

echo -e "${BLUE}PHASE 1: Data Layer Refactoring (Task A)${NC}"
echo "─────────────────────────────────────────────────────────────────"
verify_check "Data layer has defensive FK validation" "supabase-client.js" "validSageIds\.has"
verify_check "Search index includes core_concept" "supabase-client.js" "sage\.core_concept"
verify_check "semanticSearch function exported" "supabase-client.js" "semanticSearch"
verify_check "Global graphData with sageMap" "supabase-client.js" "sageMap.*=.*sageMap"
echo ""

echo -e "${BLUE}PHASE 2: D3 Graph Enhancements (Task B)${NC}"
echo "─────────────────────────────────────────────────────────────────"
verify_check "SVG markers for arrows defined" "graph.js" "marker.*id.*arrow"
verify_check "Curved links using quadratic Bezier" "graph.js" "M.*Q.*"
verify_check "Chronological X-axis force enabled" "graph.js" "forceX.*period_order"
verify_check "Link type colors defined" "graph.js" "student.*4ecdc4"
verify_check "Arrow markers on links" "graph.js" "marker-end.*url"
echo ""

echo -e "${BLUE}PHASE 3: Map Integration (Task C)${NC}"
echo "─────────────────────────────────────────────────────────────────"
verify_check "MapManager object created" "index.html" "const mapManager = {"
verify_check "Marker tracking system" "index.html" "sageMarkers\.set"
verify_check "Migration lines tracked" "index.html" "migrationLines\.push"
verify_check "highlightSearchResults function" "index.html" "highlightSearchResults"
verify_check "zoomToResults function" "index.html" "zoomToResults"
verify_check "Map registered with mapManager" "index.html" "mapManager\.trackMarkers"
echo ""

echo -e "${BLUE}PHASE 4: Semantic Search (Task D)${NC}"
echo "─────────────────────────────────────────────────────────────────"
verify_check "semanticSearch made globally available" "index.html" "window\.semanticSearch = semanticSearch"
verify_check "Search handler uses mapManager" "index.html" "mapManager\.highlightSearchResults"
verify_check "Search handler uses mapManager zoom" "index.html" "mapManager\.zoomToResults"
verify_check "Map reset on clear search" "index.html" "mapManager\.resetView"
verify_check "Search stats display" "index.html" "createSearchStats"
echo ""

echo -e "${BLUE}PHASE 5: Research Integration (Task E)${NC}"
echo "─────────────────────────────────────────────────────────────────"
verify_check "escapeHtml helper function" "graph.js" "function escapeHtml"
verify_check "Research section in sidebar" "graph.js" "TASK E.*Research"
verify_check "Research placed before Spotify" "graph.js" "TASK E: Research.*before"
verify_check "Full-text content display" "graph.js" "content_text.*400"
verify_check "RTL support for research text" "graph.js" "direction: rtl"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo -e "${BLUE}VERIFICATION SUMMARY${NC}"
echo "════════════════════════════════════════════════════════════════"
total=$((checks_passed + checks_failed))
percentage=$((checks_passed * 100 / total))

echo -e "Total Checks: $total"
echo -e "✅ Passed: ${GREEN}$checks_passed${NC}"
echo -e "❌ Failed: ${RED}$checks_failed${NC}"
echo -e "Success Rate: ${YELLOW}${percentage}%${NC}"
echo ""

if [ $checks_failed -eq 0 ]; then
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ✅ ALL IMPLEMENTATIONS VERIFIED SUCCESSFULLY! 🎉${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  exit 0
else
  echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}  ⚠️ SOME CHECKS FAILED - Review implementation${NC}"
  echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
  exit 1
fi

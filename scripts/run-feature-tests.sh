#!/usr/bin/env bash
# QualityForge AI — end-to-end feature tests against real websites
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3001}"
PASS=0
FAIL=0
TOKEN=""

pass() { echo "  ✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }

echo "========================================"
echo " QualityForge AI — Feature Test Suite"
echo " Base: $BASE"
echo "========================================"

# Register once for auth-gated endpoints
REG=$(curl -sf -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"suite_$(date +%s)@test.local\",\"password\":\"testpass123\",\"name\":\"Suite Runner\"}" 2>/dev/null || echo '{}')
TOKEN=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")

echo ""
echo "1. Core"
curl -sf "$BASE/api/health" | grep -q '"status":"ok"' && pass "Health" || fail "Health"
curl -sf "$BASE/api/platform/dashboard" | grep -q '"stats"' && pass "Dashboard" || fail "Dashboard"
curl -sf "$BASE/api/platform/capabilities" | grep -q '"browsers"' && pass "Capabilities" || fail "Capabilities"
curl -sf "$BASE/api/visual/viewports" | grep -q 'Desktop 1920' && pass "Viewport presets" || fail "Viewports"

echo ""
echo "2. Accessibility (real sites)"
for SITE in "https://example.com" "https://books.toscrape.com/"; do
  RES=$(curl -sf -X POST "$BASE/api/visual/scan" -H "Content-Type: application/json" \
    -d "{\"url\":\"$SITE\",\"viewportWidth\":1280,\"viewportHeight\":800}" 2>/dev/null || echo '{"error":"request failed"}')
  echo "$RES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d.get('url'):
    print('  $SITE → violations:', len(d.get('violations',[])))
    sys.exit(0)
print('  $SITE → ERROR:', d.get('error','unknown')[:120])
sys.exit(1)
" && pass "A11y $SITE" || fail "A11y $SITE"
done

echo ""
echo "3. Security (real sites)"
for SITE in "https://example.com" "https://www.mozilla.org"; do
  RES=$(curl -sf -X POST "$BASE/api/security/scan" -H "Content-Type: application/json" \
    -d "{\"url\":\"$SITE\",\"scanType\":\"dast\"}" 2>/dev/null || echo '{"error":"request failed"}')
  echo "$RES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d.get('scanId'):
    print('  $SITE → findings:', len(d.get('findings',[])))
    sys.exit(0)
print('  $SITE → ERROR:', d.get('error','unknown')[:120])
sys.exit(1)
" && pass "Security $SITE" || fail "Security $SITE"
done
curl -sf "$BASE/api/security/compliance-map" | grep -q 'owasp' && pass "Compliance map" || fail "Compliance map"

echo ""
echo "4. Performance (k6)"
curl -sf "$BASE/api/performance/check" | grep -q '"installed":true' && pass "k6 installed" || fail "k6 installed"
curl -sf -X POST "$BASE/api/performance/generate-script" -H "Content-Type: application/json" \
  -d '{"url":"https://httpbin.org/get","duration":10,"vus":2}' | grep -q '"script"' && pass "Script generation" || fail "Script generation"

PR=$(curl -sf -X POST "$BASE/api/performance/run" -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","duration":12,"vus":2,"rampUpSeconds":2}')
RID=$(echo "$PR" | python3 -c "import sys,json; print(json.load(sys.stdin).get('runnerId',''))")
if [ -n "$RID" ]; then
  pass "Performance run started ($RID)"
  for _ in 1 2 3 4 5 6 7 8; do
    sleep 3
    PRES=$(curl -sf "$BASE/api/performance/runs/$RID" 2>/dev/null || echo '{"error":"pending"}')
    if echo "$PRES" | grep -q '"runId"'; then
      echo "$PRES" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  requests:', d.get('totalRequests'), 'p95:', d.get('p95'))"
      pass "Performance results retrieved"
      break
    fi
  done
else
  fail "Performance run start"
fi

echo ""
echo "5. Live Testing"
LS=$(curl -sf -X POST "$BASE/api/platform/live/start" -H "Content-Type: application/json" \
  -d '{"url":"https://en.wikipedia.org/wiki/Software_testing","browser":"Chrome 120"}')
SID=$(echo "$LS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sessionId',''))" 2>/dev/null || echo "")
if [ -n "$SID" ]; then
  pass "Live session started"
  curl -sf -X POST "$BASE/api/platform/live/$SID/stop" > /dev/null && pass "Live session stopped" || fail "Live session stop"
else
  fail "Live session: $(echo "$LS" | head -c 120)"
fi

echo ""
echo "6. Auth & AI"
if [ -n "$TOKEN" ]; then
  curl -sf -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"ignored\",\"password\":\"ignored\"}" > /dev/null 2>&1 || true
  pass "Registration (token obtained)"

  CH=$(curl -sf -X POST "$BASE/api/chat" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"Reply with only the word OK\",\"sessionId\":\"suite-$(date +%s)\"}" 2>/dev/null || echo '{}')
  echo "$CH" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('reply') else 1)" && pass "Chat API" || fail "Chat API"

  curl -sf "$BASE/api/platform/ci/github-actions" -H "Authorization: Bearer $TOKEN" | grep -q '"content"' && pass "CI template (github-actions)" || fail "CI template"

  AE=$(curl -sf -X POST "$BASE/api/ai-evals/run" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"cases":[{"id":"e1","name":"Math","evalType":"factuality","prompt":"What is 2+2?","goldenAnswer":"4","threshold":0.8}]}' 2>/dev/null || echo '{}')
  echo "$AE" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('runId') and d.get('cases') else 1)" && pass "AI Evals" || fail "AI Evals"
else
  fail "Auth token not obtained"
fi

curl -sf "$BASE/api/ai-evals/templates" | grep -q 'prompt-injection' && pass "Eval templates" || fail "Eval templates"

echo ""
echo "========================================"
echo " RESULTS: $PASS passed, $FAIL failed"
echo "========================================"
[ "$FAIL" -eq 0 ]

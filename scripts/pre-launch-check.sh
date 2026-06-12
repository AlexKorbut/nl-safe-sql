#!/bin/bash

# GoogleSaas Pre-Launch Verification Script
# Run this before deploying to ensure all systems are ready

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((CHECKS_WARNING++))
}

check_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}GoogleSaas Pre-Launch Check${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 1. Node.js Version Check
echo -e "${BLUE}1. Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 22 ]; then
        check_pass "Node.js $(node -v) installed"
    else
        check_fail "Node.js $(node -v) detected, but 22+ required"
    fi
else
    check_fail "Node.js not found. Install from https://nodejs.org"
fi
echo ""

# 2. Dependencies Check
echo -e "${BLUE}2. Checking Dependencies...${NC}"
if [ -d "node_modules" ]; then
    check_pass "Dependencies installed"
else
    check_warn "node_modules not found. Run: npm install"
fi
echo ""

# 3. Tests Check
echo -e "${BLUE}3. Running Tests...${NC}"
if npm test > /dev/null 2>&1; then
    check_pass "All tests pass"
else
    check_fail "Tests failed. Run: npm test"
fi
echo ""

# 4. Build Check
echo -e "${BLUE}4. Building for Production...${NC}"
if npm run build > /dev/null 2>&1; then
    check_pass "Production build successful"
else
    check_fail "Build failed. Run: npm run build"
fi
echo ""

# 5. Environment File Check
echo -e "${BLUE}5. Checking Environment Variables...${NC}"

if [ ! -f ".env" ]; then
    check_fail ".env file not found. Run: cp .env.example .env"
else
    check_pass ".env file exists"
fi

# Function to check env var
check_env_var() {
    local var_name=$1
    local var_type=$2  # required, recommended, optional

    if grep -q "^${var_name}=" .env && ! grep -q "^${var_name}=\$" .env && ! grep -q "^${var_name}=$" .env && ! grep -q "^${var_name}=your_" .env; then
        check_pass "${var_name} is set"
        return 0
    else
        case $var_type in
            required)
                check_fail "${var_name} is NOT set (required)"
                return 1
                ;;
            recommended)
                check_warn "${var_name} is NOT set (recommended for full features)"
                return 2
                ;;
            optional)
                check_warn "${var_name} is NOT set (optional)"
                return 2
                ;;
        esac
    fi
}

# Check required variables
check_env_var "PSI_API_KEY" "required"
check_env_var "RESEND_API_KEY" "required"
check_env_var "RESEND_FROM_EMAIL" "required"
check_env_var "NEXTAUTH_SECRET" "required"
check_env_var "DATABASE_PATH" "recommended"

# Check recommended variables
check_env_var "STRIPE_SECRET_KEY" "recommended"
check_env_var "STRIPE_PUBLISHABLE_KEY" "recommended"
check_env_var "STRIPE_WEBHOOK_SECRET" "recommended"

# Check optional variables
check_env_var "OPENAI_API_KEY" "optional"
check_env_var "GOOGLE_CLIENT_ID" "optional"

echo ""

# 6. Environment Variables Content Check
echo -e "${BLUE}6. Validating Environment Variables...${NC}"

# Check if any variables still have placeholder values
if grep -q "your_" .env; then
    check_fail "Some environment variables still have placeholder values (your_...)"
    check_info "Review and update .env with actual credentials"
else
    check_pass "No placeholder values detected"
fi

# Check NODE_ENV
if grep -q "NODE_ENV=production" .env; then
    check_pass "NODE_ENV is set to production"
elif grep -q "NODE_ENV=development" .env; then
    check_warn "NODE_ENV is set to development (change to production before deploying)"
else
    check_warn "NODE_ENV not explicitly set"
fi

# Check ENFORCE_FREE_TIER
if grep -q "ENFORCE_FREE_TIER=false" .env; then
    check_pass "ENFORCE_FREE_TIER is false (paying features enabled)"
elif grep -q "ENFORCE_FREE_TIER=true" .env; then
    check_warn "ENFORCE_FREE_TIER is true (all features locked behind free tier)"
else
    check_info "ENFORCE_FREE_TIER not set (defaults to false)"
fi

echo ""

# 7. Database Check
echo -e "${BLUE}7. Checking Database...${NC}"

DATABASE_PATH=$(grep "^DATABASE_PATH=" .env | cut -d'=' -f2)
if [ -z "$DATABASE_PATH" ]; then
    DATABASE_PATH="./data/app.db"
fi

# Check if drizzle migrations exist
if [ -d "drizzle/migrations" ]; then
    check_pass "Database migrations directory found"
else
    check_fail "Database migrations not found. Run: npm install"
fi

echo ""

# 8. Port Check
echo -e "${BLUE}8. Checking Port Availability...${NC}"

if command -v lsof &> /dev/null; then
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        check_warn "Port 3000 is already in use"
    else
        check_pass "Port 3000 is available"
    fi
else
    check_info "lsof not available, skipping port check"
fi

echo ""

# 9. Git Status
echo -e "${BLUE}9. Checking Git Status...${NC}"

if [ -d ".git" ]; then
    check_pass "Git repository initialized"

    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    check_info "Current branch: ${CURRENT_BRANCH}"

    if git status --porcelain | grep -q "^ M"; then
        check_warn "You have uncommitted changes"
        check_info "Run: git diff to review changes before deploying"
    else
        check_pass "No uncommitted changes"
    fi
else
    check_fail "Not a Git repository"
fi

echo ""

# 10. Security Check
echo -e "${BLUE}10. Security Checks...${NC}"

if [ -f ".gitignore" ]; then
    if grep -q "^\.env$" .gitignore; then
        check_pass ".env is in .gitignore"
    else
        check_fail ".env is NOT in .gitignore - Add it to prevent leaking secrets!"
    fi
else
    check_fail ".gitignore not found"
fi

if grep -q "^NEXTAUTH_SECRET=" .env && ! grep -q "your-random-secret" .env; then
    SECRET_LENGTH=$(grep "^NEXTAUTH_SECRET=" .env | cut -d'=' -f2 | wc -c)
    if [ "$SECRET_LENGTH" -ge 32 ]; then
        check_pass "NEXTAUTH_SECRET is sufficiently long ($(($SECRET_LENGTH - 1)) chars)"
    else
        check_fail "NEXTAUTH_SECRET is too short (must be 32+ chars)"
    fi
fi

if [ -f ".env" ]; then
    if [ "$(stat -f%A .env 2>/dev/null || stat -c%a .env 2>/dev/null)" != "600" ] && [ "$(stat -f%A .env 2>/dev/null || stat -c%a .env 2>/dev/null)" != "640" ]; then
        check_warn ".env file permissions are not restrictive (should be 600 or 640)"
    else
        check_pass ".env file has restrictive permissions"
    fi
fi

echo ""

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ Passed: $CHECKS_PASSED${NC}"
if [ $CHECKS_WARNING -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warnings: $CHECKS_WARNING${NC}"
fi
if [ $CHECKS_FAILED -gt 0 ]; then
    echo -e "${RED}❌ Failed: $CHECKS_FAILED${NC}"
fi
echo ""

# Final verdict
if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🚀 Ready for deployment!${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Review LAUNCH.md for deployment instructions"
    echo "2. Run: npm run build && npm start (test locally)"
    echo "3. Deploy to VPS following DEPLOYMENT.md"
    exit 0
else
    echo -e "${RED}⚠️  Please fix the errors above before deploying.${NC}"
    exit 1
fi

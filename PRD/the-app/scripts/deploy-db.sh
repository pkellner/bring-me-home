#!/bin/bash

# Database deployment script for bring-me-home app
# Usage: ./scripts/deploy-db.sh [environment]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Default to production if no environment specified
ENVIRONMENT=${1:-production}

echo -e "${YELLOW}Deploying database migrations to: ${ENVIRONMENT}${NC}"

case $ENVIRONMENT in
  "production")
    # Load from environment variable
    if [ -z "$DATABASE_URL_PRODUCTION" ]; then
      echo -e "${RED}Error: DATABASE_URL_PRODUCTION not set${NC}"
      echo "Please set DATABASE_URL_PRODUCTION in your .env file"
      exit 1
    fi
    DATABASE_URL="$DATABASE_URL_PRODUCTION"
    ;;
  "staging")
    # Load from environment variable
    if [ -z "$DATABASE_URL_STAGING" ]; then
      echo -e "${RED}Error: DATABASE_URL_STAGING not set${NC}"
      echo "Please set DATABASE_URL_STAGING in your .env file"
      exit 1
    fi
    DATABASE_URL="$DATABASE_URL_STAGING"
    ;;
  "local")
    # Load from environment variable
    if [ -z "$DATABASE_URL" ]; then
      echo -e "${RED}Error: DATABASE_URL not set${NC}"
      echo "Please set DATABASE_URL in your .env file"
      exit 1
    fi
    DATABASE_URL="$DATABASE_URL"
    ;;
  *)
    echo -e "${RED}Unknown environment: ${ENVIRONMENT}${NC}"
    echo "Usage: $0 [production|staging|local]"
    exit 1
    ;;
esac

# Check if migrations directory exists
if [ ! -d "prisma/migrations" ]; then
  echo -e "${RED}Error: prisma/migrations directory not found${NC}"
  echo "Are you running this from the project root?"
  exit 1
fi

# Show current migration status
echo -e "\n${YELLOW}Current migration status:${NC}"
DATABASE_URL="$DATABASE_URL" npx prisma migrate status

# Ask for confirmation
echo -e "\n${YELLOW}Do you want to deploy migrations to ${ENVIRONMENT}? (yes/no)${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${RED}Deployment cancelled${NC}"
  exit 0
fi

# Deploy migrations
echo -e "\n${GREEN}Deploying migrations...${NC}"
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy

# Generate Prisma Client (optional, only needed if schema changed)
echo -e "\n${GREEN}Generating Prisma Client...${NC}"
npx prisma generate

echo -e "\n${GREEN}✅ Database deployment completed successfully!${NC}"

# Show final migration status
echo -e "\n${YELLOW}Final migration status:${NC}"
DATABASE_URL="$DATABASE_URL" npx prisma migrate status
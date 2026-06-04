#!/bin/bash

# Vercel Manual Deployment Script

echo "🔍 Checking GitHub commit status..."
LATEST_COMMIT=$(git log -1 --format="%H")
echo "Latest commit: $LATEST_COMMIT"

echo ""
echo "📍 GitHub URL:"
echo "https://github.com/avrahamgshtein-rgb/ozar-chachamim/commit/$LATEST_COMMIT"

echo ""
echo "🚀 To trigger Vercel redeploy:"
echo ""
echo "Option 1: Empty commit (forces rebuild)"
git commit --allow-empty -m "trigger: force Vercel deployment"
echo "✅ Empty commit created - pushing now..."
git push origin main

echo ""
echo "Waiting 2 seconds..."
sleep 2

echo ""
echo "📊 Monitor deployment:"
echo "   https://vercel.com/avrahamgshtein-rgb/ozar-chachamim/deployments"

echo ""
echo "🔗 Check live site:"
echo "   https://ozar-chachamim.vercel.app"


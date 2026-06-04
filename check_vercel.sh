#!/bin/bash

echo "🔍 Checking Vercel deployment status..."
echo ""
echo "📊 Vercel Dashboard:"
echo "   https://vercel.com/avrahamgshtein-rgb/ozar-chachamim"
echo ""
echo "🔗 Live Site:"
echo "   https://ozar-chachamim.vercel.app"
echo ""
echo "⚙️ Environment Variables:"
echo "   https://vercel.com/avrahamgshtein-rgb/ozar-chachamim/settings/environment-variables"
echo ""
echo "📜 Recent Deployments:"
echo "   https://vercel.com/avrahamgshtein-rgb/ozar-chachamim/deployments"
echo ""
echo "=================================="
echo ""
echo "🚀 Force redeploy with:"
echo "   Dashboard → Latest Deploy → '...' → Redeploy"
echo ""

# Show latest commits
echo "📝 Latest commits:"
git log --oneline -5


#!/bin/zsh
set -e
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.."
echo "Deploying Match Coach (client-support) without Docker..."
npx --yes supabase@2.121.0 functions deploy client-support --project-ref ubljuduaxtdojaaggqpw --use-api --yes
echo "Done. Dashboard: https://supabase.com/dashboard/project/ubljuduaxtdojaaggqpw/functions"

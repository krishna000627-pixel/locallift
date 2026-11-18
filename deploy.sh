#!/usr/bin/env bash
# One-command deploy to Vercel (Termux or any shell)
# First time only: npm i -g vercel && vercel login
set -e
cd "$(dirname "$0")"
vercel --prod --yes --name locallift

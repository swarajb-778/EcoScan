#!/bin/bash

# EcoScan GitHub Repository Setup Script
# Run this after creating the GitHub repository manually

echo "🌱 EcoScan GitHub Setup"
echo "======================"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please run this from the EcoScan project root."
    exit 1
fi

echo "📝 Please enter your GitHub username:"
read -p "Username: " github_username

echo ""
echo "🔗 Setting up remote repository..."

# Add GitHub remote
git remote add origin https://github.com/$github_username/EcoScan.git

# Verify remote was added
echo "✅ Remote added:"
git remote -v

echo ""
echo "🚀 Pushing to GitHub..."

# Push to GitHub
git branch -M main
git push -u origin main

echo ""
echo "🎉 Success! Your EcoScan repository is now on GitHub:"
echo "   https://github.com/$github_username/EcoScan"
echo ""
echo "📋 Next steps:"
echo "   1. Visit your repository on GitHub"
echo "   2. Verify all files are uploaded correctly"
echo "   3. Update the README.md with your actual GitHub username"
echo "   4. Start development with: npm create svelte@latest ."
echo ""
echo "🛠️ Ready to begin Phase 1 of development!" 
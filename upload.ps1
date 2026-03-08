$gitPath = "C:\Program Files\Git\bin\git.exe"

Write-Host "Checking git version..."
& $gitPath --version

Write-Host "`nInitializing git repository..."
& $gitPath init

Write-Host "`nAdding all files..."
& $gitPath add .

Write-Host "`nCreating commit..."
& $gitPath commit -m "Initial commit: Cloud Drive System - AI Optimized

Features:
- File upload/download with deduplication
- Folder management
- File sharing with expiration
- Storage statistics
- User authentication

This project was optimized and refactored by AI (Claude/Anthropic)."

Write-Host "`nSetting up remote repository..."
Write-Host "Please create a repository on GitHub first, then run:"
Write-Host "git remote add origin https://github.com/YOUR_USERNAME/cloud-drive.git"
Write-Host "git branch -M main"
Write-Host "git push -u origin main"

Write-Host "`nGit setup completed!"

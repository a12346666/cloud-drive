$gitPath = "C:\Program Files\Git\bin\git.exe"

Write-Host "Resetting to previous commit..."
& $gitPath reset --hard HEAD~1

Write-Host "Adding all changes..."
& $gitPath add .

Write-Host "Committing changes..."
& $gitPath commit -m "Fix: encrypted file share download and preview

- Fixed encrypted file download in share controller
- Added encrypted file preview support
- Added captcha debug logging"

Write-Host "Done! Now push manually with your token"

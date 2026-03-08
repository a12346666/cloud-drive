$gitPath = "C:\Program Files\Git\bin\git.exe"

Write-Host "Adding all changes..."
& $gitPath add .

Write-Host "Committing changes..."
& $gitPath commit -m "Add deployment configuration for Railway and Vercel

- Added Dockerfile and nixpacks.toml for Railway backend
- Added vercel.json for Vercel frontend
- Added production environment templates
- Updated axios config to support production API URL
- Added deployment guide"

Write-Host "Done! Now pushing..."

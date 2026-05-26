# Refresh YouTube cookies in Railway — run this whenever yt-dlp says cookies expired
# Prerequisites (one-time setup):
#   npm install -g @railway/cli
#   railway login
#   railway link   (run inside this project folder)

$tempCookies = "$env:TEMP\yt-cookies.txt"

Write-Host "Reading YouTube cookies from Chrome..." -ForegroundColor Cyan
yt-dlp --cookies-from-browser chrome --cookies $tempCookies --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --quiet 2>$null

if (-not (Test-Path $tempCookies)) {
    Write-Host "Failed to read cookies from Chrome. Make sure Chrome is installed and you're logged into YouTube." -ForegroundColor Red
    exit 1
}

$cookies = Get-Content $tempCookies -Raw
if ([string]::IsNullOrWhiteSpace($cookies)) {
    Write-Host "Cookies file is empty. Try closing Chrome first, then run again." -ForegroundColor Red
    exit 1
}

Write-Host "Uploading cookies to Railway..." -ForegroundColor Cyan
$env:RAILWAY_COOKIES = $cookies
railway variables --set "YOUTUBE_COOKIES=$cookies"

Remove-Item $tempCookies -Force
Write-Host "Done! Railway will redeploy automatically with fresh cookies." -ForegroundColor Green

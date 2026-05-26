# Refresh YouTube cookies in Railway
#
# HOW TO USE:
#   1. Install "Get cookies.txt LOCALLY" extension in Chrome
#      https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
#   2. Go to youtube.com (make sure you're logged in)
#   3. Click the extension icon → Export → save the file as "cookies.txt" inside this folder
#   4. Run this script:  .\refresh-cookies.ps1
#   5. Done — cookies.txt is deleted automatically

$cookiesFile = Join-Path $PSScriptRoot "cookies.txt"

if (-not (Test-Path $cookiesFile)) {
    Write-Host ""
    Write-Host "cookies.txt not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Steps:" -ForegroundColor Yellow
    Write-Host "  1. Install 'Get cookies.txt LOCALLY' in Chrome"
    Write-Host "  2. Go to youtube.com while logged in"
    Write-Host "  3. Click the extension → Export → save as cookies.txt in this folder:"
    Write-Host "     $PSScriptRoot" -ForegroundColor Cyan
    Write-Host "  4. Run this script again"
    exit 1
}

$size = (Get-Item $cookiesFile).Length
if ($size -lt 100) {
    Write-Host "cookies.txt looks empty or invalid. Re-export from the extension." -ForegroundColor Red
    exit 1
}

Write-Host "Uploading cookies to Railway ($size bytes)..." -ForegroundColor Cyan
$cookies = Get-Content $cookiesFile -Raw
railway variables --set "YOUTUBE_COOKIES=$cookies"

Remove-Item $cookiesFile -Force
Write-Host "Done! Railway will redeploy with fresh cookies." -ForegroundColor Green
Write-Host "cookies.txt deleted." -ForegroundColor Gray

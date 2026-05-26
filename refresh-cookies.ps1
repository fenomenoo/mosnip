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

$cookies = Get-Content $cookiesFile -Raw
# Base64 encode so multiline content survives the Railway CLI set command
$cookiesB64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($cookies))
Write-Host "Uploading cookies to Railway ($size bytes, base64)..." -ForegroundColor Cyan
railway variables --set "YOUTUBE_COOKIES=$cookiesB64"

Remove-Item $cookiesFile -Force
Write-Host "Done! Railway will redeploy with fresh cookies." -ForegroundColor Green
Write-Host "cookies.txt deleted." -ForegroundColor Gray

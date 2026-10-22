# SC Web Transitions: copy already-rendered, properly licensed VP9-alpha clips.
# Run from a folder containing six matching .webm files.
param([string]$From = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
$destination = Join-Path $env:LOCALAPPDATA 'SCWebTransitions\CinematicPlates'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$names = @('smoke_cover','smoke_release','smoke_in','toxic_cover','toxic_release','toxic_in')
foreach ($name in $names) {
    $file = Join-Path $From ($name+'.webm')
    if (Test-Path -LiteralPath $file -PathType Leaf) {
        Copy-Item -LiteralPath $file -Destination (Join-Path $destination ($name+'.webm')) -Force
        Write-Host "Installed $name.webm"
    } else {
        Write-Warning "Missing $name.webm in $From"
    }
}
Write-Host "VFX plate folder: $destination"
Write-Host 'Restart SC Web Transitions and inspect the Professional Smoke Assets status in the app.'

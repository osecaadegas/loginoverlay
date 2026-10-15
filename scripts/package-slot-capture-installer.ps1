param([string]$DotnetPath = $env:SLOT_CAPTURE_DOTNET)
$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'package-slot-capture-extension.ps1')

if (-not $DotnetPath) {
  $dotnetCommand = Get-Command dotnet -ErrorAction Stop
  $DotnetPath = $dotnetCommand.Source
}

$projectPath = Join-Path $repositoryRoot 'native\slot-capture-agent\StreamersCenter.SlotCapture.Agent.csproj'
$publishDirectory = Join-Path $repositoryRoot 'native\slot-capture-agent\bin\Release\net8.0-windows10.0.19041.0\win-x64\publish'
& $DotnetPath publish $projectPath -c Release
if ($LASTEXITCODE -ne 0) { throw 'The Slot Capture installer build failed.' }

$installer = Join-Path $publishDirectory 'StreamersCenterSlotCaptureSetup.exe'
$destination = Join-Path $repositoryRoot 'public\downloads\StreamersCenterSlotCaptureSetup.exe'
Copy-Item -LiteralPath $installer -Destination $destination -Force
Write-Output "Created $destination"

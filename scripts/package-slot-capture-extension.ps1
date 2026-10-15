$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$sourceDirectory = Join-Path $repositoryRoot 'browser-extension'
$outputDirectory = Join-Path $repositoryRoot 'public\downloads'
$outputPath = Join-Path $outputDirectory 'streamerscenter-slot-capture-extension.zip'

if (-not (Test-Path -LiteralPath (Join-Path $sourceDirectory 'manifest.json'))) {
  throw 'browser-extension/manifest.json was not found.'
}

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
if (Test-Path -LiteralPath $outputPath) {
  Remove-Item -LiteralPath $outputPath -Force
}

Compress-Archive -Path (Join-Path $sourceDirectory '*') -DestinationPath $outputPath -CompressionLevel Optimal
Write-Output "Created $outputPath"

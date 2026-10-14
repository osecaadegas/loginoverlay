param(
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-p]{32}$')][string]$ExtensionId,
  [string]$AgentPath = (Join-Path $PSScriptRoot 'bin\Release\net8.0-windows10.0.19041.0\win-x64\publish\streamerscenter-slot-capture-agent.exe')
)
$resolvedAgent = (Resolve-Path -LiteralPath $AgentPath -ErrorAction Stop).Path
$manifestPath = Join-Path (Split-Path $resolvedAgent) 'com.streamerscenter.slot_capture.json'
$manifest = [ordered]@{
  name = 'com.streamerscenter.slot_capture'
  description = 'StreamersCenter local slot capture agent'
  path = $resolvedAgent
  type = 'stdio'
  allowed_origins = @("chrome-extension://$ExtensionId/")
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding utf8NoBOM
$keys = @(
  'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.streamerscenter.slot_capture',
  'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.streamerscenter.slot_capture'
)
foreach ($key in $keys) {
  New-Item -Path $key -Force | Out-Null
  Set-Item -Path $key -Value $manifestPath
}
Write-Host "Native Messaging host registado para Chrome e Edge: $manifestPath"

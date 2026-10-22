[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ExecutablePath,
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$OutputPath = (Join-Path $RepoRoot "public\SC_Web_Transitions.zip")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$sourceName = "SC_Web_Transitions_v3.15.0_Cinematic_Plate_Engine_Source"
$releaseName = "SC_Web_Transitions_v3.15.0_Cinematic_Plate_Engine_Release"
$executableName = "SC_Web_Transitions_v3.15.0_Cinematic_Plate_Engine_RC1.exe"
$sourceDirectory = Join-Path $RepoRoot ".codex-dev\sc-web-transitions-v3.15-source"
$releaseFiles = @(
  "CHANGELOG_3.15.0_CINEMATIC_PLATE_ENGINE.md",
  "CINEMATIC_PLATES_GUIDE.md",
  "INSTALL_CINEMATIC_PLATES.ps1",
  "QA_3.15.0_CINEMATIC_PLATES.md"
)
$requiredSourceFiles = @("go.mod", "main.go", "gas-vfx3d.js", "ui.html")

if (-not (Test-Path -LiteralPath $sourceDirectory -PathType Container)) {
  throw "SC Web Transitions source directory is missing: $sourceDirectory"
}
foreach ($file in $requiredSourceFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path $sourceDirectory $file) -PathType Leaf)) {
    throw "Required SC Web Transitions source file is missing: $file"
  }
}
if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
  throw "Built Windows executable is missing: $ExecutablePath"
}
foreach ($file in $releaseFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path $sourceDirectory $file) -PathType Leaf)) {
    throw "Required release document is missing from the current source: $file"
  }
}

$outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $outputFullPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("sc-web-transitions-package-" + [guid]::NewGuid().ToString("N"))
$stagingRelease = Join-Path $stagingRoot $releaseName
$stagingSource = Join-Path $stagingRoot $sourceName
$stagedZip = "$outputFullPath.$([guid]::NewGuid().ToString('N')).tmp"
try {
  New-Item -ItemType Directory -Force -Path $stagingRelease, $stagingSource | Out-Null
  Copy-Item -Path (Join-Path $sourceDirectory "*") -Destination $stagingSource -Recurse -Force
  Copy-Item -LiteralPath $ExecutablePath -Destination (Join-Path $stagingRelease $executableName) -Force
  foreach ($file in $releaseFiles) {
    Copy-Item -LiteralPath (Join-Path $sourceDirectory $file) -Destination (Join-Path $stagingRelease $file) -Force
  }

  $sourceZipPath = Join-Path $stagingRelease "$sourceName.zip"
  [System.IO.Compression.ZipFile]::CreateFromDirectory(
    $stagingSource,
    $sourceZipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $true
  )
  [System.IO.Compression.ZipFile]::CreateFromDirectory(
    $stagingRelease,
    $stagedZip,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $true
  )

  $archive = [System.IO.Compression.ZipFile]::OpenRead($stagedZip)
  try {
    $expectedExecutable = "$releaseName/$executableName"
    $expectedSourceZip = "$releaseName/$sourceName.zip"
    $entryNames = @($archive.Entries | ForEach-Object FullName)
    if ($expectedExecutable -notin $entryNames -or $expectedSourceZip -notin $entryNames) {
      throw "Packaged archive is missing its Windows executable or current source archive."
    }
    $sourceEntry = $archive.GetEntry($expectedSourceZip)
    $sourceStream = $sourceEntry.Open()
    $sourceArchive = [System.IO.Compression.ZipArchive]::new(
      $sourceStream,
      [System.IO.Compression.ZipArchiveMode]::Read,
      $false
    )
    try {
      $expectedRenderer = "$sourceName/gas-vfx3d.js"
      if ($null -eq $sourceArchive.GetEntry($expectedRenderer)) {
        throw "Packaged source archive is missing the current gas renderer."
      }
    } finally {
      $sourceArchive.Dispose()
    }
  } finally {
    $archive.Dispose()
  }

  Move-Item -LiteralPath $stagedZip -Destination $outputFullPath -Force
  Write-Output "PACKAGE VERIFIED: $outputFullPath"
} finally {
  if (Test-Path -LiteralPath $stagedZip) { Remove-Item -LiteralPath $stagedZip -Force }
  if (Test-Path -LiteralPath $stagingRoot) { Remove-Item -LiteralPath $stagingRoot -Recurse -Force }
}

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ExecutablePath,
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath,
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$OutputPath = (Join-Path $RepoRoot "public\SC_Web_Transitions.zip")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$manifestPath = Join-Path (Split-Path $ExecutablePath -Parent) 'release-manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'Release manifest missing' }
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$version = [string]$manifest.version
$revision = [string]$manifest.sourceRevision
if ($version -notmatch '^\d+\.\d+\.\d+$' -or $revision -notmatch '^[0-9a-f]{40}$') { throw 'Invalid release version or source revision' }
$sourceName = "SC_Web_Transitions_v${version}_Cinematic_GPU_Source"
$releaseName = "SC_Web_Transitions_v${version}_Cinematic_GPU_Release"
$executableName = "SC_Web_Transitions_v${version}_Cinematic_GPU.exe"
$sourcePrefix = '.codex-dev/sc-web-transitions-v3.15-source/'
$sourceDirectory = Join-Path $RepoRoot $sourcePrefix
$releaseFiles = @(
  "CHANGELOG_${version}_CINEMATIC_GPU.md",
  "PRODUCTION_${version}.md",
  "QA_${version}_CINEMATIC_GPU.md",
  "CHANGELOG_3.16.0_CINEMATIC_GPU.md",
  "QA_3.16.0_CINEMATIC_GPU.md",
  "ASSET_PIPELINE_3.16.md",
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
if (-not (Test-Path -LiteralPath $InstallerPath -PathType Leaf)) { throw "Built Windows installer missing: $InstallerPath" }
git -C $RepoRoot diff --quiet $revision -- $sourcePrefix
if ($LASTEXITCODE -ne 0) { throw "Release source must match the committed revision" }
foreach ($artifactPath in @($ExecutablePath, $InstallerPath)) {
  $record = @($manifest.artifacts | Where-Object { $_.file -eq (Split-Path $artifactPath -Leaf) })
  if ($record.Count -ne 1 -or $record[0].sha256 -ne (Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash.ToLower() -or $record[0].bytes -ne (Get-Item -LiteralPath $artifactPath).Length) { throw "Artifact hash/size does not match release manifest: $artifactPath" }
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
  # Read source from the manifest's immutable commit, never the working tree.
  $committedArchive = Join-Path $stagingRoot 'committed-source.zip'
  $committedRoot = Join-Path $stagingRoot 'committed'
  git -C $RepoRoot archive --format=zip "--output=$committedArchive" $revision -- $sourcePrefix
  if ($LASTEXITCODE -ne 0) { throw 'Cannot export release source revision' }
  [System.IO.Compression.ZipFile]::ExtractToDirectory($committedArchive, $committedRoot)
  $committedSource = Join-Path $committedRoot $sourcePrefix
  $archivedVersion = [regex]::Match((Get-Content (Join-Path $committedSource 'main.go') -Raw), 'const appVersion = "([0-9.]+)-cinematic-gpu"').Groups[1].Value
  if ($archivedVersion -ne $version) { throw 'Manifest version does not match committed source version' }
  foreach ($file in Get-ChildItem -LiteralPath $committedSource -File -Recurse) {
    $relativePath = $file.FullName.Substring($committedSource.TrimEnd('\','/').Length + 1).Replace('\','/')
    if ($relativePath -match '(^|/)(__pycache__|node_modules|[^/]*-evidence|build|dist)(/|$)' -or $relativePath -match '\.(exe|zip|log|pyc)$') { continue }
    $destination = Join-Path $stagingSource $relativePath
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $destination
  }
  Copy-Item -LiteralPath $ExecutablePath -Destination (Join-Path $stagingRelease $executableName) -Force
  Copy-Item -LiteralPath $InstallerPath -Destination (Join-Path $stagingRelease (Split-Path $InstallerPath -Leaf)) -Force
  Copy-Item -LiteralPath $manifestPath -Destination (Join-Path $stagingRelease 'release-manifest.json')
  foreach ($file in $releaseFiles) {
    Copy-Item -LiteralPath (Join-Path $committedSource $file) -Destination (Join-Path $stagingRelease $file) -Force
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
    if ($expectedExecutable -notin $entryNames -or $expectedSourceZip -notin $entryNames -or "$releaseName/$(Split-Path $InstallerPath -Leaf)" -notin $entryNames) {
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
  if (Test-Path -LiteralPath $stagingRoot) {
    $resolvedStaging = (Resolve-Path -LiteralPath $stagingRoot).Path
    $expectedStaging = [System.IO.Path]::GetFullPath($stagingRoot)
    $tempParent = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if ($resolvedStaging -ne $expectedStaging -or -not $resolvedStaging.StartsWith($tempParent, [System.StringComparison]::OrdinalIgnoreCase) -or (Split-Path -Leaf $resolvedStaging) -notlike 'sc-web-transitions-package-*') { throw "Unsafe packaging cleanup path" }
    Remove-Item -LiteralPath $resolvedStaging -Recurse -Force
  }
}

[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$GoBinary,
  [string]$InnoCompiler
)
$ErrorActionPreference = 'Stop'
$sourcePrefix = '.codex-dev/sc-web-transitions-v3.15-source'
$source = Join-Path $RepoRoot $sourcePrefix
if (-not (Test-Path -LiteralPath (Join-Path $source 'go.mod'))) { throw 'Tracked SC source missing' }
$version = [regex]::Match((Get-Content (Join-Path $source 'main.go') -Raw), 'const appVersion = "([0-9.]+)-cinematic-gpu"').Groups[1].Value
if (-not $version) { throw 'Cannot determine application version' }
git -C $RepoRoot diff --quiet HEAD -- '.codex-dev/sc-web-transitions-v3.15-source'
if ($LASTEXITCODE -ne 0) { throw 'Commit reviewed source before producing release binaries' }
$revision = (git -C $RepoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $revision -notmatch '^[0-9a-f]{40}$') { throw 'Cannot determine committed source revision' }
if (-not $GoBinary) {
  $GoBinary = Join-Path $RepoRoot '.codex-dev\vfx-tools\go\bin\go.exe'
  if (-not (Test-Path -LiteralPath $GoBinary)) { $GoBinary = (Get-Command go -ErrorAction Stop).Source }
}
if (-not $InnoCompiler) {
  $InnoCompiler = Join-Path $RepoRoot '.codex-dev\vfx-tools\inno\ISCC.exe'
  if (-not (Test-Path -LiteralPath $InnoCompiler)) { $InnoCompiler = (Get-Command ISCC -ErrorAction Stop).Source }
}
$releaseRoot = Join-Path $RepoRoot '.codex-dev\sc-web-transitions-releases'
$output = Join-Path $releaseRoot $version
New-Item -ItemType Directory -Force -Path $output | Out-Null
$exe = Join-Path $output "SC_Web_Transitions_v${version}_Cinematic_GPU.exe"
$check = Join-Path $output 'reproducibility-check.exe'
# Build only a Git archive: untracked .go files and wildcard-embedded assets
# must never contaminate the release executable or its source package.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$buildRoot = Join-Path $releaseRoot ('.build-' + $version + '-' + [guid]::NewGuid().ToString('N'))
$archive = "$buildRoot.zip"
$priorEnv = @{ GOOS=$env:GOOS; GOARCH=$env:GOARCH; CGO_ENABLED=$env:CGO_ENABLED }
$pushed = $false
try {
  git -C $RepoRoot archive --format=zip "--output=$archive" $revision -- $sourcePrefix
  if ($LASTEXITCODE -ne 0) { throw 'Cannot export committed release source' }
  [System.IO.Compression.ZipFile]::ExtractToDirectory($archive, $buildRoot)
  $source = Join-Path $buildRoot $sourcePrefix
  $archivedVersion = [regex]::Match((Get-Content (Join-Path $source 'main.go') -Raw), 'const appVersion = "([0-9.]+)-cinematic-gpu"').Groups[1].Value
  if ($archivedVersion -ne $version) { throw 'Working tree and archived source versions differ' }
  Push-Location $source
  $pushed = $true
  $env:GOOS = 'windows'; $env:GOARCH = 'amd64'; $env:CGO_ENABLED = '0'
  $flags = "-s -w -H windowsgui -X main.buildRevision=$revision"
  & $GoBinary build -trimpath -buildvcs=false -ldflags $flags -o $exe .
  if ($LASTEXITCODE -ne 0) { throw 'Windows application build failed' }
  & $GoBinary build -trimpath -buildvcs=false -ldflags $flags -o $check .
  if ($LASTEXITCODE -ne 0) { throw 'Reproducibility build failed' }
  if ((Get-FileHash $exe).Hash -ne (Get-FileHash $check).Hash) { throw 'Repeated executable build hashes differ' }
  Remove-Item -LiteralPath $check
  & $InnoCompiler "/DReleaseDir=$output" (Join-Path $source 'SC_Web_Transitions.iss')
  if ($LASTEXITCODE -ne 0) { throw 'Windows installer build failed' }
  $installer = Join-Path $output "SC_Web_Transitions_v${version}_Cinematic_GPU_Setup.exe"
  if (-not (Test-Path -LiteralPath $installer)) { throw 'Compiler did not produce installer' }
  $toolchain = (& $GoBinary version) -join ' '
  $manifest = [ordered]@{toolchain=$toolchain;version=$version;sourceRevision=$revision;builtAt=[DateTime]::UtcNow.ToString('o');signed=$false;reproducibleExecutable=$true;artifacts=@()}
  foreach ($file in @($exe,$installer)) { $manifest.artifacts += @{file=(Split-Path $file -Leaf);sha256=(Get-FileHash $file -Algorithm SHA256).Hash.ToLower();bytes=(Get-Item $file).Length} }
  $manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 (Join-Path $output 'release-manifest.json')
  & (Join-Path $RepoRoot 'scripts\package-sc-web-transitions.ps1') -ExecutablePath $exe -InstallerPath $installer -RepoRoot $RepoRoot
  if ($LASTEXITCODE -ne 0) { throw 'Release packaging failed' }
  Write-Output "RELEASE: $output"
} finally {
  if ($pushed) { Pop-Location }
  foreach ($key in $priorEnv.Keys) { [Environment]::SetEnvironmentVariable($key, $priorEnv[$key], 'Process') }
  if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
  if (Test-Path -LiteralPath $buildRoot) {
    $resolved = (Resolve-Path -LiteralPath $buildRoot).Path
    $allowed = [System.IO.Path]::GetFullPath($releaseRoot).TrimEnd('\') + '\'
    if ($resolved -ne [System.IO.Path]::GetFullPath($buildRoot) -or -not $resolved.StartsWith($allowed, [System.StringComparison]::OrdinalIgnoreCase) -or (Split-Path -Leaf $resolved) -notlike '.build-*') { throw 'Unsafe release build cleanup path' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}

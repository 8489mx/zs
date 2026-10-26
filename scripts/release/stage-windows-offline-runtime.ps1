# Trusted offline runtime from the GitHub-hosted Windows 2025 image and actions/setup-node.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$runtime = Join-Path (Get-Location).Path 'portable\runtime'
if (Test-Path $runtime) { throw "Refusing to overwrite an existing runtime: $runtime" }
New-Item -ItemType Directory -Path $runtime -Force | Out-Null

$pgRoot = $env:PGROOT
if (-not $pgRoot -or [IO.Path]::GetFullPath($pgRoot) -ne 'C:\Program Files\PostgreSQL\17') {
  throw "Unapproved PostgreSQL origin: $pgRoot"
}
$pgBin = Join-Path $pgRoot 'bin'
$version = (& (Join-Path $pgBin 'postgres.exe') --version)
if ($LASTEXITCODE -ne 0 -or $version -notmatch 'PostgreSQL\) 17\.11') {
  throw "Unapproved PostgreSQL version: $version; expected 17.11"
}
$pgDest = Join-Path $runtime 'postgres'
New-Item -ItemType Directory -Path $pgDest -Force | Out-Null
foreach ($dir in @('bin', 'lib', 'share')) {
  $source = Join-Path $pgRoot $dir
  if (-not (Test-Path $source -PathType Container)) { throw "PostgreSQL directory missing: $source" }
  Copy-Item -LiteralPath $source -Destination $pgDest -Recurse -Force
}
$nodeExe = (& node -p 'process.execPath').Trim()
$nodeVersion = (& $nodeExe --version).Trim()
if ($nodeVersion -notmatch '^v22\.') { throw "Node 22 required: $nodeVersion" }
$npmRoot = (& npm root -g).Trim()
$npmPackage = Join-Path $npmRoot 'npm'
if (-not (Test-Path (Join-Path $npmPackage 'bin\npm-cli.js'))) { throw 'npm package missing from first-party setup-node runtime' }
$nodeDest = Join-Path $runtime 'node'
New-Item -ItemType Directory -Path (Join-Path $nodeDest 'node_modules') -Force | Out-Null
Copy-Item -LiteralPath $nodeExe -Destination (Join-Path $nodeDest 'node.exe') -Force
Copy-Item -LiteralPath $npmPackage -Destination (Join-Path $nodeDest 'node_modules') -Recurse -Force
$npmShim = '@ECHO OFF' + [Environment]::NewLine + '"%~dp0node.exe" "%~dp0node_modules\npm\bin\npm-cli.js" %*' + [Environment]::NewLine
[IO.File]::WriteAllText((Join-Path $nodeDest 'npm.cmd'), $npmShim, (New-Object System.Text.ASCIIEncoding))

$required = @(
  'postgres\bin\postgres.exe','postgres\bin\pg_ctl.exe',
  'postgres\bin\initdb.exe','postgres\bin\psql.exe','postgres\bin\pg_dump.exe',
  'postgres\bin\createdb.exe','postgres\bin\pg_isready.exe',
  'postgres\share\postgresql.conf.sample','node\node.exe',
  'node\npm.cmd','node\node_modules\npm\bin\npm-cli.js'
)
foreach ($relative in $required) {
  if (-not (Test-Path (Join-Path $runtime $relative) -PathType Leaf)) { throw "Runtime file missing: $relative" }
}
if ((& (Join-Path $pgDest 'bin\postgres.exe') --version) -ne $version) { throw 'Copied PostgreSQL is invalid' }
if ((& (Join-Path $nodeDest 'node.exe') --version) -ne $nodeVersion) { throw 'Copied Node is invalid' }
$npmVersion = & (Join-Path $nodeDest 'npm.cmd') --version
if ($LASTEXITCODE -ne 0 -or -not $npmVersion) { throw 'Copied npm is invalid' }

$sourceChecks = @(
  @((Join-Path $pgBin 'postgres.exe'), (Join-Path $pgDest 'bin\postgres.exe')),
  @((Join-Path $pgBin 'initdb.exe'), (Join-Path $pgDest 'bin\initdb.exe')),
  @((Join-Path $pgBin 'pg_ctl.exe'), (Join-Path $pgDest 'bin\pg_ctl.exe')),
  @($nodeExe, (Join-Path $nodeDest 'node.exe')),
  @((Join-Path $npmPackage 'bin\npm-cli.js'), (Join-Path $nodeDest 'node_modules\npm\bin\npm-cli.js'))
)
foreach ($pair in $sourceChecks) {
  if ((Get-FileHash -LiteralPath $pair[0] -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $pair[1] -Algorithm SHA256).Hash) {
    throw "SHA256 source-copy mismatch: $($pair[1])"
  }
}
$files = @(Get-ChildItem -LiteralPath $runtime -Recurse -File | Sort-Object FullName)
$hashLines = foreach ($file in $files) {
  $relative = $file.FullName.Substring($runtime.Length + 1).Replace('\','/')
  "$((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant())  $relative"
}
[IO.File]::WriteAllLines((Join-Path $runtime 'runtime-manifest.sha256'), [string[]]$hashLines, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Verified PostgreSQL $version, Node $nodeVersion, npm $npmVersion. Manifest: $($files.Count) files."

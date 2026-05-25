$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

$repoRoot = Resolve-RepoRoot

Set-Location $repoRoot

Write-Host 'Starting frontend Vite dev server on http://localhost:5173 ...'
& npm.cmd --prefix frontend run dev -- --host localhost --port 5173
exit $LASTEXITCODE


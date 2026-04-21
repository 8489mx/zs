Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/Common.ps1"

$paths = Get-PathMap

try {
  $envFile = Ensure-EnvFile -Paths $paths
  $envMap = Get-EnvMap -EnvFile $envFile

  Assert-PostgresRuntime -Paths $paths
  Assert-BackendArtifacts -Paths $paths -EnvMap $envMap
  Assert-FrontendArtifacts -Paths $paths

  $bootstrapCommand = Get-EnvValue -EnvMap $envMap -Key 'BACKEND_BOOTSTRAP_CMD' -Default ((Get-EnvValue -EnvMap $envMap -Key 'NPM_EXE' -Default 'npm') + ' run migration:run')

  Write-Host 'Portable readiness check: OK'
  Write-Host ("- Env file: {0}" -f $envFile)
  Write-Host ("- Postgres bin: {0}" -f $paths.PostgresBinDir)
  Write-Host ("- Backend dir: {0}" -f $paths.AppBackendDir)
  Write-Host ("- Frontend dir: {0}" -f $paths.AppFrontendDir)
  Write-Host ("- Bootstrap command: {0}" -f $bootstrapCommand)
} catch {
  Write-Error $_.Exception.Message
  exit 1
}

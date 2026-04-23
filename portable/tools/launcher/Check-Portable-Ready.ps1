Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/Common.ps1"

$paths = Get-PathMap

try {
  $envFile = Ensure-EnvFile -Paths $paths
  $envMap = Get-EnvMap -EnvFile $envFile

  Assert-PostgresRuntime -Paths $paths
  Assert-BundledNodeRuntime -Paths $paths
  Assert-BackendArtifacts -Paths $paths -EnvMap $envMap
  Assert-FrontendArtifacts -Paths $paths

  $nodeExe = Resolve-NodeExe -Paths $paths -EnvMap $envMap
  $npmExe = Resolve-NpmExe -Paths $paths -EnvMap $envMap
  $bootstrapCommand = Resolve-BootstrapCommand -Paths $paths -EnvMap $envMap

  Write-Host 'Portable readiness check: OK'
  Write-Host ("- Env file: {0}" -f $envFile)
  Write-Host ("- Postgres bin: {0}" -f $paths.PostgresBinDir)
  Write-Host ("- Node exe: {0}" -f $nodeExe)
  Write-Host ("- npm exe: {0}" -f $npmExe)
  Write-Host ("- Backend dir: {0}" -f $paths.AppBackendDir)
  Write-Host ("- Frontend dir: {0}" -f $paths.AppFrontendDir)
  Write-Host ("- Bootstrap command: {0}" -f $bootstrapCommand)
} catch {
  Write-Error $_.Exception.Message
  exit 1
}

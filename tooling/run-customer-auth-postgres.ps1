param([string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin')
$ErrorActionPreference = 'Stop'
foreach ($tool in @('initdb.exe', 'pg_ctl.exe', 'postgres.exe')) {
  if (-not (Test-Path -LiteralPath (Join-Path $PostgresBin $tool))) { throw "Missing PostgreSQL tool: $tool" }
}
$taskRoot = Join-Path ([IO.Path]::GetTempPath()) ('faji-auth-pg-' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $taskRoot
$dataPath = Join-Path $taskRoot 'data'
$passwordPath = Join-Path $taskRoot 'bootstrap-password'
$serverLog = Join-Path $taskRoot 'postgres.log'
$clusterName = 'faji_auth_test_' + [guid]::NewGuid().ToString('N')
$randomBytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($randomBytes)
$password = [Convert]::ToBase64String($randomBytes)
$rng.Dispose()
[IO.File]::WriteAllText($passwordPath, $password, [Text.UTF8Encoding]::new($false))
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()
$names = @('FAJI_AUTH_TEST_PORT','FAJI_AUTH_TEST_PASSWORD','FAJI_AUTH_TEST_CLUSTER','FAJI_AUTH_TEST_LOG')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
  & (Join-Path $PostgresBin 'initdb.exe') -D $dataPath -U faji_auth_test_admin --auth=scram-sha-256 --encoding=UTF8 --no-locale "--pwfile=$passwordPath" *> (Join-Path $taskRoot 'initdb.log')
  if ($LASTEXITCODE -ne 0) { throw "Isolated initdb failed; inspect $taskRoot (no existing service was used)" }
  Remove-Item -LiteralPath $passwordPath
  # Fresh cluster only. Never accept a connection URL or an existing data path.
  @"
listen_addresses = '127.0.0.1'
port = $port
cluster_name = '$clusterName'
log_statement = 'none'
log_min_error_statement = 'panic'
log_parameter_max_length = 0
log_parameter_max_length_on_error = 0
"@ | Add-Content -LiteralPath (Join-Path $dataPath 'postgresql.conf')
  & (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataPath -l $serverLog -w -t 30 start
  if ($LASTEXITCODE -ne 0) { throw 'Isolated PostgreSQL startup failed' }
  $env:FAJI_AUTH_TEST_PORT = [string]$port
  $env:FAJI_AUTH_TEST_PASSWORD = $password
  $env:FAJI_AUTH_TEST_CLUSTER = $clusterName
  $env:FAJI_AUTH_TEST_LOG = $serverLog
  Push-Location (Join-Path $PSScriptRoot '..\apps\customer_web')
  try {
    & node --conditions=react-server --import tsx --test test/postgres.integration.test.ts | Tee-Object -FilePath (Join-Path $taskRoot 'tests.tap')
    $testExit = $LASTEXITCODE
  } finally { Pop-Location }
  if ($testExit -ne 0) { throw 'Isolated authentication database tests failed' }
} finally {
  if (Test-Path -LiteralPath (Join-Path $dataPath 'postmaster.pid')) {
    & (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataPath -m fast -w -t 30 stop
    if ($LASTEXITCODE -ne 0) { Write-Warning "Stop failed; inspect isolated cluster at $taskRoot" }
  }
  if (Test-Path -LiteralPath $passwordPath) { Remove-Item -LiteralPath $passwordPath }
  foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
  $password = $null
  Write-Output "Isolated cluster stopped; evidence retained at $taskRoot"
}

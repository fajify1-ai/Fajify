param(
  [string]$DeviceId = 'RFCY508YB6X',
  [string]$FlutterBin = 'C:\src\flutter\bin\flutter.bat',
  [string]$AdbPath = "$env:LOCALAPPDATA\Android\sdk\platform-tools\adb.exe"
)

$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
$appPath = Join-Path $repoPath 'apps\customer_mobile'
$configPath = Join-Path $appPath 'oidc-config.local.json'
$caPath = Join-Path $repoPath 'infrastructure\certs\fajify-rootCA.crt'
$rawPath = Join-Path $appPath 'android\app\src\debug\res\raw'
foreach ($requiredPath in @($FlutterBin, $AdbPath, $configPath, $caPath)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required local development file is missing: $requiredPath"
  }
}

# Public root certificate only. This resource is excluded from release builds
# by Android's src/debug source set and is ignored by Git.
New-Item -ItemType Directory -Force -Path $rawPath | Out-Null
Copy-Item -LiteralPath $caPath -Destination (Join-Path $rawPath 'fajify_root_ca.crt')
foreach ($port in @(8443, 3443)) {
  & $AdbPath -s $DeviceId reverse "tcp:$port" "tcp:$port"
  if ($LASTEXITCODE -ne 0) { throw "ADB reverse failed for port $port" }
}

Push-Location -LiteralPath $appPath
try {
  & $FlutterBin run --debug -d $DeviceId "--dart-define-from-file=$configPath"
  if ($LASTEXITCODE -ne 0) { throw 'Flutter run failed.' }
} finally {
  Pop-Location
}

param([string]$Python = 'python')
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    & $Python prepare_data.py
    if ($LASTEXITCODE -ne 0) { throw 'Data preparation failed' }
    & $Python -m PyInstaller --noconfirm --clean --onefile --name SchoolSuccessExplorer --add-data 'web;web' app.py
    if ($LASTEXITCODE -ne 0) { throw 'Executable build failed' }
} finally { Pop-Location }

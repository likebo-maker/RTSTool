$ErrorActionPreference = 'Stop'

try {
    $Utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [Console]::OutputEncoding = $Utf8NoBom
    $OutputEncoding = $Utf8NoBom
} catch {
    # ignore console encoding setup errors
}

function Write-Info($Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Err($Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Invoke-NativeStep($Description, [scriptblock]$Command) {
    Write-Info $Description
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed with exit code $LASTEXITCODE"
    }
}

function Get-CompatiblePython($CommandName, [string[]]$PrefixArgs) {
    if (!(Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        return $null
    }

    $Probe = "import sys; print(sys.executable); print(f'{sys.version_info.major}.{sys.version_info.minor}')"
    $Output = $null
    try {
        $Output = & $CommandName @PrefixArgs -c $Probe 2>&1
    } catch {
        Write-Info "Python probe failed for $CommandName $($PrefixArgs -join ' '): $($_.Exception.Message)"
        return $null
    }

    if ($LASTEXITCODE -ne 0 -or !$Output -or $Output.Count -lt 2) {
        $ProbeError = ($Output | Out-String).Trim()
        if ($ProbeError) {
            Write-Info "Python probe skipped for $CommandName $($PrefixArgs -join ' '): $ProbeError"
        }
        return $null
    }

    $ExePath = [string]$Output[0]
    $Version = [string]$Output[1]
    if ($Version -eq '3.12' -or $Version -eq '3.11') {
        return @{
            Exe = $ExePath
            Version = $Version
            Source = "$CommandName $($PrefixArgs -join ' ')".Trim()
        }
    }

    Write-Info "Skipping Python $Version from $CommandName $($PrefixArgs -join ' '). Use Python 3.11 or 3.12 for this build."
    return $null
}

function Get-CompatiblePythonFromPyList() {
    if (!(Get-Command py -ErrorAction SilentlyContinue)) {
        return $null
    }

    $ListOutput = $null
    try {
        $ListOutput = & py -0p 2>&1
    } catch {
        Write-Info "Could not list Python runtimes with py -0p: $($_.Exception.Message)"
        return $null
    }

    if ($LASTEXITCODE -ne 0 -or !$ListOutput) {
        $ListError = ($ListOutput | Out-String).Trim()
        if ($ListError) {
            Write-Info "py -0p failed: $ListError"
        }
        return $null
    }

    foreach ($WantedVersion in @('3.12', '3.11')) {
        foreach ($Line in $ListOutput) {
            $Text = [string]$Line
            if ($Text -notmatch $WantedVersion) {
                continue
            }
            if ($Text -match '([A-Za-z]:\\.*python(?:\.exe)?)\s*$') {
                $PythonPath = $Matches[1]
                if (Test-Path $PythonPath) {
                    Write-Info "Found Python $WantedVersion from py -0p: $PythonPath"
                    return Get-CompatiblePython $PythonPath @()
                }
            }
        }
    }

    Write-Info "py -0p did not contain Python 3.12 or 3.11."
    return $null
}

$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$FrontendDist = Join-Path $Root 'frontend\dist'
$BuildDir = Join-Path $Root '.build\windows'
$LogFile = Join-Path $BuildDir 'build.log'
$SafeBuildRoot = Join-Path $env:LOCALAPPDATA 'RTS_Toolbox_Build'
$PyInstallerWork = Join-Path $SafeBuildRoot 'pyinstaller_work'
$PyInstallerSpec = Join-Path $SafeBuildRoot 'pyinstaller_spec'
$Launcher = Join-Path $PSScriptRoot 'launcher.py'
$ExeName = 'RTS_Toolbox'

New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
New-Item -ItemType Directory -Force -Path $SafeBuildRoot | Out-Null

try {
    try {
        Start-Transcript -Path $LogFile -Force | Out-Null
    } catch {
        # ignore transcript errors
    }

    Write-Info "Project root: $Root"
    Write-Info "Log file: $LogFile"
    Write-Info "Build cache: $SafeBuildRoot"

    if (!(Test-Path (Join-Path $FrontendDist 'index.html'))) {
        Write-Info 'frontend/dist not found. Building frontend...'
        Push-Location (Join-Path $Root 'frontend')
        try {
            if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
                throw 'npm was not found. Please install Node.js LTS and run this script again.'
            }
            Invoke-NativeStep 'Running npm install...' { npm install }
            Invoke-NativeStep 'Running npm run build...' { npm run build }
        } finally {
            Pop-Location
        }
    }

    $Candidate = Get-CompatiblePython 'py' @('-3.12')
    if ($null -eq $Candidate) {
        $Candidate = Get-CompatiblePython 'py' @('-3.11')
    }
    if ($null -eq $Candidate) {
        $Candidate = Get-CompatiblePythonFromPyList
    }
    if ($null -eq $Candidate) {
        $Candidate = Get-CompatiblePython 'python' @()
    }
    if ($null -eq $Candidate) {
        throw 'Compatible Python was not found. Install Python 3.12 or 3.11 from python.org, then run this script again. You can run "py -0p" to list installed Python versions. Python 3.13/3.14 is not supported for this packaged build.'
    }

    $BasePython = $Candidate.Exe
    $VenvDir = Join-Path $SafeBuildRoot ".venv-py$($Candidate.Version)"
    Write-Info "Using Python $($Candidate.Version): $BasePython"

    if (!(Test-Path $VenvDir)) {
        Write-Info "Creating virtual environment: $VenvDir"
        Invoke-NativeStep 'Creating virtual environment...' { & $BasePython -m venv $VenvDir }
    }

    $Python = Join-Path $VenvDir 'Scripts\python.exe'
    if (!(Test-Path $Python)) {
        throw "Python executable does not exist in venv: $Python"
    }

    Invoke-NativeStep 'Checking virtual environment Python version...' {
        & $Python -c "import sys; print('venv python:', sys.version)"
    }

    $env:PYTHONUTF8 = '1'
    $env:PIP_DISABLE_PIP_VERSION_CHECK = '1'
    $env:PIP_ONLY_BINARY = ':all:'

    Invoke-NativeStep 'Upgrading pip...' { & $Python -m pip install --upgrade pip --only-binary=:all: }

    Invoke-NativeStep 'Installing backend dependencies and PyInstaller...' {
        & $Python -m pip install --only-binary=:all: -r (Join-Path $Root 'backend\requirements.txt') pyinstaller
    }

    Invoke-NativeStep 'Running PyInstaller...' {
        & $Python -m PyInstaller `
            --noconfirm `
            --clean `
            --onefile `
            --noconsole `
            --name $ExeName `
            --distpath (Join-Path $Root 'dist') `
            --workpath $PyInstallerWork `
            --specpath $PyInstallerSpec `
            --paths $Root `
            --add-data "$FrontendDist;frontend/dist" `
            --hidden-import python_multipart `
            --hidden-import multipart `
            --hidden-import fastapi `
            --hidden-import starlette `
            --hidden-import uvicorn `
            --hidden-import pandas `
            --hidden-import openpyxl `
            $Launcher
    }

    $FinalExe = Join-Path (Join-Path $Root 'dist') "$ExeName.exe"
    if (!(Test-Path $FinalExe)) {
        throw "Expected exe was not created: $FinalExe"
    }

    Write-Host ''
    Write-Info "Build completed. Output: $FinalExe"
} catch {
    Write-Err $_.Exception.Message
    if ($_.ScriptStackTrace) {
        Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
    }
    exit 1
} finally {
    try {
        Stop-Transcript | Out-Null
    } catch {
        # ignore
    }
}

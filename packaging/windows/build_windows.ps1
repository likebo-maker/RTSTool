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

function Get-NpmCommand() {
    foreach ($Name in @('npm.cmd', 'npm')) {
        $Command = Get-Command $Name -ErrorAction SilentlyContinue
        if ($Command) {
            return $Command.Source
        }
    }
    return $null
}

function Invoke-NpmCommand($Description, [string[]]$Arguments, [string]$WorkingDir) {
    $NpmCommand = Get-NpmCommand
    if ($null -eq $NpmCommand) {
        throw 'npm was not found. Please install Node.js LTS and run this script again.'
    }

    Invoke-NativeStep $Description {
        Push-Location $WorkingDir
        try {
            & $NpmCommand @Arguments
        } finally {
            Pop-Location
        }
    }
}

function Remove-PathIfExists([string]$TargetPath) {
    if (Test-Path $TargetPath) {
        Remove-Item -Recurse -Force $TargetPath
    }
}

function Repair-FrontendNpmRc([string]$FrontendDir) {
    $NpmRcPath = Join-Path $FrontendDir '.npmrc'
    if (!(Test-Path $NpmRcPath)) {
        return
    }

    try {
        $Content = Get-Content $NpmRcPath -Raw -Encoding UTF8
        $Updated = $Content `
            -replace 'registry\.npmmiroor\.com', 'registry.npmmirror.com' `
            -replace 'registry\.npmmiroor\.com', 'registry.npmmirror.com'
        if ($Updated -ne $Content) {
            Write-Info "Fixing typo in frontend/.npmrc: $NpmRcPath"
            Set-Content -Path $NpmRcPath -Value $Updated -Encoding UTF8
        }
    } catch {
        Write-Info "Could not inspect frontend/.npmrc: $($_.Exception.Message)"
    }
}

function Get-CompatiblePython($CommandName, [string[]]$PrefixArgs) {
    if (!(Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        return $null
    }

    $Probe = "import sys; print(sys.executable); print(f'{sys.version_info.major}.{sys.version_info.minor}'); print(sys.version_info.releaselevel)"
    $Output = $null
    try {
        $Output = & $CommandName @PrefixArgs -c $Probe 2>&1
    } catch {
        Write-Info "Python probe failed for $CommandName $($PrefixArgs -join ' '): $($_.Exception.Message)"
        return $null
    }

    if ($LASTEXITCODE -ne 0 -or !$Output -or $Output.Count -lt 3) {
        $ProbeError = ($Output | Out-String).Trim()
        if ($ProbeError) {
            Write-Info "Python probe skipped for $CommandName $($PrefixArgs -join ' '): $ProbeError"
        }
        return $null
    }

    $ExePath = [string]$Output[0]
    $Version = [string]$Output[1]
    $ReleaseLevel = [string]$Output[2]
    if (($Version -eq '3.12' -or $Version -eq '3.11') -and $ReleaseLevel -eq 'final') {
        return @{
            Exe = $ExePath
            Version = $Version
            Source = "$CommandName $($PrefixArgs -join ' ')".Trim()
        }
    }

    Write-Info "Skipping Python $Version ($ReleaseLevel) from $CommandName $($PrefixArgs -join ' '). Use a final release of Python 3.11 or 3.12 for this build."
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
$LicenseGeneratorScript = Join-Path $Root 'tools\license_generator_gui.py'
$LicenseGeneratorExeName = 'RTS_License_Generator'
$NpmCacheDir = Join-Path $SafeBuildRoot 'npm-cache'
$RootRequirements = Join-Path $Root 'requirements.txt'
$BackendRequirements = Join-Path $Root 'backend\requirements.txt'

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
        $FrontendDir = Join-Path $Root 'frontend'
        $FrontendNodeModules = Join-Path $FrontendDir 'node_modules'
        $FrontendLockfile = Join-Path $FrontendDir 'package-lock.json'

        New-Item -ItemType Directory -Force -Path $NpmCacheDir | Out-Null
        $env:npm_config_cache = $NpmCacheDir
        $env:npm_config_fund = 'false'
        $env:npm_config_audit = 'false'
        $env:npm_config_progress = 'false'
        $env:npm_config_update_notifier = 'false'
        $env:npm_config_registry = 'https://registry.npmmirror.com/'

        Repair-FrontendNpmRc $FrontendDir

        $InstallSucceeded = $false
        try {
            if (Test-Path $FrontendLockfile) {
                Invoke-NpmCommand 'Running npm ci...' @('ci', '--no-audit', '--no-fund', '--registry', 'https://registry.npmmirror.com/') $FrontendDir
            } else {
                Invoke-NpmCommand 'Running npm install...' @('install', '--no-audit', '--no-fund', '--registry', 'https://registry.npmmirror.com/') $FrontendDir
            }
            $InstallSucceeded = $true
        } catch {
            Write-Info "Initial npm dependency install failed: $($_.Exception.Message)"
            Write-Info 'Cleaning npm cache and retrying with npm install...'
            try {
                Invoke-NpmCommand 'Running npm cache clean...' @('cache', 'clean', '--force', '--registry', 'https://registry.npmmirror.com/') $FrontendDir
            } catch {
                Write-Info "npm cache clean failed: $($_.Exception.Message)"
            }
            Remove-PathIfExists $FrontendNodeModules
            Invoke-NpmCommand 'Retrying npm install...' @('install', '--no-audit', '--no-fund', '--prefer-offline', '--registry', 'https://registry.npmmirror.com/') $FrontendDir
            $InstallSucceeded = $true
        }

        if (-not $InstallSucceeded) {
            throw 'Frontend dependency installation failed.'
        }

        Invoke-NpmCommand 'Running npm run build...' @('run', 'build', '--registry', 'https://registry.npmmirror.com/') $FrontendDir
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
        throw 'Compatible Python was not found. Install a final release of Python 3.12 or 3.11 from python.org, then run this script again. You can run "py -0p" to list installed Python versions. Python 3.13/3.14 and pre-release builds such as 3.12 beta are not supported for this packaged build.'
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

    if (Test-Path $RootRequirements) {
        $RequirementsFile = $RootRequirements
        $NeedsPyInstallerInstall = $false
    } else {
        $RequirementsFile = $BackendRequirements
        $NeedsPyInstallerInstall = $true
    }

    Write-Info "Requirements file: $RequirementsFile"
    Invoke-NativeStep 'Installing Python dependencies...' {
        & $Python -m pip install --only-binary=:all: -r $RequirementsFile
    }

    Invoke-NativeStep 'Verifying Python dependencies...' {
        & $Python -c "import fastapi, uvicorn, h11, multipart, pandas, openpyxl, cryptography, PyInstaller; print('dependency verification ok')"
    }

    if ($NeedsPyInstallerInstall) {
        Invoke-NativeStep 'Installing PyInstaller...' {
            & $Python -m pip install --only-binary=:all: pyinstaller
        }
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
            --hidden-import uvicorn.protocols.http.h11_impl `
            --hidden-import h11 `
            --hidden-import pandas `
            --hidden-import openpyxl `
            --collect-all cryptography `
            $Launcher
    }

    Invoke-NativeStep 'Running PyInstaller for license generator...' {
        & $Python -m PyInstaller `
            --noconfirm `
            --clean `
            --onefile `
            --windowed `
            --name $LicenseGeneratorExeName `
            --distpath (Join-Path $Root 'dist') `
            --workpath (Join-Path $PyInstallerWork 'license_generator') `
            --specpath (Join-Path $PyInstallerSpec 'license_generator') `
            --paths $Root `
            --hidden-import cryptography `
            --collect-all cryptography `
            $LicenseGeneratorScript
    }

    $FinalExe = Join-Path (Join-Path $Root 'dist') "$ExeName.exe"
    if (!(Test-Path $FinalExe)) {
        throw "Expected exe was not created: $FinalExe"
    }

    $LicenseGeneratorExe = Join-Path (Join-Path $Root 'dist') "$LicenseGeneratorExeName.exe"
    if (!(Test-Path $LicenseGeneratorExe)) {
        throw "Expected license generator exe was not created: $LicenseGeneratorExe"
    }

    Write-Host ''
    Write-Info "Build completed. Output: $FinalExe"
    Write-Info "License generator: $LicenseGeneratorExe"
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

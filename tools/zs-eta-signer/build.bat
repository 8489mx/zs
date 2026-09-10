@echo off
setlocal
title ZS Local ETA Signer Bridge - Compiler
echo ============================================================
echo   Compiling ZS Local ETA Signer Bridge (Windows Microservice)
echo ============================================================
echo.

set CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe

if not exist "%CSC%" (
    set CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe
)

if not exist "%CSC%" (
    echo [ERROR] .NET Framework C# Compiler (csc.exe) was not found on this machine.
    pause
    exit /b 1
)

echo Using compiler: %CSC%
"%CSC%" /nologo /target:exe /optimize+ /r:System.dll /r:System.Security.dll /r:System.Web.Extensions.dll /out:zs-eta-signer.exe Program.cs

if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================================
    echo   BUILD SUCCESSFUL: zs-eta-signer.exe created!
    echo ============================================================
    echo   You can run it now by double-clicking zs-eta-signer.exe
    echo   It will listen on http://127.0.0.1:8585
) else (
    echo.
    echo [ERROR] Compilation failed.
)

echo.
pause

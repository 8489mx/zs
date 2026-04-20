; Inno Setup Script - ZS Offline
; Build with:
;   ISCC.exe installer\windows\zs-offline.iss

#ifndef MyAppName
  #define MyAppName "ZS Offline"
#endif
#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif
#ifndef MyAppPublisher
  #define MyAppPublisher "ZS"
#endif
#ifndef MyAppExeName
  #define MyAppExeName "windows\\Start-ZS.bat"
#endif
#ifndef MyAppStopName
  #define MyAppStopName "windows\\Stop-ZS.bat"
#endif

[Setup]
AppId={{E1FC2440-FA24-4A75-BEF7-792C2068A52E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
PrivilegesRequired=admin
DefaultDirName={autopf}\ZS Offline
DefaultGroupName=ZS Offline
DisableProgramGroupPage=yes
OutputDir=..\..\release
OutputBaseFilename=zs-offline-installer-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create Desktop shortcuts"; GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
; Core runtime files required by offline flow.
Source: "..\..\docker-compose.offline.yml"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\.env.offline.example"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist
Source: "..\..\MODE_CONTRACT.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\OFFLINE_DEPLOYMENT_RUNBOOK.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\windows\*"; DestDir: "{app}\windows"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\scripts\offline\*"; DestDir: "{app}\scripts\offline"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\deploy\nginx\*"; DestDir: "{app}\deploy\nginx"; Flags: ignoreversion recursesubdirs createallsubdirs

; Runtime source directories (needed because offline stack builds images locally).
Source: "..\..\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "node_modules\*;.env;dist\*;tmp\*"
Source: "..\..\frontend\*"; DestDir: "{app}\frontend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "node_modules\*;dist\*"

[Icons]
Name: "{group}\Start ZS Offline"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\Stop ZS Offline"; Filename: "{app}\{#MyAppStopName}"; WorkingDir: "{app}"
Name: "{autodesktop}\Start ZS Offline"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{autodesktop}\Stop ZS Offline"; Filename: "{app}\{#MyAppStopName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Start ZS Offline now"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: files; Name: "{app}\.env.offline"

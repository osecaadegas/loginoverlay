; Optional Windows installer recipe. Build using Inno Setup 6 on Windows.
; This installer script and its resulting executable are NOT code signed.
#define AppName "SC Web Transitions"
#define AppVersion "3.14.0 Raymarched Gas RC1"
[Setup]
AppId={{76D75B12-5E8F-44F3-A604-69768D8ED87A}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\SC Web Transitions
DefaultGroupName=SC Web Transitions
OutputBaseFilename=SC_Web_Transitions_v3.14.0_Raymarched_Gas_Setup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=lowest
CloseApplications=yes
RestartApplications=no
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\SC Web Transitions.exe
[Files]
Source: "SC_Web_Transitions_v3.14.0_Raymarched_Gas_RC1.exe"; DestDir: "{app}"; DestName: "SC Web Transitions.exe"; Flags: ignoreversion
[Icons]
Name: "{autoprograms}\SC Web Transitions"; Filename: "{app}\SC Web Transitions.exe"; Parameters: "--run"
Name: "{autodesktop}\SC Web Transitions"; Filename: "{app}\SC Web Transitions.exe"; Parameters: "--run"
[Run]
Filename: "{app}\SC Web Transitions.exe"; Parameters: "--run"; Description: "Launch SC Web Transitions"; Flags: nowait postinstall skipifsilent
[UninstallDelete]
Type: files; Name: "{app}\SC Web Transitions.exe.previous.exe"
Type: files; Name: "{app}\SC Web Transitions.exe.failed.exe"

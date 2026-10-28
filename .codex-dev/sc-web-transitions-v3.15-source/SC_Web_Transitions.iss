; Optional Windows installer recipe. Build using Inno Setup 6 on Windows.
; This installer script and its resulting executable are NOT code signed.
#define AppName "SC Web Transitions"
#define AppVersion "3.18.0"
#ifndef ReleaseDir
  #define ReleaseDir SourcePath
#endif
[Setup]
AppId={{76D75B12-5E8F-44F3-A604-69768D8ED87A}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\SC Web Transitions
DefaultGroupName=SC Web Transitions
OutputBaseFilename=SC_Web_Transitions_v3.18.0_Cinematic_GPU_Setup
OutputDir={#ReleaseDir}
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
; Never let Restart Manager kill an active camera transition.
CloseApplications=no
RestartApplications=no
DisableProgramGroupPage=yes
SetupIconFile=sc.ico
UninstallDisplayIcon={app}\SC Web Transitions.exe
[Files]
Source: "{#ReleaseDir}\SC_Web_Transitions_v3.18.0_Cinematic_GPU.exe"; DestDir: "{app}"; DestName: "SC Web Transitions.exe"; Flags: ignoreversion; BeforeInstall: BackupExecutable
Source: "sc.ico"; DestDir: "{app}"; DestName: "SC Web Transitions.ico"; Flags: ignoreversion
[Icons]
Name: "{autoprograms}\SC Web Transitions"; Filename: "{app}\SC Web Transitions.exe"; Parameters: "--run"
Name: "{autodesktop}\SC Web Transitions"; Filename: "{app}\SC Web Transitions.exe"; Parameters: "--run"
[Run]
Filename: "{app}\SC Web Transitions.exe"; Parameters: "--run"; Description: "Launch SC Web Transitions"; Flags: nowait postinstall skipifsilent
[UninstallDelete]
Type: files; Name: "{app}\SC Web Transitions.exe.previous.exe"
Type: files; Name: "{app}\SC Web Transitions.exe.failed.exe"

[Code]
function EngineResponds: Boolean;
var Request: Variant;
begin
  Result := False;
  try
    Request := CreateOleObject('WinHttp.WinHttpRequest.5.1');
    Request.SetTimeouts(500, 500, 500, 1000);
    Request.Open('GET', 'http://127.0.0.1:18767/health', False);
    Request.Send;
    Result := Request.Status > 0;
  except
    { A closed engine has no listener. Do not authenticate or mutate OBS here. }
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  if EngineResponds then
    Result := 'SC Web Transitions is still running. Use Quit in its Help page to recover the camera and stop the engine safely, then retry. Setup will not force-close a transition.';
end;

function InitializeUninstall: Boolean;
begin
  Result := not EngineResponds;
  if not Result then
    MsgBox('Use Quit in SC Web Transitions before uninstalling. The camera must be recovered before the engine is stopped.', mbError, MB_OK);
end;

procedure BackupExecutable;
var CurrentFile: String;
begin
  CurrentFile := ExpandConstant('{app}\SC Web Transitions.exe');
  if FileExists(CurrentFile) then
    if not FileCopy(CurrentFile, CurrentFile + '.previous.exe', False) then
      RaiseException('Cannot back up the installed executable. Close the application safely and retry.');
end;

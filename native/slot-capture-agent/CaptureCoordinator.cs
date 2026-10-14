using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;

namespace StreamersCenter.SlotCapture.Agent;

internal sealed class CaptureCoordinator(LocalOutputServer output) : IDisposable
{
    private readonly ConcurrentDictionary<string, CaptureRegistration> _captures = new();
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _loops = new();

    public Task RegisterAsync(JsonElement selection, CancellationToken cancellationToken)
    {
        var captureId = selection.GetProperty("captureId").GetString() ?? throw new InvalidDataException("captureId em falta.");
        var pageTitle = selection.TryGetProperty("pageTitle", out var titleNode) ? titleNode.GetString() : null;
        var window = NativeMethods.FindApprovedBrowserWindow(pageTitle);
        if (window == IntPtr.Zero) throw new InvalidOperationException("Não foi encontrada uma única janela Chrome/Edge correspondente. Mantenha o separador selecionado visível e tente novamente.");
        NativeMethods.GetWindowThreadProcessId(window, out var processId);
        var processName = Process.GetProcessById(checked((int)processId)).ProcessName;
        var registration = CaptureRegistration.FromSelection(selection.Clone(), window, processName);
        _captures[captureId] = registration;
        return Task.CompletedTask;
    }

    public void BindProfile(JsonElement payload)
    {
        var captureId = payload.GetProperty("captureId").GetString() ?? throw new InvalidDataException("captureId em falta.");
        var profileId = payload.GetProperty("profileId").GetString() ?? throw new InvalidDataException("profileId em falta.");
        if (!_captures.TryGetValue(captureId, out var registration)) throw new KeyNotFoundException("A seleção já não está disponível. Selecione novamente.");
        registration.ProfileId = profileId;
        registration.OutputWidth = Math.Clamp(payload.GetProperty("outputWidth").GetInt32(), 160, 3840);
        registration.OutputHeight = Math.Clamp(payload.GetProperty("outputHeight").GetInt32(), 90, 2160);
        registration.Fps = Math.Clamp(payload.GetProperty("fps").GetInt32(), 15, 60);
        _loops.AddOrUpdate(profileId, _ => StartLoop(registration), (_, existing) => { existing.Cancel(); existing.Dispose(); return StartLoop(registration); });
    }

    public void UpdateGeometry(JsonElement payload)
    {
        var candidateId = payload.GetProperty("candidateId").GetString();
        var registration = _captures.Values.FirstOrDefault(item => item.CandidateId == candidateId);
        if (registration is not null) registration.Selection = payload.Clone();
    }
    public void UpdateVisibility(int tabId, bool hidden) { foreach (var item in _captures.Values.Where(item => item.TabId == tabId)) item.IsHidden = hidden; }
    public void MarkDisconnected(int tabId) { foreach (var item in _captures.Values.Where(item => item.TabId == tabId)) item.IsDisconnected = true; }
    public void Stop(string profileId) { if (_loops.TryRemove(profileId, out var loop)) { loop.Cancel(); loop.Dispose(); } }
    public object[] GetStatus() => _captures.Values.Select(item => (object)new { item.ProfileId, item.CaptureId, item.IsHidden, item.IsDisconnected, item.Frames, item.DroppedFrames }).ToArray();

    private CancellationTokenSource StartLoop(CaptureRegistration registration)
    {
        var cancellation = new CancellationTokenSource();
        _ = Task.Run(async () =>
        {
            var interval = TimeSpan.FromSeconds(1d / registration.Fps);
            while (!cancellation.IsCancellationRequested)
            {
                var started = Stopwatch.GetTimestamp();
                try
                {
                    if (!registration.IsHidden && !registration.IsDisconnected)
                    {
                        using var windowFrame = GdiCaptureBackend.Capture(registration.WindowHandle);
                        using var cropped = windowFrame.Crop(registration.Selection, registration.OutputWidth, registration.OutputHeight);
                        await output.BroadcastAsync(registration.ProfileId!, cropped, cancellation.Token);
                        registration.Frames++;
                    }
                }
                catch (Exception error)
                {
                    registration.DroppedFrames++;
                    Console.Error.WriteLine(error);
                }
                var elapsed = Stopwatch.GetElapsedTime(started);
                if (elapsed < interval) await Task.Delay(interval - elapsed, cancellation.Token);
            }
        }, cancellation.Token);
        return cancellation;
    }

    public void Dispose() { foreach (var loop in _loops.Values) { loop.Cancel(); loop.Dispose(); } }
}

internal sealed class CaptureRegistration
{
    public required string CaptureId { get; init; }
    public required string CandidateId { get; init; }
    public required int TabId { get; init; }
    public required IntPtr WindowHandle { get; init; }
    public required string ProcessName { get; init; }
    public required JsonElement Selection { get; set; }
    public string? ProfileId { get; set; }
    public int OutputWidth { get; set; } = 1920;
    public int OutputHeight { get; set; } = 1080;
    public int Fps { get; set; } = 30;
    public bool IsHidden { get; set; }
    public bool IsDisconnected { get; set; }
    public long Frames { get; set; }
    public long DroppedFrames { get; set; }
    public static CaptureRegistration FromSelection(JsonElement selection, IntPtr window, string process) => new()
    {
        CaptureId = selection.GetProperty("captureId").GetString()!, CandidateId = selection.GetProperty("candidateId").GetString()!,
        TabId = selection.GetProperty("tabId").GetInt32(), WindowHandle = window, ProcessName = process, Selection = selection,
    };
}

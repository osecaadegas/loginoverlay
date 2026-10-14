using System.Buffers.Binary;
using System.Collections.Concurrent;
using System.Net;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;

namespace StreamersCenter.SlotCapture.Agent;

internal sealed class LocalOutputServer(int port) : IDisposable
{
    private readonly HttpListener _listener = new();
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, WebSocket>> _clients = new();
    private readonly string _token = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
    private long _sequence;
    public object Status => new { connected = true, previewBaseUrl = $"http://127.0.0.1:{port}/preview", obsBaseUrl = $"http://127.0.0.1:{port}/obs", sessionToken = _token, transport = "loopback_websocket", nativeBackend = "gdi_visible_window" };

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
        _listener.Start();
        _ = Task.Run(() => AcceptLoopAsync(cancellationToken), cancellationToken);
        await Task.CompletedTask;
    }

    private async Task AcceptLoopAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            HttpListenerContext context;
            try { context = await _listener.GetContextAsync().WaitAsync(cancellationToken); }
            catch (OperationCanceledException) { break; }
            _ = Task.Run(() => HandleAsync(context, cancellationToken), cancellationToken);
        }
    }

    private async Task HandleAsync(HttpListenerContext context, CancellationToken cancellationToken)
    {
        try
        {
            if (!string.Equals(context.Request.QueryString["token"], _token, StringComparison.Ordinal)) { context.Response.StatusCode = 403; context.Response.Close(); return; }
            var segments = context.Request.Url?.AbsolutePath.Trim('/').Split('/') ?? [];
            if (segments.Length != 2) { context.Response.StatusCode = 404; context.Response.Close(); return; }
            var kind = segments[0]; var profileId = segments[1];
            if (kind == "frames" && context.Request.IsWebSocketRequest)
            {
                var socket = (await context.AcceptWebSocketAsync(null)).WebSocket;
                var id = Guid.NewGuid(); var set = _clients.GetOrAdd(profileId, _ => new()); set[id] = socket;
                try { while (socket.State == WebSocketState.Open) { var buffer = new byte[32]; var result = await socket.ReceiveAsync(buffer, cancellationToken); if (result.MessageType == WebSocketMessageType.Close) break; } }
                finally { set.TryRemove(id, out _); if (socket.State == WebSocketState.Open) await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "fim", CancellationToken.None); socket.Dispose(); }
                return;
            }
            if (kind is "preview" or "obs")
            {
                var html = BuildPlayerHtml(profileId, kind == "obs");
                var bytes = Encoding.UTF8.GetBytes(html);
                context.Response.ContentType = "text/html; charset=utf-8";
                context.Response.Headers["Cache-Control"] = "no-store";
                context.Response.ContentLength64 = bytes.Length;
                await context.Response.OutputStream.WriteAsync(bytes, cancellationToken);
                context.Response.Close();
                return;
            }
            context.Response.StatusCode = 404; context.Response.Close();
        }
        catch (Exception error) { Console.Error.WriteLine(error); if (context.Response.OutputStream.CanWrite) { context.Response.StatusCode = 500; context.Response.Close(); } }
    }

    public async Task BroadcastAsync(string profileId, RawFrame frame, CancellationToken cancellationToken)
    {
        if (!_clients.TryGetValue(profileId, out var clients) || clients.IsEmpty) return;
        var payload = new byte[12 + frame.Pixels.Length];
        BinaryPrimitives.WriteInt32LittleEndian(payload.AsSpan(0, 4), frame.Width);
        BinaryPrimitives.WriteInt32LittleEndian(payload.AsSpan(4, 4), frame.Height);
        BinaryPrimitives.WriteInt32LittleEndian(payload.AsSpan(8, 4), checked((int)Interlocked.Increment(ref _sequence)));
        Buffer.BlockCopy(frame.Pixels, 0, payload, 12, frame.Pixels.Length);
        foreach (var (id, socket) in clients)
        {
            try { if (socket.State == WebSocketState.Open) await socket.SendAsync(payload, WebSocketMessageType.Binary, true, cancellationToken); else clients.TryRemove(id, out _); }
            catch { clients.TryRemove(id, out _); }
        }
    }

    private string BuildPlayerHtml(string profileId, bool obs) => $$"""
<!doctype html><html><head><meta charset="utf-8"><style>html,body,canvas{width:100%;height:100%;margin:0;overflow:hidden;background:transparent}canvas{object-fit:contain}</style></head><body><canvas></canvas><script>
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
const socket=new WebSocket(`ws://127.0.0.1:{{port}}/frames/{{profileId}}?token={{_token}}`);socket.binaryType='arraybuffer';
socket.onmessage=event=>{const view=new DataView(event.data),w=view.getInt32(0,true),h=view.getInt32(4,true),src=new Uint8Array(event.data,12);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}const image=ctx.createImageData(w,h),dst=image.data;for(let i=0;i<src.length;i+=4){dst[i]=src[i+2];dst[i+1]=src[i+1];dst[i+2]=src[i];dst[i+3]=255}ctx.putImageData(image,0,0)};
socket.onclose=()=>document.body.dataset.disconnected='true';
</script></body></html>
""";
    public void Dispose() { _listener.Close(); foreach (var socket in _clients.Values.SelectMany(set => set.Values)) socket.Dispose(); }
}

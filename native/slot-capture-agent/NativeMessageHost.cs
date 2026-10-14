using System.Buffers.Binary;
using System.Text.Json;

namespace StreamersCenter.SlotCapture.Agent;

internal sealed class NativeMessageHost(Stream input, Stream output, CaptureCoordinator coordinator, LocalOutputServer localOutput)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly SemaphoreSlim _writeLock = new(1, 1);

    public async Task RunAsync(CancellationToken cancellationToken)
    {
        await SendAsync(new { type = "agent:hello", version = "0.1.0", status = localOutput.Status }, cancellationToken);
        var lengthBytes = new byte[4];
        while (!cancellationToken.IsCancellationRequested)
        {
            if (!await ReadExactlyAsync(input, lengthBytes, cancellationToken)) break;
            var length = BinaryPrimitives.ReadUInt32LittleEndian(lengthBytes);
            if (length is 0 or > 64 * 1024 * 1024) throw new InvalidDataException("Mensagem nativa inválida.");
            var payload = new byte[length];
            if (!await ReadExactlyAsync(input, payload, cancellationToken)) break;
            try
            {
                using var document = JsonDocument.Parse(payload);
                await HandleAsync(document.RootElement, cancellationToken);
            }
            catch (Exception error)
            {
                Console.Error.WriteLine(error);
                await SendAsync(new { type = "agent:error", error = error.Message }, cancellationToken);
            }
        }
    }

    private async Task HandleAsync(JsonElement message, CancellationToken cancellationToken)
    {
        var type = message.TryGetProperty("type", out var typeNode) ? typeNode.GetString() : null;
        switch (type)
        {
            case "extension:hello":
                await SendAsync(new { type = "agent:status", version = "0.1.0", status = localOutput.Status }, cancellationToken);
                break;
            case "capture:register":
                await coordinator.RegisterAsync(message.GetProperty("selection"), cancellationToken);
                await SendAsync(new { type = "capture:registered", captureId = message.GetProperty("selection").GetProperty("captureId").GetString() }, cancellationToken);
                break;
            case "capture:geometry":
                coordinator.UpdateGeometry(message.GetProperty("payload"));
                break;
            case "capture:visibility":
                coordinator.UpdateVisibility(message.GetProperty("tabId").GetInt32(), message.GetProperty("payload").GetProperty("hidden").GetBoolean());
                break;
            case "capture:disconnected":
                coordinator.MarkDisconnected(message.GetProperty("tabId").GetInt32());
                break;
            case "capture:tab-closed":
                coordinator.MarkDisconnected(message.GetProperty("tabId").GetInt32());
                break;
            case "dashboard:command":
                await HandleDashboardCommandAsync(message, cancellationToken);
                break;
        }
    }

    private async Task HandleDashboardCommandAsync(JsonElement message, CancellationToken cancellationToken)
    {
        var command = message.GetProperty("command").GetString();
        var payload = message.TryGetProperty("payload", out var value) ? value : default;
        switch (command)
        {
            case "bind-profile":
                coordinator.BindProfile(payload);
                await SendAsync(new { type = "capture:bound", profileId = payload.GetProperty("profileId").GetString() }, cancellationToken);
                break;
            case "stop":
                coordinator.Stop(payload.GetProperty("profileId").GetString()!);
                break;
            case "status":
                await SendAsync(new { type = "agent:status", version = "0.1.0", status = localOutput.Status, captures = coordinator.GetStatus() }, cancellationToken);
                break;
        }
    }

    private async Task SendAsync<T>(T value, CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.SerializeToUtf8Bytes(value, JsonOptions);
        var length = new byte[4];
        BinaryPrimitives.WriteUInt32LittleEndian(length, checked((uint)payload.Length));
        await _writeLock.WaitAsync(cancellationToken);
        try
        {
            await output.WriteAsync(length, cancellationToken);
            await output.WriteAsync(payload, cancellationToken);
            await output.FlushAsync(cancellationToken);
        }
        finally { _writeLock.Release(); }
    }

    private static async Task<bool> ReadExactlyAsync(Stream stream, byte[] buffer, CancellationToken cancellationToken)
    {
        var offset = 0;
        while (offset < buffer.Length)
        {
            var read = await stream.ReadAsync(buffer.AsMemory(offset), cancellationToken);
            if (read == 0) return false;
            offset += read;
        }
        return true;
    }
}

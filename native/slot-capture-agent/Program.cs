using StreamersCenter.SlotCapture.Agent;

Console.SetError(new StreamWriter(Console.OpenStandardError()) { AutoFlush = true });
if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException("Slot Capture requer Windows 10 1903 ou posterior.");

using var cancellation = new CancellationTokenSource();
Console.CancelKeyPress += (_, eventArgs) => { eventArgs.Cancel = true; cancellation.Cancel(); };
var output = new LocalOutputServer(19384);
var coordinator = new CaptureCoordinator(output);
var host = new NativeMessageHost(Console.OpenStandardInput(), Console.OpenStandardOutput(), coordinator, output);
await output.StartAsync(cancellation.Token);
await host.RunAsync(cancellation.Token);

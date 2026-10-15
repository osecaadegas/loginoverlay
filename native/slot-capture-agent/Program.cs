using System.Diagnostics;
using System.Runtime.InteropServices;

namespace StreamersCenter.SlotCapture.Agent;

internal static class Program
{
    [STAThread]
    private static async Task Main(string[] args)
    {
        if (!OperatingSystem.IsWindows())
            throw new PlatformNotSupportedException("Slot Capture requer Windows 10 1903 ou posterior.");

        var executableName = Path.GetFileNameWithoutExtension(Environment.ProcessPath ?? string.Empty);
        var nativeHostMode = args.Contains("--native-host", StringComparer.OrdinalIgnoreCase)
            || executableName.Contains("native-host", StringComparison.OrdinalIgnoreCase);
        if (!nativeHostMode)
        {
            FreeConsole();
            ApplicationConfiguration.Initialize();
            Application.Run(new InstallerForm());
            return;
        }

        Console.SetError(new StreamWriter(Console.OpenStandardError()) { AutoFlush = true });
        using var cancellation = new CancellationTokenSource();
        var output = new LocalOutputServer(19384);
        var coordinator = new CaptureCoordinator(output);
        var host = new NativeMessageHost(Console.OpenStandardInput(), Console.OpenStandardOutput(), coordinator, output);
        await output.StartAsync(cancellation.Token);
        await host.RunAsync(cancellation.Token);
    }

    [DllImport("kernel32.dll")]
    private static extern bool FreeConsole();

}

using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Text;
using System.Text.Json;

namespace StreamersCenter.SlotCapture.Agent;

internal sealed class RawFrame(int width, int height, byte[] pixels) : IDisposable
{
    public int Width { get; } = width;
    public int Height { get; } = height;
    public byte[] Pixels { get; } = pixels;

    public RawFrame Crop(JsonElement selection, int requestedWidth, int requestedHeight)
    {
        var bounds = selection.GetProperty("bounds");
        var metrics = selection.GetProperty("browserMetrics");
        var innerWidth = Math.Max(1, metrics.GetProperty("innerWidth").GetInt32());
        var outerHeight = metrics.GetProperty("outerHeight").GetInt32();
        var innerHeight = metrics.GetProperty("innerHeight").GetInt32();
        var scale = Width / (double)Math.Max(1, metrics.GetProperty("outerWidth").GetInt32());
        var x = (int)Math.Round(((metrics.GetProperty("outerWidth").GetInt32() - innerWidth) / 2d + bounds.GetProperty("x").GetInt32()) * scale);
        var y = (int)Math.Round((Math.Max(0, outerHeight - innerHeight - 8) + bounds.GetProperty("y").GetInt32()) * scale);
        var cropWidth = (int)Math.Round(bounds.GetProperty("width").GetInt32() * scale);
        var cropHeight = (int)Math.Round(bounds.GetProperty("height").GetInt32() * scale);
        x = Math.Clamp(x, 0, Width - 1); y = Math.Clamp(y, 0, Height - 1);
        cropWidth = Math.Clamp(cropWidth, 1, Width - x); cropHeight = Math.Clamp(cropHeight, 1, Height - y);
        var targetRatio = Math.Min(requestedWidth / (double)cropWidth, requestedHeight / (double)cropHeight);
        var targetWidth = Math.Max(1, Math.Min(requestedWidth, (int)Math.Round(cropWidth * targetRatio)));
        var targetHeight = Math.Max(1, Math.Min(requestedHeight, (int)Math.Round(cropHeight * targetRatio)));
        var target = new byte[targetWidth * targetHeight * 4];
        for (var targetY = 0; targetY < targetHeight; targetY++)
        {
            var sourceY = y + targetY * cropHeight / targetHeight;
            for (var targetX = 0; targetX < targetWidth; targetX++)
            {
                var sourceX = x + targetX * cropWidth / targetWidth;
                Buffer.BlockCopy(Pixels, (sourceY * Width + sourceX) * 4, target, (targetY * targetWidth + targetX) * 4, 4);
            }
        }
        return new RawFrame(targetWidth, targetHeight, target);
    }
    public void Dispose() { }
}

internal static class GdiCaptureBackend
{
    public static RawFrame Capture(IntPtr window)
    {
        if (!NativeMethods.GetClientRect(window, out var rect)) throw new InvalidOperationException("Não foi possível medir a janela.");
        var width = rect.Right - rect.Left; var height = rect.Bottom - rect.Top;
        if (width <= 0 || height <= 0) throw new InvalidOperationException("A janela está minimizada ou sem área capturável.");
        var windowDc = NativeMethods.GetDC(window);
        var memoryDc = NativeMethods.CreateCompatibleDC(windowDc);
        var bitmap = NativeMethods.CreateCompatibleBitmap(windowDc, width, height);
        var previous = NativeMethods.SelectObject(memoryDc, bitmap);
        try
        {
            var printed = NativeMethods.PrintWindow(window, memoryDc, NativeMethods.PW_RENDERFULLCONTENT);
            if (!printed && !NativeMethods.BitBlt(memoryDc, 0, 0, width, height, windowDc, 0, 0, NativeMethods.SRCCOPY | NativeMethods.CAPTUREBLT))
                throw new InvalidOperationException("A captura da janela falhou.");
            var info = NativeMethods.BitmapInfo.Create(width, -height);
            var pixels = new byte[checked(width * height * 4)];
            if (NativeMethods.GetDIBits(memoryDc, bitmap, 0, (uint)height, pixels, ref info, 0) == 0)
                throw new InvalidOperationException("Não foi possível ler os píxeis capturados.");
            return new RawFrame(width, height, pixels);
        }
        finally
        {
            NativeMethods.SelectObject(memoryDc, previous); NativeMethods.DeleteObject(bitmap);
            NativeMethods.DeleteDC(memoryDc); NativeMethods.ReleaseDC(window, windowDc);
        }
    }
}

internal static class NativeMethods
{
    public const int SRCCOPY = 0x00CC0020, CAPTUREBLT = 0x40000000;
    public const uint PW_RENDERFULLCONTENT = 0x00000002;
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr state);
    [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)] public static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr window, StringBuilder text, int maxCount);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)] public static extern bool GetClientRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr window);
    [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)] public static extern bool PrintWindow(IntPtr window, IntPtr dc, uint flags);
    [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr window, IntPtr dc);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr dc);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleBitmap(IntPtr dc, int width, int height);
    [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr dc, IntPtr obj);
    [DllImport("gdi32.dll")] [return: MarshalAs(UnmanagedType.Bool)] public static extern bool DeleteObject(IntPtr obj);
    [DllImport("gdi32.dll")] [return: MarshalAs(UnmanagedType.Bool)] public static extern bool DeleteDC(IntPtr dc);
    [DllImport("gdi32.dll")] [return: MarshalAs(UnmanagedType.Bool)] public static extern bool BitBlt(IntPtr target, int x, int y, int width, int height, IntPtr source, int sourceX, int sourceY, int operation);
    [DllImport("gdi32.dll")] public static extern int GetDIBits(IntPtr dc, IntPtr bitmap, uint start, uint lines, [Out] byte[] bits, ref BitmapInfo info, uint usage);
    [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
    public delegate bool EnumWindowsProc(IntPtr window, IntPtr state);
    [StructLayout(LayoutKind.Sequential)] public struct BitmapInfoHeader { public uint Size; public int Width, Height; public ushort Planes, BitCount; public uint Compression, SizeImage; public int XPelsPerMeter, YPelsPerMeter; public uint ColorsUsed, ColorsImportant; }
    [StructLayout(LayoutKind.Sequential)] public struct BitmapInfo { public BitmapInfoHeader Header; public uint Colors; public static BitmapInfo Create(int width, int height) => new() { Header = new BitmapInfoHeader { Size = (uint)Marshal.SizeOf<BitmapInfoHeader>(), Width = width, Height = height, Planes = 1, BitCount = 32, Compression = 0 } }; }

    public static IntPtr FindApprovedBrowserWindow(string? pageTitle)
    {
        var foreground = GetForegroundWindow();
        if (IsBrowserWindow(foreground)) return foreground;
        if (string.IsNullOrWhiteSpace(pageTitle)) return IntPtr.Zero;
        var matches = new List<IntPtr>();
        EnumWindows((window, _) => {
            if (!IsWindowVisible(window) || !IsBrowserWindow(window)) return true;
            var title = new StringBuilder(512);
            GetWindowText(window, title, title.Capacity);
            if (title.ToString().Contains(pageTitle, StringComparison.OrdinalIgnoreCase)) matches.Add(window);
            return true;
        }, IntPtr.Zero);
        return matches.Count == 1 ? matches[0] : IntPtr.Zero;
    }

    private static bool IsBrowserWindow(IntPtr window)
    {
        if (window == IntPtr.Zero) return false;
        GetWindowThreadProcessId(window, out var processId);
        try
        {
            var name = Process.GetProcessById(checked((int)processId)).ProcessName;
            return name.Equals("chrome", StringComparison.OrdinalIgnoreCase) || name.Equals("msedge", StringComparison.OrdinalIgnoreCase);
        }
        catch { return false; }
    }
}

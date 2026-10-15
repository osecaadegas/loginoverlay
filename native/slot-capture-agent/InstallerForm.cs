using System.Diagnostics;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Win32;

namespace StreamersCenter.SlotCapture.Agent;

internal sealed class InstallerForm : Form
{
    private const string NativeHostName = "com.streamerscenter.slot_capture";
    private readonly string installDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "StreamersCenter", "SlotCapture");
    private readonly TextBox extensionId = new() { PlaceholderText = "ID da extensão (32 caracteres)", Dock = DockStyle.Fill };
    private readonly Label status = new() { AutoSize = true, ForeColor = Color.FromArgb(148, 163, 184) };
    private string ExtensionDirectory => Path.Combine(installDirectory, "Extension");
    private string NativeHostPath => Path.Combine(installDirectory, "streamerscenter-slot-capture-native-host.exe");

    internal InstallerForm()
    {
        Text = "StreamersCenter Slot Capture";
        Width = 700;
        Height = 560;
        MinimumSize = new Size(620, 520);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(7, 12, 20);
        ForeColor = Color.FromArgb(231, 242, 251);
        Font = new Font("Segoe UI", 10F);

        var root = new TableLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(30), ColumnCount = 1, RowCount = 9 };
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.Controls.Add(new Label { Text = "STREAMERSCENTER", AutoSize = true, ForeColor = Color.FromArgb(94, 234, 212), Font = new Font(Font, FontStyle.Bold) });
        root.Controls.Add(new Label { Text = "Instalação do Slot Capture", AutoSize = true, Font = new Font("Segoe UI", 23F, FontStyle.Bold), Margin = new Padding(0, 8, 0, 6) });
        root.Controls.Add(new Label { Text = "O instalador prepara o agente local e a extensão. O vídeo permanece neste computador.", AutoSize = true, ForeColor = Color.FromArgb(168, 189, 205), Margin = new Padding(0, 0, 0, 18) });

        var stepOne = MakeSection("1. Carregar a extensão no Chrome ou Edge", "Abra a página de extensões e carregue a pasta preparada pelo instalador.");
        var buttons = new FlowLayoutPanel { AutoSize = true, Dock = DockStyle.Fill, Margin = new Padding(0, 10, 0, 4) };
        buttons.Controls.Add(MakeButton("Abrir página de extensões", (_, _) => OpenExtensionsPage(), true));
        buttons.Controls.Add(MakeButton("Abrir pasta da extensão", (_, _) => OpenFolder()));
        stepOne.Controls.Add(buttons);
        root.Controls.Add(stepOne);

        var stepTwo = MakeSection("2. Copiar o ID da extensão", "Depois de clicar em “Carregar expandida”, copie o ID mostrado no cartão da extensão e cole-o aqui.");
        extensionId.Margin = new Padding(0, 10, 0, 5);
        extensionId.BackColor = Color.FromArgb(5, 15, 25);
        extensionId.ForeColor = Color.White;
        extensionId.BorderStyle = BorderStyle.FixedSingle;
        stepTwo.Controls.Add(extensionId);
        root.Controls.Add(stepTwo);

        var complete = MakeButton("Concluir instalação", (_, _) => CompleteInstallation(), true);
        complete.Height = 42;
        complete.Dock = DockStyle.Top;
        complete.Margin = new Padding(0, 14, 0, 8);
        root.Controls.Add(complete);
        root.Controls.Add(status);
        root.Controls.Add(new Label { Text = "Chrome/Edge exigem esta confirmação manual para extensões fora das lojas oficiais.", AutoSize = true, ForeColor = Color.FromArgb(100, 116, 139), Margin = new Padding(0, 14, 0, 0) });
        Controls.Add(root);

        Shown += (_, _) => PrepareFiles();
    }

    private static TableLayoutPanel MakeSection(string title, string description)
    {
        var panel = new TableLayoutPanel { AutoSize = true, Dock = DockStyle.Top, ColumnCount = 1, Padding = new Padding(14), Margin = new Padding(0, 5, 0, 5), BackColor = Color.FromArgb(11, 20, 32) };
        panel.Controls.Add(new Label { Text = title, AutoSize = true, Font = new Font("Segoe UI", 11F, FontStyle.Bold) });
        panel.Controls.Add(new Label { Text = description, AutoSize = true, ForeColor = Color.FromArgb(143, 167, 186), Margin = new Padding(0, 5, 0, 0) });
        return panel;
    }

    private static Button MakeButton(string text, EventHandler click, bool primary = false)
    {
        var button = new Button { Text = text, AutoSize = true, Height = 36, FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand, Margin = new Padding(0, 0, 9, 0), Padding = new Padding(10, 0, 10, 0) };
        button.FlatAppearance.BorderColor = primary ? Color.FromArgb(34, 211, 238) : Color.FromArgb(49, 80, 106);
        button.BackColor = primary ? Color.FromArgb(13, 116, 131) : Color.FromArgb(10, 23, 36);
        button.ForeColor = Color.White;
        button.Click += click;
        return button;
    }

    private void PrepareFiles()
    {
        try
        {
            Directory.CreateDirectory(installDirectory);
            Directory.CreateDirectory(ExtensionDirectory);
            var currentExecutable = Environment.ProcessPath ?? throw new InvalidOperationException("Não foi possível localizar o instalador.");
            if (!Path.GetFullPath(currentExecutable).Equals(Path.GetFullPath(NativeHostPath), StringComparison.OrdinalIgnoreCase))
                File.Copy(currentExecutable, NativeHostPath, true);

            var resourceName = typeof(InstallerForm).Assembly.GetManifestResourceNames().Single(name => name.EndsWith("Extension.zip", StringComparison.Ordinal));
            using var resource = typeof(InstallerForm).Assembly.GetManifestResourceStream(resourceName) ?? throw new InvalidOperationException("Pacote da extensão em falta.");
            using var archive = new ZipArchive(resource, ZipArchiveMode.Read);
            foreach (var entry in archive.Entries)
            {
                var destination = Path.GetFullPath(Path.Combine(ExtensionDirectory, entry.FullName));
                if (!destination.StartsWith(Path.GetFullPath(ExtensionDirectory) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException("O pacote da extensão contém um caminho inválido.");
                if (string.IsNullOrEmpty(entry.Name)) { Directory.CreateDirectory(destination); continue; }
                Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
                entry.ExtractToFile(destination, true);
            }
            status.Text = "✓ Ficheiros preparados. Carregue agora a extensão no navegador.";
            status.ForeColor = Color.FromArgb(94, 234, 212);
        }
        catch (Exception exception)
        {
            status.Text = $"Não foi possível preparar a instalação: {exception.Message}";
            status.ForeColor = Color.FromArgb(251, 113, 133);
        }
    }

    private void OpenExtensionsPage()
    {
        foreach (var (browser, page) in new[] { ("chrome.exe", "chrome://extensions"), ("msedge.exe", "edge://extensions") })
        {
            try { Process.Start(new ProcessStartInfo(browser, page) { UseShellExecute = true }); return; }
            catch { }
        }
        Clipboard.SetText("chrome://extensions");
        MessageBox.Show("Não foi possível abrir o navegador. O endereço chrome://extensions foi copiado.", Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    private void OpenFolder()
    {
        PrepareFiles();
        Process.Start(new ProcessStartInfo("explorer.exe", ExtensionDirectory) { UseShellExecute = true });
    }

    private void CompleteInstallation()
    {
        var id = extensionId.Text.Trim().ToLowerInvariant();
        if (!Regex.IsMatch(id, "^[a-p]{32}$"))
        {
            MessageBox.Show("Cole o ID de 32 caracteres apresentado na página de extensões.", Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        try
        {
            PrepareFiles();
            var manifestPath = Path.Combine(installDirectory, $"{NativeHostName}.json");
            var manifest = new { name = NativeHostName, description = "StreamersCenter local slot capture agent", path = NativeHostPath, type = "stdio", allowed_origins = new[] { $"chrome-extension://{id}/" } };
            File.WriteAllText(manifestPath, JsonSerializer.Serialize(manifest, new JsonSerializerOptions { WriteIndented = true }), new UTF8Encoding(false));
            foreach (var keyPath in new[] { $@"Software\Google\Chrome\NativeMessagingHosts\{NativeHostName}", $@"Software\Microsoft\Edge\NativeMessagingHosts\{NativeHostName}" })
            {
                using var key = Registry.CurrentUser.CreateSubKey(keyPath, true);
                key.SetValue(string.Empty, manifestPath, RegistryValueKind.String);
            }
            status.Text = "✓ Instalação concluída. Recarregue a página Slot Capture.";
            status.ForeColor = Color.FromArgb(52, 211, 153);
            MessageBox.Show("Slot Capture instalado. Recarregue streamerscenter.com/slot-capture.", Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception exception)
        {
            status.Text = $"A instalação falhou: {exception.Message}";
            status.ForeColor = Color.FromArgb(251, 113, 133);
        }
    }
}

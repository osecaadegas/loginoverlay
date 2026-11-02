$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$artRoot = Join-Path $projectRoot 'public/apps-tiles'
$logoRoot = Join-Path $projectRoot 'public/iconLOGOs'
$outputRoot = Join-Path $artRoot 'thumbs'
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

function Save-ResizedImage {
  param(
    [string]$SourcePath,
    [string]$OutputPath,
    [int]$Width,
    [bool]$AsJpeg
  )

  $source = [System.Drawing.Image]::FromFile($SourcePath)
  try {
    $height = [Math]::Max(1, [int][Math]::Round($source.Height * $Width / $source.Width))
    $target = [System.Drawing.Bitmap]::new($Width, $height)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($target)
      try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.DrawImage($source, 0, 0, $Width, $height)
      } finally {
        $graphics.Dispose()
      }

      if ($AsJpeg) {
        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
          Where-Object MimeType -EQ 'image/jpeg' |
          Select-Object -First 1
        $settings = [System.Drawing.Imaging.EncoderParameters]::new(1)
        try {
          $settings.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new(
            [System.Drawing.Imaging.Encoder]::Quality, [long]82
          )
          $target.Save($OutputPath, $codec, $settings)
        } finally {
          $settings.Dispose()
        }
      } else {
        $target.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
      }
    } finally {
      $target.Dispose()
    }
  } finally {
    $source.Dispose()
  }
}

Get-ChildItem -LiteralPath $artRoot -Filter '*.jpg' -File | ForEach-Object {
  Save-ResizedImage -SourcePath $_.FullName -OutputPath (Join-Path $outputRoot $_.Name) -Width 512 -AsJpeg $true
}

'SC_BROWSER.png', 'SC_WEB_TRANSITIONS.png' | ForEach-Object {
  Save-ResizedImage -SourcePath (Join-Path $logoRoot $_) -OutputPath (Join-Path $outputRoot $_) -Width 128 -AsJpeg $false
}

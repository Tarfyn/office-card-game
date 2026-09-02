param(
  [string]$FrameRoot = "public\cosmetics\avatar-frames",
  [string]$OutputRoot = "public\cosmetics\avatar-frames\masks",
  [int]$InsetPixels = 1,
  [string]$Only = ""
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName PresentationCore
New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null

function Read-AlphaRaster([string]$Path) {
  $bitmap = New-Object System.Windows.Media.Imaging.BitmapImage
  $bitmap.BeginInit(); $bitmap.UriSource = [Uri]::new((Resolve-Path $Path).Path)
  $bitmap.CacheOption = [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad; $bitmap.EndInit()
  $converted = New-Object System.Windows.Media.Imaging.FormatConvertedBitmap
  $converted.BeginInit(); $converted.Source = $bitmap
  $converted.DestinationFormat = [System.Windows.Media.PixelFormats]::Bgra32; $converted.EndInit()
  $stride = $converted.PixelWidth * 4
  $pixels = New-Object byte[] ($stride * $converted.PixelHeight)
  $converted.CopyPixels($pixels, $stride, 0)
  return @{ Width = $converted.PixelWidth; Height = $converted.PixelHeight; Pixels = $pixels }
}

function Read-ExistingMask([string]$Path) {
  $bitmap = New-Object System.Windows.Media.Imaging.BitmapImage
  $bitmap.BeginInit(); $bitmap.UriSource = [Uri]::new((Resolve-Path $Path).Path)
  $bitmap.CacheOption = [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad; $bitmap.EndInit()
  $converted = New-Object System.Windows.Media.Imaging.FormatConvertedBitmap
  $converted.BeginInit(); $converted.Source = $bitmap
  $converted.DestinationFormat = [System.Windows.Media.PixelFormats]::Gray8; $converted.EndInit()
  $bytes = New-Object byte[] ($converted.PixelWidth * $converted.PixelHeight)
  $converted.CopyPixels($bytes, $converted.PixelWidth, 0)
  return @{ Width = $converted.PixelWidth; Height = $converted.PixelHeight; Bytes = $bytes }
}

function Get-OpeningMask($raster, [string]$FallbackMaskPath) {
  $w = $raster.Width; $h = $raster.Height; $n = $w * $h
  $transparent = New-Object bool[] $n; $outside = New-Object bool[] $n
  for ($p = 0; $p -lt $n; $p++) { $transparent[$p] = $raster.Pixels[$p * 4 + 3] -lt 16 }
  $queue = New-Object System.Collections.Generic.Queue[int]
  for ($x = 0; $x -lt $w; $x++) { $queue.Enqueue($x); $queue.Enqueue(($h - 1) * $w + $x) }
  for ($y = 1; $y -lt ($h - 1); $y++) { $queue.Enqueue($y * $w); $queue.Enqueue($y * $w + $w - 1) }
  while ($queue.Count -gt 0) {
    $p = $queue.Dequeue(); if (-not $transparent[$p] -or $outside[$p]) { continue }
    $outside[$p] = $true; $x = $p % $w; $y = [Math]::Floor($p / $w)
    if ($x -gt 0) { $queue.Enqueue($p - 1) }; if ($x -lt ($w - 1)) { $queue.Enqueue($p + 1) }
    if ($y -gt 0) { $queue.Enqueue($p - $w) }; if ($y -lt ($h - 1)) { $queue.Enqueue($p + $w) }
  }

  $visited = New-Object bool[] $n; $best = New-Object System.Collections.Generic.List[int]
  for ($start = 0; $start -lt $n; $start++) {
    if (-not $transparent[$start] -or $outside[$start] -or $visited[$start]) { continue }
    $component = New-Object System.Collections.Generic.List[int]
    $componentQueue = New-Object System.Collections.Generic.Queue[int]; $componentQueue.Enqueue($start)
    while ($componentQueue.Count -gt 0) {
      $p = $componentQueue.Dequeue(); if ($visited[$p] -or -not $transparent[$p] -or $outside[$p]) { continue }
      $visited[$p] = $true; $component.Add($p); $x = $p % $w; $y = [Math]::Floor($p / $w)
      if ($x -gt 0) { $componentQueue.Enqueue($p - 1) }; if ($x -lt ($w - 1)) { $componentQueue.Enqueue($p + 1) }
      if ($y -gt 0) { $componentQueue.Enqueue($p - $w) }; if ($y -lt ($h - 1)) { $componentQueue.Enqueue($p + $w) }
    }
    if ($component.Count -gt $best.Count) { $best = $component }
  }

  # Some legacy WebP encoders flatten alpha or leave the opening connected to
  # exterior transparency. In that ambiguous case, reuse the previously
  # derived mask as an explicit migration override and still apply the same
  # generic erosion step. New assets should use the alpha path above.
  if ($best.Count -lt 1000 -and (Test-Path -LiteralPath $FallbackMaskPath)) {
    $fallback = Read-ExistingMask $FallbackMaskPath
    if ($fallback.Width -eq $w -and $fallback.Height -eq $h) {
      $best = New-Object System.Collections.Generic.List[int]
      for ($p = 0; $p -lt $n; $p++) { if ($fallback.Bytes[$p] -gt 127) { $best.Add($p) } }
    }
  }

  $opening = New-Object bool[] $n; foreach ($p in $best) { $opening[$p] = $true }
  $mask = New-Object byte[] $n
  foreach ($p in $best) {
    $x = $p % $w; $y = [Math]::Floor($p / $w); $keep = $true
    for ($dy = -$InsetPixels; $dy -le $InsetPixels -and $keep; $dy++) {
      for ($dx = -$InsetPixels; $dx -le $InsetPixels; $dx++) {
        if ([Math]::Abs($dx) + [Math]::Abs($dy) -gt $InsetPixels) { continue }
        $nx = $x + $dx; $ny = $y + $dy
        if ($nx -lt 0 -or $nx -ge $w -or $ny -lt 0 -or $ny -ge $h -or -not $opening[$ny * $w + $nx]) { $keep = $false; break }
      }
    }
    if ($keep) { $mask[$p] = 255 }
  }
  return @{ Width = $w; Height = $h; Bytes = $mask; OpeningPixels = $best.Count }
}

function Write-MaskPng($mask, [string]$Path) {
  $source = [System.Windows.Media.Imaging.BitmapSource]::Create($mask.Width, $mask.Height, 96, 96, [System.Windows.Media.PixelFormats]::Gray8, $null, $mask.Bytes, $mask.Width)
  $encoder = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($source))
  $stream = New-Object System.IO.FileStream($Path, [System.IO.FileMode]::Create)
  try { $encoder.Save($stream) } finally { $stream.Dispose() }
}

Get-ChildItem -LiteralPath $FrameRoot -Filter *.webp | Where-Object { -not $Only -or $_.Name -eq $Only } | Sort-Object Name | ForEach-Object {
  $raster = Read-AlphaRaster $_.FullName
  if ($raster.Width -ne 512 -or $raster.Height -ne 512) { throw "$($_.Name): expected 512x512" }
  $fallbackPath = Join-Path $OutputRoot ($_.BaseName + ".png")
  $mask = Get-OpeningMask $raster $fallbackPath
  if ($mask.OpeningPixels -lt 1000) { throw "$($_.Name): no usable enclosed portrait opening" }
  $out = Join-Path $OutputRoot ($_.BaseName + ".png"); Write-MaskPng $mask $out
  Write-Output "$($_.Name) -> $([IO.Path]::GetFileName($out)) - opening $($mask.OpeningPixels) px"
}

# Installing FFmpeg (Windows & Linux)

Voxlert uses **ffplay** (from FFmpeg) for audio playback on Windows and Linux. macOS uses the built-in `afplay` and does not need FFmpeg.

Install FFmpeg so that `ffplay` is on your PATH.

## Windows

Choose one:

- **Chocolatey:** `choco install ffmpeg`
- **Scoop:** `scoop install ffmpeg`
- **Manual:** Download from [ffmpeg.org/download.html](https://ffmpeg.org/download.html) (Windows builds) and add the `bin` folder that contains `ffplay.exe` to your system PATH (e.g. Settings → System → About → Advanced system settings → Environment Variables → Path → Edit → New).

## Linux

- **Debian / Ubuntu:** `sudo apt install ffmpeg`
- **Fedora / RHEL:** `sudo dnf install ffmpeg`
- **Arch:** `sudo pacman -S ffmpeg`

## Verify

```bash
ffplay -version
```

You should see version and build info. Voxlert uses `ffplay -nodisp -autoexit` to play WAV files.

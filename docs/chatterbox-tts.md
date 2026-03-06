# Chatterbox TTS (Voxlert TTS backend)

[Chatterbox TTS](https://github.com/resemble-ai/chatterbox) runs as a local API server for speech synthesis. Voxlert sends phrases to it and plays the returned audio.

## Installation

### 1. Clone and set up Chatterbox

**macOS / Linux:**

```bash
git clone https://github.com/resemble-ai/chatterbox.git
cd chatterbox
python3 -m venv venv
source venv/bin/activate
pip install -e .
pip install fastapi uvicorn
```

**Windows (PowerShell or cmd):**

```powershell
git clone https://github.com/resemble-ai/chatterbox.git
cd chatterbox
py -m venv venv
venv\Scripts\activate
pip install -e .
pip install fastapi uvicorn
```

### 2. Run the server

**macOS / Linux:**

```bash
source venv/bin/activate
python -m chatterbox.server --port 8004
```

**Windows:**

```powershell
venv\Scripts\activate
python -m chatterbox.server --port 8004
```

### 3. Point Voxlert at it

```bash
voxlert config set tts_backend chatterbox
```

Voxlert expects Chatterbox at `http://localhost:8004` by default. Change the URL with:

```bash
voxlert config set chatterbox_url http://localhost:8004
```

## Auto-start (optional, macOS)

Create `~/Library/LaunchAgents/com.chatterbox.tts.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.chatterbox.tts</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/chatterbox/venv/bin/python</string>
        <string>-m</string>
        <string>chatterbox.server</string>
        <string>--port</string>
        <string>8004</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/chatterbox</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/chatterbox.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/chatterbox.err</string>
</dict>
</plist>
```

Replace `/path/to/chatterbox` with your clone path. Then load it:

```bash
launchctl load ~/Library/LaunchAgents/com.chatterbox.tts.plist
```

## Requirements

- **Python 3.10+**
- **GPU**: CUDA or MPS (Apple Silicon) for best performance

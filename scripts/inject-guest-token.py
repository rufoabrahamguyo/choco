#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

token = (os.environ.get("GUEST_WRITE_TOKEN") or "").strip()
if not token:
    sys.exit("GUEST_WRITE_TOKEN is empty. Set it with: gh secret set GUEST_WRITE_TOKEN")

path = Path("token.js")
path.write_text("window.CHOCO_WRITE_TOKEN = " + json.dumps(token) + ";\n", encoding="utf-8")
written = path.read_text(encoding="utf-8")
if "CHOCO_WRITE_TOKEN = \"\"" in written or written.startswith("//"):
    sys.exit("token.js is still empty after inject")
print("token.js written,", path.stat().st_size, "bytes")

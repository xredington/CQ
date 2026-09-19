#!/usr/bin/env bash
# Install the Python deps pptx-revamp needs. LibreOffice (with Impress) must
# be installed separately — it is what renders slides to PNG for visual checks.
set -euo pipefail
python3 -m pip install --quiet --upgrade python-pptx Pillow pymupdf
python3 - <<'PY'
import shutil
import pptx, PIL, pymupdf
print(f"python-pptx {pptx.__version__}  Pillow {PIL.__version__}  pymupdf {pymupdf.__doc__ or ''}".strip())
so = shutil.which("soffice") or shutil.which("libreoffice")
print(f"LibreOffice: {so}" if so else
      "LibreOffice: NOT FOUND — install it (with Impress) to render slide previews.\n"
      "  Ubuntu/Debian: sudo apt-get install libreoffice-impress\n"
      "  macOS:         brew install --cask libreoffice")
PY

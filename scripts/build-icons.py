#!/usr/bin/env python3
"""
build-icons.py
==============
Membuat ikon PWA / favicon / Apple touch icon / ikon Electron dari logo sumber
`src/assets/brand/pasal-frenzy-logo-123px.png` (123x123 px).

Sumber berukuran kecil, jadi hasil upscale (Lanczos) hanya dipakai sebagai ikon
aplikasi. Logotype di halaman dibuat tipografis, bukan dari berkas ini.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "assets" / "brand" / "pasal-frenzy-logo-123px.png"
OUT = ROOT / "public" / "icons"
ELECTRON_OUT = ROOT / "electron" / "build"
BG = (8, 8, 16, 255)  # #080810


def square(img: Image.Image, size: int, bg: tuple[int, int, int, int] | None, scale: float) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg if bg else (0, 0, 0, 0))
    inner = int(round(size * scale))
    resized = img.resize((inner, inner), Image.LANCZOS)
    offset = ((size - inner) // 2, (size - inner) // 2)
    canvas.alpha_composite(resized, offset)
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ELECTRON_OUT.mkdir(parents=True, exist_ok=True)
    logo = Image.open(SRC).convert("RGBA")

    square(logo, 192, None, 1.0).save(OUT / "icon-192.png", optimize=True)
    square(logo, 512, None, 1.0).save(OUT / "icon-512.png", optimize=True)
    # maskable: area aman 80% di tengah, latar gelap
    square(logo, 512, BG, 0.78).save(OUT / "icon-maskable-512.png", optimize=True)
    square(logo, 180, BG, 0.86).convert("RGB").save(OUT / "apple-touch-icon-180.png", optimize=True)

    fav = square(logo, 64, None, 1.0)
    fav.save(ROOT / "public" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

    # Electron: PNG 256 & 512 (electron-builder membuat .ico dari PNG 256+)
    square(logo, 256, None, 1.0).save(ELECTRON_OUT / "icon.png", optimize=True)
    square(logo, 512, None, 1.0).save(ELECTRON_OUT / "icon-512.png", optimize=True)

    for p in sorted(OUT.glob("*.png")) + [ROOT / "public" / "favicon.ico"] + sorted(ELECTRON_OUT.glob("*.png")):
        print(f"{p.relative_to(ROOT).as_posix()}  {p.stat().st_size:,} byte")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
build-uud1945.py
================
Mengekstraksi teks Undang-Undang Dasar Negara Republik Indonesia Tahun 1945
dari naskah resmi (PDF, MPR RI "Dalam Satu Naskah") ke `src/data/uud-1945.json`.

Prinsip:
* Tidak ada teks yang diketik ulang. Semua teks berasal dari lapisan teks PDF.
* Naskah PDF memuat dua rendisi teks yang sama:
    - Rendisi A (hal. 2-28): tata letak MPR, penanda amandemen `*)` .. `****)`.
    - Rendisi B (hal. 29-49): salinan kedua, penanda amandemen `1)` .. `4)`.
  Rendisi A dijadikan kanonik; rendisi B dipakai sebagai pembanding otomatis.
  Setiap perbedaan dilaporkan apa adanya di docs/data-validation/uud-1945-report.md.
* Typo yang ada di naskah sumber TIDAK dikoreksi (kesetiaan pada sumber),
  tetapi dicatat di laporan jika kedua rendisi berbeda.

Pemakaian:
    python scripts/build-uud1945.py            # ekstraksi + validasi + tulis JSON & laporan
    python scripts/build-uud1945.py --validate-only   # hanya validasi JSON yang sudah ada
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import platform
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "data-source" / "UUD-NRI-1945-Dalam-Satu-Naskah.pdf"
OUT_PATH = ROOT / "src" / "data" / "uud-1945.json"
REPORT_PATH = ROOT / "docs" / "data-validation" / "uud-1945-report.md"

SOFT_HYPHEN = "­"

# Halaman (0-based) untuk masing-masing rendisi.
RENDITION_A = range(1, 28)  # halaman 2..28
RENDITION_B = range(28, 49)  # halaman 29..49

MARK_STAR = re.compile(r"(?:\*{1,4}/)?\*{1,4}\)")
MARK_NUM = re.compile(r"[1-4]\)")
TRAILING_MARK = re.compile(r"\s*((?:\*{1,4}/)?\*{1,4}\)|[1-4]\))\s*$")

RE_BAB = re.compile(r"^BAB\s+([IVXLC]+[A-Z]?)\s*((?:\*{1,4}/)?\*{1,4}\)|[1-4]\))?\s*$")
RE_PASAL = re.compile(
    r"^Pasal\s+([0-9]+[A-Z]?|[IVX]+)\s*((?:\*{1,4}/)?\*{1,4}\)|[1-4]\))?\s*$"
)
RE_AYAT = re.compile(r"^\((\d+)\)\s*(.*)$")

# Legenda di kepala setiap halaman rendisi A ("*)", ":", "Perubahan Pertama", ...).
# Dihapus berdasarkan POSISI (blok pertama halaman), bukan pola semata, karena
# penanda amandemen yang berdiri sendiri di akhir ayat (mis. "****)") harus tetap dibaca.
LEGEND_PATTERNS = [
    re.compile(r"^\*{1,4}\)\s*$"),
    re.compile(r"^:\s*$"),
    re.compile(r"^Perubahan (Pertama|Kedua|Ketiga|Keempat)\s*$"),
]
LEGEND_MAX_LINES = 12

NOISE_PATTERNS = [
    re.compile(r"^[1-4]\)\s*:\s*Perubahan (Pertama|Kedua|Ketiga|Keempat)\s*$"),  # legenda B
    re.compile(r"^jdih\.bapeten\.go\.id\s*$"),
    re.compile(r"^_+\s*$"),
    re.compile(r"^\s*$"),
    re.compile(r"^\d{1,2}\s*$"),  # nomor halaman rendisi B
    re.compile(r"^\(\s*P\s*r\s*e\s*a\s*m\s*b\s*u\s*l\s*e\s*\)\s*$"),
]


# --------------------------------------------------------------------------- #
# Model data
# --------------------------------------------------------------------------- #
@dataclass
class Ayat:
    nomor: int
    teks: str = ""
    amandemen: list[int] = field(default_factory=list)


@dataclass
class Pasal:
    nomor: str
    amandemen: list[int] = field(default_factory=list)
    teks: str = ""  # dipakai jika pasal tidak punya ayat
    ayat: list[Ayat] = field(default_factory=list)


@dataclass
class Bab:
    nomor: str
    judul: str = ""
    amandemen: list[int] = field(default_factory=list)
    dihapus: bool = False
    pasal: list[Pasal] = field(default_factory=list)


@dataclass
class Naskah:
    pembukaan: list[str] = field(default_factory=list)
    bab: list[Bab] = field(default_factory=list)
    peralihan: list[Pasal] = field(default_factory=list)
    tambahan: list[Pasal] = field(default_factory=list)


# --------------------------------------------------------------------------- #
# Utilitas teks
# --------------------------------------------------------------------------- #
def normalize_line(text: str) -> str:
    text = text.replace(SOFT_HYPHEN, "-")
    text = text.replace(" ", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def is_noise(line: str) -> bool:
    return any(p.match(line) for p in NOISE_PATTERNS)


def marker_to_amendments(marker: str) -> list[int]:
    marker = marker.strip()
    if MARK_NUM.fullmatch(marker):
        return [int(marker[0])]
    # bentuk bintang: "***/****)" -> [3, 4]; "**)" -> [2]
    parts = marker.rstrip(")").split("/")
    return [len(p) for p in parts if p]


def split_trailing_markers(text: str) -> tuple[str, list[int]]:
    """Melepas semua penanda amandemen di ujung teks (bisa lebih dari satu)."""
    found: list[int] = []
    while True:
        m = TRAILING_MARK.search(text)
        if not m:
            break
        found = marker_to_amendments(m.group(1)) + found
        text = text[: m.start()].rstrip()
    return text, sorted(set(found))


def append_text(base: str, addition: str) -> str:
    addition = addition.strip()
    if not addition:
        return base
    if not base:
        return addition
    if base.endswith("-"):
        # pemenggalan baris: "Undang-" + "Undang Dasar" -> "Undang-Undang Dasar"
        return base + addition
    return base + " " + addition


# --------------------------------------------------------------------------- #
# Ekstraksi PDF
# --------------------------------------------------------------------------- #
@dataclass
class Line:
    text: str
    x0: float
    page: int


def extract_lines(doc, pages: range) -> list[Line]:
    """Mengambil baris teks beserta posisi x0 (untuk deteksi indentasi paragraf)."""
    lines: list[Line] = []
    for pno in pages:
        page = doc[pno]
        info = page.get_text("dict")
        page_lines: list[Line] = []
        for block in info.get("blocks", []):
            if block.get("type", 0) != 0:
                continue
            for raw_line in block.get("lines", []):
                text = "".join(span.get("text", "") for span in raw_line.get("spans", []))
                text = normalize_line(text)
                if not text:
                    continue
                page_lines.append(Line(text=text, x0=float(raw_line["bbox"][0]), page=pno + 1))

        # Buang blok legenda di kepala halaman (maksimal 12 baris pertama yang cocok).
        start = 0
        while start < min(LEGEND_MAX_LINES, len(page_lines)) and any(
            p.match(page_lines[start].text) for p in LEGEND_PATTERNS
        ):
            start += 1
        for line in page_lines[start:]:
            if is_noise(line.text):
                continue
            lines.append(line)
    return lines


# --------------------------------------------------------------------------- #
# Parser
# --------------------------------------------------------------------------- #
def parse_rendition(lines: list[Line]) -> Naskah:
    naskah = Naskah()
    state = "judul"  # judul -> pembukaan -> batang -> peralihan -> tambahan
    bab: Bab | None = None
    pasal: Pasal | None = None
    ayat: Ayat | None = None
    bab_title_open = False

    # Deteksi paragraf Pembukaan: baris menjorok (x0 lebih besar dari margin kiri
    # baris-baris Pembukaan) yang mengikuti kalimat yang sudah selesai (diakhiri titik).
    pembukaan_lines: list[Line] = []

    def finalize_ayat() -> None:
        nonlocal ayat
        if ayat is not None:
            ayat.teks, ayat.amandemen = split_trailing_markers(ayat.teks)
            ayat = None

    def finalize_pasal() -> None:
        nonlocal pasal
        finalize_ayat()
        if pasal is not None and not pasal.ayat:
            teks, marks = split_trailing_markers(pasal.teks)
            pasal.teks = teks
            pasal.amandemen = sorted(set(pasal.amandemen + marks))
        pasal = None

    def finalize_bab() -> None:
        nonlocal bab, bab_title_open
        finalize_pasal()
        if bab is not None:
            judul, marks = split_trailing_markers(bab.judul)
            bab.judul = judul
            bab.amandemen = sorted(set(bab.amandemen + marks))
        bab = None
        bab_title_open = False

    def current_pasal_list() -> list[Pasal]:
        if state == "peralihan":
            return naskah.peralihan
        if state == "tambahan":
            return naskah.tambahan
        assert bab is not None, "Pasal ditemukan sebelum BAB"
        return bab.pasal

    for line in lines:
        text = line.text

        if state == "judul":
            if text == "PEMBUKAAN":
                state = "pembukaan"
            continue

        if state == "pembukaan":
            if text == "UNDANG-UNDANG DASAR":
                naskah.pembukaan = split_paragraphs(pembukaan_lines)
                state = "batang"
            else:
                pembukaan_lines.append(line)
            continue

        # ---- batang tubuh, aturan peralihan, aturan tambahan ----
        if text == "ATURAN PERALIHAN":
            finalize_bab()
            state = "peralihan"
            continue
        if text == "ATURAN TAMBAHAN":
            finalize_pasal()
            state = "tambahan"
            continue

        m_bab = RE_BAB.match(text)
        if m_bab and state == "batang":
            finalize_bab()
            bab = Bab(nomor=m_bab.group(1))
            if m_bab.group(2):
                bab.amandemen = marker_to_amendments(m_bab.group(2))
            naskah.bab.append(bab)
            bab_title_open = True
            continue

        m_pasal = RE_PASAL.match(text)
        if m_pasal:
            finalize_pasal()
            bab_title_open = False
            pasal = Pasal(nomor=m_pasal.group(1))
            if m_pasal.group(2):
                pasal.amandemen = marker_to_amendments(m_pasal.group(2))
            current_pasal_list().append(pasal)
            continue

        if bab_title_open and bab is not None and pasal is None:
            if text.startswith("Dihapus"):
                # BAB IV (Dewan Pertimbangan Agung) dihapus oleh Perubahan Keempat.
                _, marks = split_trailing_markers(text)
                bab.dihapus = True
                bab.amandemen = sorted(set(bab.amandemen + marks))
            else:
                bab.judul = append_text(bab.judul, text)
            continue

        m_ayat = RE_AYAT.match(text)
        if m_ayat and pasal is not None:
            finalize_ayat()
            ayat = Ayat(nomor=int(m_ayat.group(1)), teks=m_ayat.group(2).strip())
            pasal.ayat.append(ayat)
            continue

        if ayat is not None:
            ayat.teks = append_text(ayat.teks, text)
        elif pasal is not None:
            pasal.teks = append_text(pasal.teks, text)
        else:
            raise ValueError(f"Baris tidak terduga di halaman {line.page}: {text!r}")

    finalize_bab()
    finalize_pasal()
    return naskah


def split_paragraphs(lines: list[Line]) -> list[str]:
    """Membagi baris-baris Pembukaan menjadi alinea berdasarkan indentasi baris pertama."""
    if not lines:
        return []
    left = min(l.x0 for l in lines)
    paragraphs: list[str] = []
    current = ""
    for line in lines:
        indented = line.x0 > left + 8.0
        if indented and current and current.rstrip().endswith("."):
            paragraphs.append(current.strip())
            current = ""
        current = append_text(current, line.text)
    if current.strip():
        paragraphs.append(current.strip())

    if len(paragraphs) != 4:
        # Cadangan: setiap alinea Pembukaan adalah satu kalimat utuh yang diakhiri titik.
        joined = " ".join(l.text for l in lines)
        joined = re.sub(r"\s+", " ", joined)
        parts = [p.strip() for p in re.split(r"(?<=\.)\s+(?=[A-Z])", joined) if p.strip()]
        if len(parts) == 4:
            paragraphs = parts
    return [re.sub(r"\s+", " ", p) for p in paragraphs]


# --------------------------------------------------------------------------- #
# Perbandingan dua rendisi
# --------------------------------------------------------------------------- #
def norm_for_compare(text: str) -> str:
    text = text.lower()
    text = text.replace("–", "-").replace("—", "-")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s*([,;.:/])\s*", r"\1 ", text)
    return text.strip()


def flatten(naskah: Naskah) -> dict[str, tuple[str, list[int]]]:
    out: dict[str, tuple[str, list[int]]] = {}
    for i, alinea in enumerate(naskah.pembukaan, start=1):
        out[f"pembukaan/alinea-{i}"] = (alinea, [])
    for bab in naskah.bab:
        out[f"bab/{bab.nomor}/judul"] = (bab.judul, bab.amandemen)
        for pasal in bab.pasal:
            if pasal.ayat:
                for ayat in pasal.ayat:
                    out[f"pasal/{pasal.nomor}/ayat-{ayat.nomor}"] = (ayat.teks, ayat.amandemen)
            else:
                out[f"pasal/{pasal.nomor}"] = (pasal.teks, pasal.amandemen)
    for name, items in (("peralihan", naskah.peralihan), ("tambahan", naskah.tambahan)):
        for pasal in items:
            if pasal.ayat:
                for ayat in pasal.ayat:
                    out[f"{name}/{pasal.nomor}/ayat-{ayat.nomor}"] = (ayat.teks, ayat.amandemen)
            else:
                out[f"{name}/{pasal.nomor}"] = (pasal.teks, pasal.amandemen)
    return out


def cross_check(a: Naskah, b: Naskah) -> dict:
    fa, fb = flatten(a), flatten(b)
    keys = sorted(set(fa) | set(fb))
    diffs: list[dict] = []
    compared = 0
    for key in keys:
        if key not in fa or key not in fb:
            diffs.append(
                {
                    "unit": key,
                    "jenis": "hanya-di-A" if key in fa else "hanya-di-B",
                    "A": fa.get(key, ("", []))[0],
                    "B": fb.get(key, ("", []))[0],
                }
            )
            continue
        compared += 1
        ta, ma = fa[key]
        tb, mb = fb[key]
        if norm_for_compare(ta) != norm_for_compare(tb):
            diffs.append({"unit": key, "jenis": "teks-berbeda", "A": ta, "B": tb})
        if ma != mb:
            diffs.append(
                {"unit": key, "jenis": "penanda-amandemen-berbeda", "A": str(ma), "B": str(mb)}
            )
    return {"unitDibandingkan": compared, "jumlahPerbedaan": len(diffs), "perbedaan": diffs}


# --------------------------------------------------------------------------- #
# Serialisasi
# --------------------------------------------------------------------------- #
def tokenize(teks: str) -> list[dict]:
    kata = []
    for i, token in enumerate(re.findall(r"\S+", teks)):
        bersih = re.sub(r"^[^\w]+|[^\w]+$", "", token)
        kata.append({"i": i, "teks": token, "bersih": bersih})
    return kata


def pasal_to_json(pasal: Pasal, prefix: str = "") -> dict:
    return {
        "id": f"{prefix}{pasal.nomor}",
        "nomor": pasal.nomor,
        "amandemen": pasal.amandemen,
        "teks": pasal.teks if not pasal.ayat else None,
        "ayat": [
            {
                "id": f"{prefix}{pasal.nomor}-{a.nomor}",
                "nomor": a.nomor,
                "teks": a.teks,
                "amandemen": a.amandemen,
            }
            for a in pasal.ayat
        ],
    }


def to_json(naskah: Naskah, provenance: dict) -> dict:
    return {
        "meta": {
            "judul": "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945",
            "edisi": "Dalam Satu Naskah (Pembukaan dan pasal-pasal hasil Perubahan Pertama sampai Keempat)",
            "penerbit": "Majelis Permusyawaratan Rakyat Republik Indonesia, Sekretariat Jenderal",
            "bahasa": "id",
            "keteranganAmandemen": {
                "1": "Perubahan Pertama (1999)",
                "2": "Perubahan Kedua (2000)",
                "3": "Perubahan Ketiga (2001)",
                "4": "Perubahan Keempat (2002)",
            },
            "catatan": "Teks disalin apa adanya dari lapisan teks PDF sumber, termasuk ejaan asli naskah. Daftar amandemen kosong berarti teks asli 1945 yang tidak diubah.",
        },
        "provenance": provenance,
        "pembukaan": {
            "alinea": [
                {"nomor": i, "teks": teks, "kata": tokenize(teks)}
                for i, teks in enumerate(naskah.pembukaan, start=1)
            ]
        },
        "batangTubuh": {
            "bab": [
                {
                    "nomor": bab.nomor,
                    "judul": bab.judul,
                    "amandemen": bab.amandemen,
                    "dihapus": bab.dihapus,
                    "pasal": [pasal_to_json(p) for p in bab.pasal],
                }
                for bab in naskah.bab
            ]
        },
        "aturanPeralihan": {"pasal": [pasal_to_json(p, "peralihan-") for p in naskah.peralihan]},
        "aturanTambahan": {"pasal": [pasal_to_json(p, "tambahan-") for p in naskah.tambahan]},
    }


# --------------------------------------------------------------------------- #
# Validasi
# --------------------------------------------------------------------------- #
def validate(data: dict) -> list[str]:
    errors: list[str] = []
    alinea = data["pembukaan"]["alinea"]
    if len(alinea) != 4:
        errors.append(f"Pembukaan harus 4 alinea, ditemukan {len(alinea)}")

    bab = data["batangTubuh"]["bab"]
    expected_bab = [
        "I", "II", "III", "IV", "V", "VI", "VII", "VIIA", "VIIB", "VIII", "VIIIA",
        "IX", "IXA", "X", "XA", "XI", "XII", "XIII", "XIV", "XV", "XVI",
    ]
    got_bab = [b["nomor"] for b in bab]
    if got_bab != expected_bab:
        errors.append(f"Urutan BAB tidak sesuai: {got_bab}")

    pasal_by_id = {p["id"]: p for b in bab for p in b["pasal"]}
    for n in range(1, 38):
        if str(n) not in pasal_by_id:
            errors.append(f"Pasal {n} tidak ditemukan")
    for pid in ["6A", "7A", "7B", "7C", "18A", "18B", "20A", "22A", "22B", "22C", "22D", "22E",
                "23A", "23B", "23C", "23D", "23E", "23F", "23G", "24A", "24B", "24C", "25A",
                "28A", "28B", "28C", "28D", "28E", "28F", "28G", "28H", "28I", "28J", "36A", "36B", "36C"]:
        if pid not in pasal_by_id:
            errors.append(f"Pasal {pid} tidak ditemukan")

    def ayat_count(pid: str) -> int:
        return len(pasal_by_id.get(pid, {}).get("ayat", []))

    checks = {"1": 3, "22": 3, "33": 5, "28J": 2, "28I": 5, "28D": 4, "37": 5, "2": 3, "18": 7}
    for pid, n in checks.items():
        if ayat_count(pid) != n:
            errors.append(f"Pasal {pid} seharusnya {n} ayat, ditemukan {ayat_count(pid)}")

    if len(data["aturanPeralihan"]["pasal"]) != 3:
        errors.append("Aturan Peralihan seharusnya 3 pasal")
    if len(data["aturanTambahan"]["pasal"]) != 2:
        errors.append("Aturan Tambahan seharusnya 2 pasal")

    bad = re.compile(r"(jdih|­|\s{2,}|\*\)|[1-4]\)$|^\s|\s$)")
    bab_iv = next((b for b in bab if b["nomor"] == "IV"), None)
    if not bab_iv or not bab_iv["dihapus"] or bab_iv["pasal"]:
        errors.append("BAB IV seharusnya berstatus dihapus tanpa pasal")
    for b in bab:
        if bad.search(b["judul"]) or "Dihapus" in b["judul"]:
            errors.append(f"Judul BAB {b['nomor']} mengandung noise: {b['judul']!r}")
        for p in b["pasal"]:
            if p["teks"] is not None and bad.search(p["teks"]):
                errors.append(f"Pasal {p['id']} mengandung noise")
            if p["teks"] is None and not p["ayat"]:
                errors.append(f"Pasal {p['id']} kosong")
            for a in p["ayat"]:
                if bad.search(a["teks"]) or not a["teks"]:
                    errors.append(f"Pasal {p['id']} ayat {a['nomor']} mengandung noise/kosong")
    for al in alinea:
        if bad.search(al["teks"]):
            errors.append(f"Alinea {al['nomor']} mengandung noise")
    return errors


# --------------------------------------------------------------------------- #
# Laporan
# --------------------------------------------------------------------------- #
def write_report(data: dict, check: dict, errors: list[str]) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    prov = data["provenance"]
    bab = data["batangTubuh"]["bab"]
    total_pasal = sum(len(b["pasal"]) for b in bab)
    total_ayat = sum(len(p["ayat"]) for b in bab for p in b["pasal"])
    amend_counter: dict[int, int] = {1: 0, 2: 0, 3: 0, 4: 0}
    unamended = 0
    for b in bab:
        for p in b["pasal"]:
            units = p["ayat"] if p["ayat"] else [p]
            for u in units:
                if u["amandemen"]:
                    for a in u["amandemen"]:
                        amend_counter[a] += 1
                else:
                    unamended += 1

    lines = [
        "# Laporan ekstraksi dan validasi UUD NRI 1945",
        "",
        f"Dibuat otomatis oleh `scripts/build-uud1945.py` pada {prov['extractedAt']} (UTC).",
        "",
        "## Sumber",
        "",
        f"- Berkas: `{prov['sourceFile']}`",
        f"- SHA-256: `{prov['sha256']}`",
        f"- Alat: {prov['tool']} · Python {prov['python']}",
        f"- Rendisi kanonik: {prov['canonicalRendition']} (halaman {prov['renditionPages']['A']}); pembanding: B (halaman {prov['renditionPages']['B']})",
        "",
        "## Ringkasan isi",
        "",
        "| Unit | Jumlah |",
        "|---|---|",
        f"| Alinea Pembukaan | {len(data['pembukaan']['alinea'])} |",
        f"| BAB | {len(bab)} |",
        f"| Pasal (batang tubuh) | {total_pasal} |",
        f"| Ayat (batang tubuh) | {total_ayat} |",
        f"| Pasal Aturan Peralihan | {len(data['aturanPeralihan']['pasal'])} |",
        f"| Pasal Aturan Tambahan | {len(data['aturanTambahan']['pasal'])} |",
        "",
        "## Sebaran penanda amandemen (per ayat / pasal tanpa ayat, batang tubuh)",
        "",
        "| Amandemen | Jumlah unit |",
        "|---|---|",
        f"| Teks asli 1945 (tanpa penanda) | {unamended} |",
        f"| Perubahan Pertama | {amend_counter[1]} |",
        f"| Perubahan Kedua | {amend_counter[2]} |",
        f"| Perubahan Ketiga | {amend_counter[3]} |",
        f"| Perubahan Keempat | {amend_counter[4]} |",
        "",
        "## Validasi struktural",
        "",
    ]
    if errors:
        lines.append(f"GAGAL: {len(errors)} masalah.")
        lines.extend(f"- {e}" for e in errors)
    else:
        lines.append("LULUS: semua pemeriksaan struktural terpenuhi (37 pasal bernomor, pasal berhuruf, jumlah ayat kunci, tanpa noise).")
    lines += [
        "",
        "## Pemeriksaan silang rendisi A vs rendisi B",
        "",
        f"Unit dibandingkan: {check['unitDibandingkan']}. Perbedaan: {check['jumlahPerbedaan']}.",
        "",
        "Perbedaan dicatat apa adanya; rendisi A tetap dipakai tanpa koreksi manual.",
        "",
    ]
    if check["perbedaan"]:
        lines += ["| Unit | Jenis | Rendisi A | Rendisi B |", "|---|---|---|---|"]
        for d in check["perbedaan"]:
            a = d["A"].replace("|", "\\|")
            b = d["B"].replace("|", "\\|")
            lines.append(f"| {d['unit']} | {d['jenis']} | {a} | {b} |")
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def build() -> int:
    try:
        import pymupdf  # type: ignore
    except ImportError:
        print("PyMuPDF belum terpasang: python -m pip install pymupdf", file=sys.stderr)
        return 2

    if not PDF_PATH.exists():
        print(f"PDF sumber tidak ditemukan: {PDF_PATH}", file=sys.stderr)
        return 2

    sha256 = hashlib.sha256(PDF_PATH.read_bytes()).hexdigest()
    doc = pymupdf.open(PDF_PATH)
    naskah_a = parse_rendition(extract_lines(doc, RENDITION_A))
    naskah_b = parse_rendition(extract_lines(doc, RENDITION_B))
    check = cross_check(naskah_a, naskah_b)

    provenance = {
        "sourceFile": PDF_PATH.relative_to(ROOT).as_posix(),
        "sourceTitle": "UUD NRI 1945 Dalam Satu Naskah (Sekretariat Jenderal MPR RI); salinan jdih.bapeten.go.id",
        "sha256": sha256,
        "pageCount": doc.page_count,
        "extractedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "tool": f"PyMuPDF {pymupdf.version[0]}",
        "python": platform.python_version(),
        "script": "scripts/build-uud1945.py",
        "canonicalRendition": "A",
        "renditionPages": {"A": "2-28", "B": "29-49"},
        "crossCheck": {
            "unitDibandingkan": check["unitDibandingkan"],
            "jumlahPerbedaan": check["jumlahPerbedaan"],
            "laporan": REPORT_PATH.relative_to(ROOT).as_posix(),
        },
    }
    data = to_json(naskah_a, provenance)
    errors = validate(data)
    write_report(data, check, errors)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"JSON  : {OUT_PATH.relative_to(ROOT).as_posix()} ({OUT_PATH.stat().st_size:,} byte)")
    print(f"Report: {REPORT_PATH.relative_to(ROOT).as_posix()}")
    print(f"Cross-check A vs B: {check['unitDibandingkan']} unit, {check['jumlahPerbedaan']} perbedaan")
    if errors:
        print(f"VALIDASI GAGAL ({len(errors)}):")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("VALIDASI LULUS")
    return 0


def validate_only() -> int:
    if not OUT_PATH.exists():
        print(f"JSON belum ada: {OUT_PATH}", file=sys.stderr)
        return 2
    data = json.loads(OUT_PATH.read_text(encoding="utf-8"))
    errors = validate(data)
    if errors:
        for e in errors:
            print(f"- {e}")
        return 1
    print("VALIDASI LULUS")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--validate-only", action="store_true", help="hanya validasi JSON yang sudah ada")
    args = parser.parse_args()
    sys.exit(validate_only() if args.validate_only else build())

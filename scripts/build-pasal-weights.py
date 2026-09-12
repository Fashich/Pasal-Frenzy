#!/usr/bin/env python3
"""
build-pasal-weights.py
======================
Menghitung bobot kata dan unit teks UUD NRI 1945 dari `src/data/uud-1945.json`
menjadi `src/data/pasal-weights.json`. Dipakai sistem fisika tipografi
(massa kata) dan ukuran font panel pasal.

Sumber angka (semuanya dihitung dari korpus, tidak ada yang dikarang):
* tf, df, idf, tf-idf per kata dari seluruh unit teks (alinea Pembukaan, ayat,
  pasal tanpa ayat, Aturan Peralihan/Tambahan).
* jumlah kata, status amandemen per unit.
* `fungsional`: kata tugas (konjungsi/preposisi/partikel) dari daftar linguistik
  bahasa Indonesia eksplisit; `dfRatio` dilaporkan terpisah untuk transparansi.

Parameter desain (dilabeli, bukan klaim empiris):
* `normatifSkema`: bobot hierarki norma per bagian/BAB yang dipakai game.

`mkCitations` sengaja null: PRD mengasumsikan frekuensi sitasi yurisprudensi
Mahkamah Konstitusi; data itu tidak tersedia offline dan tidak akan dikarang.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import math
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "data" / "uud-1945.json"
OUT = ROOT / "src" / "data" / "pasal-weights.json"
REPORT = ROOT / "docs" / "data-validation" / "pasal-weights-report.md"

TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z\-/]*")

# Daftar kata tugas bahasa Indonesia (pengetahuan linguistik umum, bukan data terukur).
FUNCTION_WORDS = {
    "dan", "yang", "dengan", "untuk", "dalam", "atau", "oleh", "dari", "di", "ke",
    "pada", "itu", "ini", "serta", "atas", "tidak", "akan", "adalah", "ialah",
    "sebagai", "bagi", "tentang", "menurut", "jika", "maka", "karena", "dapat",
    "harus", "wajib", "setiap", "tiap", "segala", "semua", "suatu", "sesuatu",
    "para", "sebab", "supaya", "agar", "apabila", "kepada", "terhadap", "antara",
    "melalui", "sampai", "hingga", "sejak", "selama", "sebelum", "sesudah",
    "kemudian", "lagi", "juga", "pun", "hanya", "bahwa", "dan/atau", "sekurang-kurangnya",
    "sedikitnya", "lebih", "kurang", "lain", "lainnya", "dua", "tiga", "satu", "lima",
    "sepertiga", "sebagaimana", "mestinya", "demi", "guna", "tanpa", "baik", "maupun",
    "ia", "mereka", "kita", "saya", "nya",
}

# Parameter desain: bobot normatif per bagian (hierarki norma dalam game).
NORMATIF_SKEMA = {
    "pembukaan": 1.0,
    "bab:I": 0.95,    # Bentuk dan Kedaulatan
    "bab:XA": 0.90,   # Hak Asasi Manusia
    "bab:XIV": 0.85,  # Perekonomian Nasional dan Kesejahteraan Sosial
    "bab:XVI": 0.85,  # Perubahan UUD
    "bab:III": 0.80,  # Kekuasaan Pemerintahan Negara
    "bab:IX": 0.80,   # Kekuasaan Kehakiman
    "bab:VII": 0.75,  # DPR
    "bab:VIIA": 0.75, # DPD
    "bab:X": 0.75,    # Warga Negara dan Penduduk
    "bab:XIII": 0.75, # Pendidikan dan Kebudayaan
    "aturanPeralihan": 0.6,
    "aturanTambahan": 0.6,
    "default": 0.7,
}


def tokens(text: str) -> list[str]:
    return [t.lower() for t in TOKEN_RE.findall(text)]


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    units: list[dict] = []

    for al in data["pembukaan"]["alinea"]:
        units.append({
            "id": f"pembukaan-{al['nomor']}", "bagian": "pembukaan", "pasalId": None,
            "babNomor": None, "amandemen": [], "teks": al["teks"], "normatifKey": "pembukaan",
        })
    for bab in data["batangTubuh"]["bab"]:
        for p in bab["pasal"]:
            key = f"bab:{bab['nomor']}"
            if p["ayat"]:
                for ay in p["ayat"]:
                    units.append({
                        "id": ay["id"], "bagian": "batangTubuh", "pasalId": p["id"],
                        "babNomor": bab["nomor"], "amandemen": ay["amandemen"], "teks": ay["teks"],
                        "normatifKey": key,
                    })
            else:
                units.append({
                    "id": p["id"], "bagian": "batangTubuh", "pasalId": p["id"],
                    "babNomor": bab["nomor"], "amandemen": p["amandemen"], "teks": p["teks"],
                    "normatifKey": key,
                })
    for bagian in ("aturanPeralihan", "aturanTambahan"):
        for p in data[bagian]["pasal"]:
            if p["ayat"]:
                for ay in p["ayat"]:
                    units.append({
                        "id": ay["id"], "bagian": bagian, "pasalId": p["id"], "babNomor": None,
                        "amandemen": ay["amandemen"], "teks": ay["teks"], "normatifKey": bagian,
                    })
            else:
                units.append({
                    "id": p["id"], "bagian": bagian, "pasalId": p["id"], "babNomor": None,
                    "amandemen": p["amandemen"], "teks": p["teks"], "normatifKey": bagian,
                })

    tf: Counter[str] = Counter()
    df: Counter[str] = Counter()
    unit_out: dict[str, dict] = {}
    n_units = len(units)
    for u in units:
        toks = tokens(u["teks"])
        tf.update(toks)
        df.update(set(toks))
        unit_out[u["id"]] = {
            "bagian": u["bagian"],
            "pasalId": u["pasalId"],
            "babNomor": u["babNomor"],
            "amandemen": u["amandemen"],
            "jumlahKata": len(toks),
            "normatif": NORMATIF_SKEMA.get(u["normatifKey"], NORMATIF_SKEMA["default"]),
        }

    total_tokens = sum(tf.values())
    kata_out: dict[str, dict] = {}
    max_tfidf = 0.0
    for w, count in tf.items():
        idf = math.log((1 + n_units) / (1 + df[w])) + 1.0
        tfidf = (1 + math.log(count)) * idf
        max_tfidf = max(max_tfidf, tfidf)
        ratio = df[w] / n_units
        kata_out[w] = {
            "tf": count,
            "df": df[w],
            "dfRatio": round(ratio, 4),
            "idf": round(idf, 4),
            "tfidf": round(tfidf, 4),
            # hanya daftar linguistik: kata konten yang sering (presiden, negara,
            # rakyat) tetap kata konten walau df-ratio tinggi
            "fungsional": w in FUNCTION_WORDS,
            "panjang": len(w),
        }
    for w in kata_out:
        kata_out[w]["tfidfNorm"] = round(kata_out[w]["tfidf"] / max_tfidf, 4)

    out = {
        "provenance": {
            "sourceFile": "src/data/uud-1945.json",
            "sourceSha256": hashlib.sha256(SRC.read_bytes()).hexdigest(),
            "generatedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
            "script": "scripts/build-pasal-weights.py",
        },
        "catatan": (
            f"tf/df/idf/tfidf dihitung dari korpus UUD NRI 1945 ({n_units} unit teks). "
            "normatifSkema adalah PARAMETER DESAIN game, bukan hasil pengukuran. "
            "fungsional = daftar kata tugas bahasa Indonesia (dfRatio dilaporkan terpisah)."
        ),
        "korpus": {"unit": n_units, "kosakata": len(kata_out), "token": total_tokens},
        "normatifSkema": NORMATIF_SKEMA,
        "unit": unit_out,
        "kata": dict(sorted(kata_out.items())),
        "mkCitations": None,
        "catatanMkCitations": (
            "PRD mengasumsikan frekuensi sitasi putusan Mahkamah Konstitusi per pasal. "
            "Data tersebut tidak tersedia offline dan TIDAK dikarang; bernilai null sampai "
            "dataset resmi (mis. ekspor putusan MK) diintegrasikan lewat skrip terpisah."
        ),
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

    top = sorted(kata_out.items(), key=lambda kv: -kv[1]["tfidf"])[:25]
    fungsional = sum(1 for k in kata_out.values() if k["fungsional"])
    lines = [
        "# Laporan bobot kata UUD NRI 1945",
        "",
        f"Dibuat otomatis oleh `scripts/build-pasal-weights.py` pada {out['provenance']['generatedAt']} (UTC).",
        "",
        "| Ukuran | Nilai |",
        "|---|---|",
        f"| Unit teks | {n_units} |",
        f"| Kosakata unik | {len(kata_out)} |",
        f"| Total token | {total_tokens} |",
        f"| Kata fungsional | {fungsional} |",
        "",
        "## 25 kata dengan tf-idf tertinggi",
        "",
        "| Kata | tf | df | idf | tf-idf | fungsional |",
        "|---|---|---|---|---|---|",
    ]
    for w, k in top:
        lines.append(f"| {w} | {k['tf']} | {k['df']} | {k['idf']} | {k['tfidf']} | {'ya' if k['fungsional'] else 'tidak'} |")
    lines += [
        "",
        "## Catatan",
        "",
        "- `normatifSkema` adalah parameter desain (hierarki norma dalam game), bukan pengukuran.",
        "- `mkCitations` bernilai null: frekuensi sitasi MK tidak tersedia offline dan tidak dikarang.",
    ]
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"JSON  : {OUT.relative_to(ROOT).as_posix()} ({OUT.stat().st_size:,} byte)")
    print(f"Report: {REPORT.relative_to(ROOT).as_posix()}")
    print(f"unit={n_units} kosakata={len(kata_out)} token={total_tokens} fungsional={fungsional}")


if __name__ == "__main__":
    main()

"""Download and SHA-256 verify PAD-UFES-20 from the official Mendeley API."""

from __future__ import annotations

import hashlib
import json
import os
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


DATASET = "zr7vgbcyr2"
VERSION = 1
API = "https://data.mendeley.com/public-api"
ROOT = Path(__file__).parent / "data" / "PAD_UFES_20" / "raw"


def api_json(url):
    request = urllib.request.Request(url, headers={
        "Accept": "application/vnd.mendeley-public-dataset.1+json",
        "User-Agent": "QualityConformal-research-downloader/1.0",
    })
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download_one(record, directory):
    target = directory / record["filename"]
    expected = record["content_details"]["sha256_hash"]
    if target.exists() and sha256(target) == expected:
        return "verified-existing", target
    temporary = target.with_suffix(target.suffix + ".part")
    request = urllib.request.Request(
        record["content_details"]["download_url"],
        headers={"User-Agent": "QualityConformal-research-downloader/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response, \
            temporary.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
    if sha256(temporary) != expected:
        raise RuntimeError(f"checksum mismatch: {record['filename']}")
    os.replace(temporary, target)
    return "downloaded", target


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    root_files = api_json(
        f"{API}/datasets/{DATASET}/files?folder_id=root&version={VERSION}")
    folders = api_json(f"{API}/datasets/{DATASET}/folders/{VERSION}")
    image_folder = next(x for x in folders if x["name"] == "images")
    image_records = api_json(
        f"{API}/datasets/{DATASET}/files?folder_id={image_folder['id']}&version={VERSION}")
    records = [(r, ROOT) for r in root_files]
    image_dir = ROOT / "images"; image_dir.mkdir(exist_ok=True)
    records.extend((r, image_dir) for r in image_records)
    print(f"official manifest contains {len(image_records)} image archives", flush=True)
    counts = {"downloaded": 0, "verified-existing": 0}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(download_one, record, directory)
                   for record, directory in records]
        for index, future in enumerate(as_completed(futures), 1):
            status, target = future.result()
            counts[status] += 1
            if index % 100 == 0 or index == len(futures):
                print(f"verified {index}/{len(futures)}", flush=True)
    extracted = ROOT / "images_extracted"; extracted.mkdir(exist_ok=True)
    for archive in sorted(image_dir.glob("*.zip")):
        with zipfile.ZipFile(archive) as handle:
            handle.extractall(extracted)
    extracted_images = sorted(extracted.rglob("*.png"))
    if len(extracted_images) != 2298:
        raise RuntimeError(
            f"expected 2298 extracted PNG images, found {len(extracted_images)}")
    manifest = {
        "dataset": DATASET, "version": VERSION,
        "source_api": API, "image_folder_id": image_folder["id"],
        "n_image_archives": len(image_records),
        "n_extracted_images": len(extracted_images), "counts": counts,
        "metadata_sha256": next(
            r["content_details"]["sha256_hash"] for r in root_files
            if r["filename"] == "metadata.csv"),
    }
    (ROOT / "download_manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8")
    print("DOWNLOAD_AND_VERIFY_COMPLETE", json.dumps(manifest), flush=True)


if __name__ == "__main__":
    main()

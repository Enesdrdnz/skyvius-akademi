"""Aynı yerel videoda model karşılaştırma alıştırması. Kamera/araç komutu kullanmaz.

python model_karsilastir.py --video drone.mp4 --device cpu
python model_karsilastir.py --video drone.mp4 --models best.pt --device cpu

Paketler: ultralytics, opencv-python. Hazır ağırlıklar ilk kullanımda indirilebilir.
Ölçüm: dosyadan kare okuma + predict; model yükleme, ilk 10 kare ve çıktı kaydı hariç.
Etiket kullanılmadığı için doğruluk/mAP ölçülmez.
"""
import argparse
import csv
import json
import platform
import time
from pathlib import Path

import cv2
import torch
import ultralytics
from ultralytics import YOLO


def compare(video, weights, device="cpu", count=100, warmup=10, output=Path("karsilastirma")):
    if not Path(video).is_file():
        raise FileNotFoundError(f"Video bulunamadı: {video}; kendi video dosyanın yolunu ver.")
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    rows = []
    samples = {max(1, round(count * i / 5)) for i in range(1, 6)}
    use_cuda = device != "cpu" and torch.cuda.is_available()
    for weight in weights:
        model = YOLO(weight)
        capture = cv2.VideoCapture(str(video))
        if not capture.isOpened():
            raise RuntimeError(f"Video açılamadı: {video}")
        total = 0.0
        done = 0
        images = []
        try:
            for frame_no in range(1, warmup + count + 1):
                if use_cuda:
                    torch.cuda.synchronize()
                start = time.perf_counter()
                ok, frame = capture.read()
                if not ok:
                    raise ValueError(f"En az {warmup+count} kare gerekiyor; {video} erken bitti.")
                result = model.predict(frame, imgsz=640, rect=False, conf=0.25,
                                       device=device, verbose=False)[0]
                if use_cuda:
                    torch.cuda.synchronize()
                elapsed = time.perf_counter() - start
                if frame_no > warmup:
                    done += 1
                    total += elapsed
                    if done in samples:
                        images.append((frame_no, result.plot()))
        finally:
            capture.release()
        name = Path(weight).stem
        for frame_no, image in images:
            cv2.imwrite(str(output / f"{name}_kare_{frame_no:04d}.jpg"), image)
        row = {"model": weight, "cihaz": device, "imgsz": 640, "conf": 0.25,
               "isinma_kare": warmup, "olculen_kare": done,
               "ortalama_ms": round(total * 1000 / done, 3),
               "fps": round(done / total, 3), "nms": "kutuphane/model varsayilani"}
        rows.append(row)
        print(row)
    with (output / "karsilastirma.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    info = {"video": str(video), "python": platform.python_version(),
            "ultralytics": ultralytics.__version__, "torch": torch.__version__,
            "platform": platform.platform(), "device": device,
            "gpu": torch.cuda.get_device_name(0) if use_cuda else None,
            "olcum": "Video kare okuma ve predict dahil; çizim/kayıt, yükleme ve ısınma hariç."}
    (output / "kosullar.json").write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Çıktılar: {output.resolve()}")
    return rows


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video", default="drone.mp4")
    parser.add_argument("--models", nargs="+", default=["yolo11n.pt", "yolo26n.pt"])
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--kare", type=int, default=100)
    parser.add_argument("--isinma", type=int, default=10)
    args = parser.parse_args()
    if args.kare < 5 or args.isinma < 0:
        parser.error("kare en az 5, isinma sıfır veya daha büyük olmalı")
    compare(args.video, args.models, args.device, args.kare, args.isinma)

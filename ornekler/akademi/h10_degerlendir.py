"""Eşik seçimini val'de yap; bağımsız test sonucuna göre ayar değiştirme.

Ön koşul: H09'dan best.pt; H08'den train/val/test yolları tanımlı data.yaml.
python h10_degerlendir.py
Bu betik yalnız test'i bir kez değerlendirir; eşik taraması yapmaz.
"""
from pathlib import Path
from ultralytics import YOLO

for filename in ("best.pt", "data.yaml"):
    if not Path(filename).is_file():
        raise FileNotFoundError(f"{filename} bulunamadı; H08/H09 çıktısını aynı klasöre koy.")

model = YOLO("best.pt")
metrics = model.val(data="data.yaml", split="test", imgsz=640,
                    project="h10_sonuclar", name="bagimsiz_test", plots=True)
print(f"P={metrics.box.mp:.3f}  R={metrics.box.mr:.3f}")
print(f"mAP50={metrics.box.map50:.3f}  mAP50-95={metrics.box.map:.3f}")
print("P/R, doğrulama aracının raporladığı çalışma noktasındadır; conf=0.25 ölçümü diye etiketleme.")
print("conf=0.25 görsel hata incelemesini aynı test görüntülerinde predict ile ayrıca yapabilirsin.")
print("Sonuç klasörü:", metrics.save_dir)

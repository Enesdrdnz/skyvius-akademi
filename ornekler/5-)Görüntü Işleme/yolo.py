import cv2
import time
from ultralytics import YOLO

# Modeli yükle (Nano model RTX 4050'de çok hızlı çalışır)
model = YOLO('yolov8n.pt')

# Kamerayı aç
cap = cv2.VideoCapture(0)

# Daha akıcı görüntü için kamera çözünürlüğünü zorlayabiliriz (Opsiyonel)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

prev_time = 0

print("RTX 4050 Saf Güç Testi Başlıyor...")

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        break

    # 1. Tahmin Yap (stream=True ve device=0 performans için kritik)
    # verbose=False terminal kirliliğini önler
    results = model.predict(frame, conf=0.4, device=0, verbose=False, stream=True)

    # 2. Döngü (Overall) FPS Hesapla
    curr_time = time.time()
    overall_fps = 1 / (curr_time - prev_time)
    prev_time = curr_time

    # 3. Sonuçları işle
    for r in results:
        # GPU'nun milisaniye cinsinden saf hızı
        inference_ms = r.speed['inference'] 
        pure_gpu_fps = 1000 / inference_ms if inference_ms > 0 else 0
        
        annotated_frame = r.plot()

        # 4. Bilgileri ekrana yazdır
        # Overall FPS: Kamerayı da içeren toplam hız
        # GPU FPS: Ekran kartının teorik maksimum hızı
        cv2.putText(annotated_frame, f"Kamera/Dongu FPS: {int(overall_fps)}", (20, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(annotated_frame, f"Saf GPU FPS: {int(pure_gpu_fps)}", (20, 70), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        cv2.putText(annotated_frame, f"Inference: {inference_ms:.2f} ms", (20, 100), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)

    # Görüntüyü göster
    cv2.imshow("Quantum UAV - RTX 4050 Performance Test", annotated_frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()

import cv2

kare = cv2.imread("kare.jpg")
if kare is None:
    raise FileNotFoundError("kare.jpg bulunamadı; giriş fotoğrafını aynı klasöre koy.")
hsv = cv2.cvtColor(kare, cv2.COLOR_BGR2HSV)

# Kırmızı, HSV ton ekseninin iki ucunda: 0-10 ve 170-180
maske = cv2.inRange(hsv, (0, 120, 70), (10, 255, 255))
maske |= cv2.inRange(hsv, (170, 120, 70), (180, 255, 255))

cv2.imwrite("maske.png", maske)

konturlar, _ = cv2.findContours(maske, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
for c in konturlar:
    if cv2.contourArea(c) < 500:                # küçük gürültüyü at
        continue
    yaklasik = cv2.approxPolyDP(c, 0.04 * cv2.arcLength(c, True), True)
    if len(yaklasik) == 4:                      # dört köşe: kare ya da dikdörtgen
        x, y, w, h = cv2.boundingRect(yaklasik)
        cv2.rectangle(kare, (x, y), (x + w, y + h), (0, 255, 0), 2)

cv2.imwrite("sonuc.jpg", kare)
import matplotlib.pyplot as plt

dt = 0.05
kp, ki, kd = 1.0, 0.3, 0.3        # ki = 0 yapınca rüzgâr yüzünden 0,6 m kalıcı hata kalır
ruzgar = -0.6                     # aracı geri iten sabit rüzgâr (m/s)
hedef, konum, hiz = 20.0, 0.0, 0.0
integral, onceki_hata = 0.0, hedef
zaman, konumlar = [], []

for adim in range(600):
    hata = hedef - konum
    integral = max(-5.0, min(5.0, integral + hata * dt))   # birikimi sınırla (anti-windup)
    turev = (hata - onceki_hata) / dt
    onceki_hata = hata

    komut = kp * hata + ki * integral + kd * turev   # istenen hız (m/s)
    komut = max(-5.0, min(5.0, komut))              # hız sınırı
    hiz += (komut - hiz) * 0.15                     # aracın gecikmeli tepkisi
    konum += (hiz + ruzgar) * dt

    zaman.append(adim * dt)
    konumlar.append(konum)

print(f"Kp={kp}, Ki={ki}, Kd={kd}; son konum={konum:.3f} m; son hata={hedef-konum:.3f} m")

plt.plot(zaman, konumlar, label="konum")
plt.axhline(hedef, linestyle="--", label="hedef")
plt.xlabel("Zaman (s)"); plt.ylabel("Konum (m)"); plt.legend(); plt.savefig("h10_pid_tepki.png", dpi=150); plt.show()
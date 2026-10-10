"""Обробка фото зі старого сайту info.vmu.ua: вирівнювання тонів, колір, різкість -> webp.

Запуск: python3 scripts/process-images.py <каталог зі старими фото> <каталог виводу>
Оригінали не змінюються.
"""
import sys, os
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
MAX_W = 1600

def enhance(im: Image.Image) -> Image.Image:
    im = im.convert("RGB")
    im = ImageOps.autocontrast(im, cutoff=0.4)           # чистіші тіні/світла
    im = ImageEnhance.Contrast(im).enhance(1.07)
    im = ImageEnhance.Color(im).enhance(1.12)            # соковитіший колір
    im = ImageEnhance.Brightness(im).enhance(1.03)
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=70, threshold=3))
    return im

for root, _, files in os.walk(src):
    for f in files:
        if not f.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        out = os.path.join(dst, os.path.splitext(f)[0].lower().replace("vmu_", "") + ".webp")
        enhance(Image.open(os.path.join(root, f))).save(out, "WEBP", quality=84, method=6)
        print(out)

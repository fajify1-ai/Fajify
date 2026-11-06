"""Generate original geometric B development icons; no reference artwork is copied.
Run from apps/business_mobile with Pillow installed. Replace with approved brand
artwork before store distribution. PNGs are generated from this code-native mark.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json

root = Path(__file__).resolve().parents[1]

def icon(path, size):
    image = Image.new('RGB', (1024, 1024), '#FA3F38')
    d = ImageDraw.Draw(image)
    # Monoline B development identifier, deliberately distinct from the Faji logo.
    d.line([(330, 760), (330, 264), (535, 264)], fill='white', width=65)
    d.arc((400, 264, 700, 520), -90, 90, fill='white', width=65)
    d.line([(535, 520), (330, 520)], fill='white', width=65)
    d.arc((400, 520, 710, 760), -90, 90, fill='white', width=65)
    d.line([(535, 760), (330, 760)], fill='white', width=65)
    path.parent.mkdir(parents=True, exist_ok=True)
    image.resize((size, size), Image.Resampling.LANCZOS).save(path)

for density, size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    icon(root / f'android/app/src/main/res/mipmap-{density}/ic_launcher.png', size)
for entry in json.loads((root/'ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json').read_text())['images']:
    size = round(float(entry['size'].split('x')[0]) * float(entry['scale'][:-1]))
    icon(root/'ios/Runner/Assets.xcassets/AppIcon.appiconset'/entry['filename'], size)
for size in [192,512]:
    for prefix in ['Icon-', 'Icon-maskable-']:
        icon(root/f'web/icons/{prefix}{size}.png',size)
icon(root/'web/favicon.png',32)
for scale in [1,2,3]:
    icon(root/f'ios/Runner/Assets.xcassets/LaunchImage.imageset/LaunchImage{"" if scale==1 else "@"+str(scale)+"x"}.png',96*scale)

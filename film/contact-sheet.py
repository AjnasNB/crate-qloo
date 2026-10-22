"""Review the delivered encoding, not source snapshots. Requires FFmpeg and Pillow."""
import io
import json
import pathlib
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent
FILM = ROOT / 'renders/crate-live-demo.mp4'
OUT = ROOT / 'renders/encoded-review'
OUT.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype(str(ROOT / 'assets/local-fonts/segoeui.ttf'), 19)
raw = subprocess.run([
    'ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(FILM),
    '-vf', 'select=not(mod(n\,30)),scale=384:216', '-fps_mode', 'passthrough',
    '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'
], check=True, stdout=subprocess.PIPE).stdout
size = 384 * 216 * 3
count = len(raw) // size
sheet = Image.new('RGB', (5 * 392 + 8, ((count + 4) // 5) * 252 + 8), '#172d2b')
draw = ImageDraw.Draw(sheet)
for second in range(count):
    image = Image.frombytes('RGB', (384, 216), raw[second*size:(second+1)*size])
    x, y = 8 + second % 5 * 392, 8 + second // 5 * 252
    sheet.paste(image, (x, y))
    draw.text((x + 8, y + 221), f'{second:02d} s · encoded MP4', fill='#f4f6f1', font=font)
sheet.save(OUT / 'every-second.jpg', quality=94)
times = [0.5, 4, 6.2, 7.8, 9.4, 11.4, 16, 18, 22.2, 25.6, 29.2, 30.5, 31.5, 32.5, 33.0]
for time in times:
    data = subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(time), '-i', str(FILM),
        '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'mjpeg', '-q:v', '2', '-'
    ], check=True, stdout=subprocess.PIPE).stdout
    (OUT / f'frame-{time:04.1f}.jpg').write_bytes(data)
    if time == 25.6:
        (ROOT / 'renders/crate-live-demo-poster.jpg').write_bytes(data)
print(json.dumps({'perSecondSamples':count, 'criticalFrames':len(times), 'output':str(OUT)}))

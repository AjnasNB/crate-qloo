"""Reproduce stock-voice narration locally; no network or paid API calls."""
import json, os, pathlib
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = pathlib.Path(__file__).resolve().parent
CACHE = pathlib.Path(os.environ.get('CRATE_TTS_CACHE', str(pathlib.Path.home() / '.cache/hyperframes/tts')))
DEST = ROOT / 'assets/audio'
DEST.mkdir(parents=True, exist_ok=True)
voice = Kokoro(str(CACHE / 'models/kokoro-v1.0.onnx'), str(CACHE / 'voices/voices-v1.0.bin'))
lines = json.loads((ROOT / 'narration.json').read_text(encoding='utf-8'))
cursor, chunks, records = .25, [], []
sr = 24000
chunks.append(np.zeros(round(cursor*sr), dtype=np.float32))
for line in lines:
    audio, sr = voice.create(line['text'], voice='af_heart', speed=.90, lang='en-us')
    active = np.flatnonzero(np.abs(audio) > .004)
    if len(active):
        audio = audio[max(0, active[0]-round(.06*sr)):min(len(audio), active[-1]+round(.12*sr))]
    duration = len(audio)/sr
    sf.write(str(DEST / (line['id'] + '.wav')), audio, sr)
    records.append({**line, 'start': round(cursor, 4), 'duration': round(duration, 4), 'end': round(cursor+duration, 4)})
    chunks.append(audio)
    gap = .9 if line['id'] in ['evidence','credit'] else .45
    chunks.append(np.zeros(round(gap*sr), dtype=np.float32))
    cursor += duration + gap
sf.write(str(DEST/'narration-raw.wav'), np.concatenate(chunks), sr)
timing = {'provider':'Kokoro-82M v1.0 local ONNX', 'voice':'af_heart', 'speed':.90, 'sampleRate':sr, 'duration':round(cursor,4), 'lines':records}
(DEST/'timing.json').write_text(json.dumps(timing, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps(timing, indent=2, ensure_ascii=False), flush=True)

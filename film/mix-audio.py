"""Original deterministic material contact accent and local narration mix."""
import json, pathlib, subprocess
import numpy as np
import soundfile as sf

ROOT=pathlib.Path(__file__).resolve().parent
DEST=ROOT/'assets/audio'
timing=json.loads((DEST/'timing.json').read_text(encoding='utf-8'))
sr=48000
duration=np.ceil((timing['lines'][-1]['end']+.45)*30)/30
timing['duration']=float(duration)
(DEST/'timing.json').write_text(json.dumps(timing,indent=2,ensure_ascii=False),encoding='utf-8')
mix=np.zeros(round(duration*sr),dtype=np.float32)
for line in timing['lines']:
    raw, rate=sf.read(str(DEST/(line['id']+'.wav')),dtype='float32')
    audio=np.interp(np.arange(round(len(raw)/rate*sr))/sr,np.arange(len(raw))/rate,raw)
    start=round(line['start']*sr)
    mix[start:start+len(audio)]+=audio[:len(mix)-start]

# Authored synthesis, not a sampled recording: muted wood-like knock and page friction.
t=np.arange(round(.24*sr))/sr
rng=np.random.default_rng(20261022)
noise=rng.normal(size=len(t)).astype(np.float32)
noise=np.convolve(noise,np.ones(11)/11,mode='same')
contact=(np.sin(2*np.pi*(155*t-40*t*t))*np.exp(-t*38)*.22 + noise*np.exp(-t*60)*.13)*np.minimum(t/.002,1)
sf.write(str(DEST/'contact.wav'),contact,sr)
cues={line['id']:line['start'] for line in timing['lines']}
events=[cues['pack']+.8,cues['lock']+.45,cues['repair']+1.35]
for start in events:
    offset=round(start*sr)
    mix[offset:offset+len(contact)]+=contact*.28
sf.write(str(DEST/'mix-unmastered.wav'),mix,sr)
subprocess.run(['ffmpeg','-hide_banner','-y','-i',str(DEST/'mix-unmastered.wav'),'-af','loudnorm=I=-16:TP=-1.5:LRA=7','-ar','48000',str(DEST/'mix.wav')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
print(json.dumps({'duration':duration,'sfxTimes':events,'sfx':'Original procedural contact.wav','voice':'Kokoro af_heart; local stock synthetic voice'}))

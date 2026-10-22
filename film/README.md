# Crate — live motion demo

Developed by Ajnas N B

This new 33⅙-second film shows the recorded live Qloo case from the direct Cloudflare deployment. It is separate from the earlier synthetic motion prototype. Its physical books and crates explain the real planner output; the programme and evidence fragments are actual app captures.

The final MP4 is generated at `renders/crate-live-demo.mp4`. The folder is ignored so raw frames, caches and large delivery media do not enter Git. The English captions are `assets/crate-live-demo.vtt`; their boundaries come from the generated narration clips, not estimated reading times. A final poster and encoded contact sheets are also generated under `renders/`.

## Reproduce the film

Use Node.js 24, FFmpeg/ffprobe, and licensed Georgia/Segoe UI font files. Windows can use its existing font installation. On another system set `CRATE_FONT_DIR` to your own licensed font folder containing `georgia.ttf`, `segoeui.ttf` and `segoeuib.ttf`. Georgia and Segoe UI font binaries are not provided; the optional vendored Inter font retains its OFL license. No Qloo key, model download or provider sign-in is needed to render the frozen film.

From this folder:

```sh
npm run prepare
npm run check
npm run render
```

The pinned HyperFrames CLI is 0.8.185. Rendering uses one worker and requests a hardware WebGL browser, as used for the measured delivery. The command allows two minutes for shader compilation and seek verification, and disables the extracted-frame cache to bound disk use. It needs a compatible Chrome/Chromium installation; rendering time and pixels can vary by GPU. `prepare-data.mjs` checks the minimal derived live ranks against the app's exact solver, including the stock-out repair and unchanged protected crate. `prepare.mjs` creates its ignored output directory and embeds the local source into `index.html` for the HyperFrames compiler. `film.js` remains the editable motion source; rerun prepare after edits. Do not edit the generated inline copy separately.

For the local editable timeline, run `npm run dev`. There is no publish command: deployment and public hosting belong to the app's direct Cloudflare workflow.

## Audio and verification

The checked-in mix and individual narration WAVs allow rendering without a speech model. To regenerate narration, install the supported Kokoro ONNX runtime and provide the existing model/voice pack using `CRATE_TTS_CACHE`, then run `python synthesize.py`, `python mix-audio.py` and `node prepare.mjs`. The scripts use only local engines. `mix-audio.py` also reproduces the original contact accent. Regenerating voice can change timing; inspect and revalidate the result.

`node seek-check.mjs` verifies 18 sequential-versus-jumped frame samples using the skill's isolated local composition renderer. On Windows set `CHROME_PATH` to the Chrome executable for that diagnostic. It never attaches to an existing browser.

After rendering:

```sh
python tools/look.py renders/crate-live-demo.mp4 --out renders/look-final --events renders/events.json --expect 33.166667 --expect-audio --strict
node tools/lint.mjs index.html --json
node verify-film.mjs
python contact-sheet.py
```

See `NOTE.md`, `REVIEW.md`, `qa/` and `THIRD_PARTY_NOTICES.md` for measured results, source provenance, actual revisions and limits. Customer usefulness, event bookings, sales effects and contest outcomes are not established by this film.

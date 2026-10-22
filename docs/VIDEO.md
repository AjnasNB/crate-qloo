# Crate live Qloo motion film

Developed by Ajnas N B

[Watch on Cloudflare](https://crate-qloo.ajnasnb.workers.dev/demo) · [Rendered release and captions](https://github.com/AjnasNB/crate-qloo/releases/tag/v0.3.0-live-motion) · [Editable source](../film/README.md)

The October 22 film follows one physical case: The Dispossessed has one copy, two cultural stalls share the stockroom, and live Qloo orders guide an exact allocation. After that copy sells out, Soul & City stays packed while Kindred fills Future Frequencies' vacancy. Seven of the eight original title/stall placements remain.

This is a continuous 3D packing-table film with camera moves, moving books, a protective strap and a travelling brand close. Actual programme inputs and live evidence captures precede the physical packing. The recorded response and later UI capture have different timestamps, explicitly distinguished in [the provenance note](../film/NOTE.md). Events and stock are fictional; book surfaces are original explanatory drawings, not publisher covers.

## Rendered delivery

- Duration: 33.166667 seconds; 995 frames at 30 fps.
- Picture: 1920 × 1080, H.264/yuv420p.
- Audio: AAC, stereo, 48 kHz; −13.2 LUFS integrated, −1.5 dBFS true peak.
- MP4: 17,455,515 bytes, SHA-256 db971723683eb6ae3f8bb0865f025fe9926566e453c1f7a5fc990b7746763db8.
- Nine English WebVTT cues use measured narration-clip boundaries without overlap or out-of-film timestamps.

The public GitHub MP4 and direct Cloudflare MP4 were fetched in full and matched the local reviewed hash. Poster and WebVTT bytes also match their delivery digests. The native Cloudflare player completed playback at 33.166667 seconds, with audio unmuted, visible captions and no media error. Player navigation and byte-range delivery are verified separately in [the Cloudflare release record](CLOUDFLARE.md).

## Review and actual corrections

The original full encoding failed its ending gate with a 2.50-second static hold. The corrected encoding passes G0/G2/G3/G5; the final hold is 0.87 seconds and the closing shot occupies 9% of the film. Other actual fixes cover blank WebGL output, hidden overlays, pale materials, copy/object collisions and missing cultural input context. The accepted file is the second full encoding.

Full audio/video decode and encoded empty-frame analysis cover the entire file. Independent visual review covers 34 exact-second samples and ten critical full frames, including every sampled closing position. Proof readability and focal hierarchy pass that sampled review. This is not perceptual inspection of every frame. Eighteen sequential-versus-jumped seeks find zero mismatches across 32 elements and one canvas. DOM-only motion/contrast warnings do not measure the WebGL world; decoded images were reviewed separately.

Narration uses the local Kokoro-82M stock voice af_heart, with original procedural contact accents and no music bed. No person was recorded, cloned or imitated. Encoded speech was transcribed locally and checked against the causal script. Proper-name transcription remains uncertain; audio was measured and transcribed, not perceptually heard. Intentional narration breaths and a 0.56-second detected silent tail remain documented. Mean pixel motion is below the tool's reference band, with a deliberate short table overview.

[Source, component notices and reproduction instructions](../film/README.md), [24 distinct review criteria and exact-second descriptions](../film/REVIEW.md), and [portable measured reports](../film/qa/) retain these limits. Crate code is MIT; vendored components keep their respective licenses. Proprietary app font binaries, model weights, credentials and raw API traces are excluded.

## Historical prototypes

The [October 17 motion prototype record](VIDEO-PROTOTYPE.md) describes the earlier 40-second synthetic film. Its release remains unchanged and is superseded by the current live-evidence film. Neither film establishes customer usefulness, time savings, sales effects or a contest outcome.

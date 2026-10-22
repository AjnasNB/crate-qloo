# Sources and licenses

Developed by Ajnas N B

Crate's film composition, original procedural contact effect and preparation scripts are covered by the project's MIT LICENSE. Book cover surfaces are explanatory title/author drawings in the app's actual sample colours, not publisher artwork. The supplied Crate SVG is copied unchanged from `../public/favicon.svg`.

Actual app captures show the user's direct Cloudflare Worker. They were supplied from the parent evidence folder and are used without changing displayed data. The derived rank record preserves only mode, retrieval time, local candidate identifiers, ordered identifiers and coverage. Full API responses, traces, request parameters, downloaded data, credentials and model weights are excluded from Git.

| Component | Source and license |
| --- | --- |
| Motion frame runtime and hero3d helper | motionmaxxing, https://github.com/Tejashmakwana/motionmaxxing. Apache-2.0; full license and original NOTICE are in `licenses/`. Runtime files are unchanged copies. |
| GSAP 3.12.5 | Bundled by that runtime. Copyright GreenSock; GSAP Standard License, https://gsap.com/standard-license/. Page text retained in `licenses/GSAP-LICENSE.txt`; this is separate from the project's MIT license. |
| Three.js r186 | MIT, with full notice in `runtime/hero3d/vendor/three.LICENSE`. Its addons retain embedded notices, including EXRLoader's BSD notices. |
| OpenType.js | MIT, `runtime/hero3d/vendor/opentype.LICENSE`. |
| fflate | MIT, Copyright Arjun Barrett; full text in `licenses/fflate-MIT.txt`, embedded source in the Three addon dependency. |
| Inter font bundled with the optional hero text runtime | SIL Open Font License in `runtime/hero3d/fonts/`. The film's principal app typography uses local fonts below. |
| Georgia and Segoe UI | Existing licensed Windows font installations. Their binaries are ignored and not redistributed. `setup-fonts.mjs` requires the renderer's own licensed copies. |
| Kokoro-82M v1.0 stock voice, af_heart | Model source https://huggingface.co/hexgrad/Kokoro-82M, Apache-2.0. Local ONNX engine https://github.com/thewh1teagle/kokoro-onnx, MIT. Generated narration is supplied; model weights and voice embeddings are not redistributed. No person was cloned, recorded or imitated for this film. |
| Local synthesis dependencies | ONNX Runtime (MIT), NumPy (BSD-3-Clause), SoundFile (BSD-3-Clause, backed by libsndfile), eSpeak NG phonemization (GPL runtime). No runtime binaries are redistributed. |
| Local speech verification | Parakeet TDT 0.6B v3 through HyperFrames' sherpa-onnx setup; https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3 and https://github.com/k2-fsa/sherpa-onnx. Model weights are not redistributed. |
| HyperFrames 0.8.185 | Apache-2.0 CLI, invoked by the pinned package scripts. The CLI binary and package cache are not redistributed. |
| FFmpeg/ffprobe | Existing local tools for mixing, encoding and measurement. Binaries are not redistributed. |

`assets/audio/contact.wav` is an original deterministic synthesis from a decaying tone and seeded filtered noise. It is not a sampled third-party recording. `mix-audio.py` reproduces it and places three quiet accents under the narration. The earlier evaluated bundled MP3 is ignored and is not used in the final mix or source delivery.

No paid voice, music, image or video generation was used. No Qloo or Cloudflare logo artwork is included and no partnership is represented.

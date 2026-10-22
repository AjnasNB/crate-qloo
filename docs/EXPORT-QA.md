# Export and print verification — October 22, 2026

Developed by Ajnas N B

The fixes were introduced in `99fe9dfee846b826779c9ff02731e4770ae377f3`. The current public app is [Crate on Cloudflare](https://crate-qloo.ajnasnb.workers.dev), source `8df452b`; its server secret and live integration passed after migration. The first payload hashes below belong to the earlier deployment and are preserved as dated evidence. [Direct deployment record](CLOUDFLARE.md).

## Direct Cloudflare recheck

At **07:37:24.327 UTC**, the new origin returned live Qloo evidence for all twelve titles in each programme and packed eight placements. The actual JSON download-link bytes matched the expanded visible snapshot exactly (8,726 bytes). Initial and repaired manifest URLs were decoded to files outside Git in `evidence/cloudflare-export-check/`. This reads the link payload; it is not a completed browser download.

After locking Soul & City and setting The Dispossessed stock to zero, the manifest had no URL and print data contained zero rows with `data-ready=false`. Repair replaced that title with Kindred, kept B's four titles unchanged, and restored eight print rows with the original timestamp. The browser console contained no errors. A screenshot is retained outside Git as `evidence/crate-cloudflare-live-repair-oct22.png`.

An independent strict CSV/JSON parse confirmed UTF-8 BOMs on both manifests, eight one-copy placements, four per stall, and the original timestamp on every row. B's order and membership remained `b8,b7,b10,b6`; A changed from `b7,b3,b2,b5` to `b7,b2,b5,b1`. The JSON has no BOM and covers twelve unique candidates in each profile. SHA-256: JSON `79392f78549f9695e51774996ad5a11ab894ffa1daa4ab02c81c2909d184db94`; initial manifest `88d40fe8557392cfaa41e08993b9c3ec70dbcfeccedc263afc6115b51b56e189`; repaired manifest `6c83e76adc1e41275028b323362131c6e154ec1d8b82541295405fdb27aafb71`.

## Saved live files and actual-plan PDFs

At the user's request, the verified manifest/evidence payloads were saved directly in the parent workspace's `evidence/verified-export-files/`. A4 and Letter PDFs were generated from those actual initial manifest rows using the application's `PrintManifests` component and print CSS, with book/author/source fields checked against the saved rows. WeasyPrint 70 produced two pages per paper size. All four pages were visually inspected: complete tables and intact display cards, no visible clipping. Text/bounds checks confirmed every title twice per placement (table and card), source timestamp on every page and all text within the 16 mm margins.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `crate-live-packing-a4.pdf` | 20,611 | `2b0b47a22e12e9b2728ffd3b627adc05778116f5e8451b231fc83631d2458219` |
| `crate-live-packing-letter.pdf` | 20,566 | `00e9e95e2174ceca212ed207f6dddecde60b04b94f06cf348c1e6e56073f4ae6` |

The folder includes the original and repaired CSVs, evidence JSON, rendered HTML, four page PNGs and a machine-readable verification report. These are actual saved local artifacts. They do not establish that Chrome's native download/Save as PDF action completed, and no physical printer was used.

## Findings and fixes

| Finding | Resulting behavior |
| --- | --- |
| CSV had no encoding marker, which can misread accented names when opened directly in Excel. | CSV file links contain exactly one UTF-8 BOM. JSON bytes are unchanged. |
| Imperative Blob clicks were difficult to inspect and used timed URL revocation. | Exports are ordinary bounded UTF-8/base64 download links. Unavailable exports have no URL. Stock stays in the browser. |
| Valid long titles/SKUs could expand print columns beyond the paper. | Fixed table widths, word wrapping, shrinking grid columns and card/row break protection retain long labels. |
| Native Ctrl+P could include an old packing list with only a header warning. | A stale, missing or busy plan renders a warning and no packing rows or display cards. |

Spreadsheet formula protection remains active. A CSV containing formula-prefixed labels is deliberately neutralized and is not an exact archival restore format.

## Public workflow and file contents

The version 9 browser fetched genuine Qloo evidence at **07:15:24.230 UTC**, returning 12/12 titles for each programme. It packed eight placements. After locking Soul & City and setting The Dispossessed quantity to zero, the export URL disappeared and the print component contained zero rows. Repair replaced that title with Kindred, restored the export and print data, and preserved Soul & City's four placements exactly. The stock repair reused the original evidence and timestamp.

File bytes were saved **from the actual public download-link URLs**, not from test fixtures or a completed browser download event. CSV parsing verified twelve inventory records, eight initial/repaired copies, stock/reserve safety, unchanged protected-crate membership and the live source/timestamp on every manifest row. The evidence file matched the displayed original JSON byte for byte and contained live mode with both 12-title orders.

| Payload | Bytes | SHA-256 |
| --- | ---: | --- |
| Inventory template CSV | 968 | `ade23b638fe8f32a781f61bd51d140f5dcf86628bfb54a6e95a2860e4980d1e6` |
| Edited stock CSV | 968 | `52740a1dd68d1abe1a7fdbd7ac2f9dd08f2ef98dd43158ef30f15cec4acb4618` |
| Initial manifest CSV | 1,419 | `e856ae9833a72b662968d7f6acd4f25454d85fb337bf193b18e117f28a9b5560` |
| Repaired manifest CSV | 1,410 | `71acc81f94f0aaee71bfc1c66cab0a20bbbc93ebbf017e0304408fc1d07da9ca` |
| Evidence JSON | 8,726 | `514f12b9e4d27536b8fa5745d22c50170064b3073848460563d5183d96a9d8d4` |

These local files and the browser screenshot are outside Git in the parent workspace's `evidence/export-payload-check/` and `evidence/crate-v9-exports-repair-oct22.png`.

## Paginated layout verification

The fixture tool renders the application's actual `PrintManifests` React component and print CSS. It does not automate a browser or substitute a separately designed PDF. WeasyPrint **70.0** produced:

| Fixture | Pages | Checks |
| --- | ---: | --- |
| Four-title sample, A4 | 2 | One stall per starting page; eight cards and readable manifests. |
| Six-title stalls, A4 | 8 | All twelve long titles retained in tables and cards: 24 complete occurrences. |
| Six-title stalls, Letter | 8 | Same content checks at Letter width and height. |
| Stale plan, A4 | 1 | Warning only; no old packing rows or cards. |

The long fixture uses valid 79–80-character SKUs, 238–239-character titles and 153-character authors, including unbroken text, Unicode, quotes and an embedded newline. Text bounds stayed within page margins across all nineteen pages. Source/timestamp text appeared on every page. Representative manifest, continuation-card and stale-page PNGs were visually inspected; cards were intact without visible clipping. This is a paged-renderer check, not proof of Chrome's native pagination or physical printer behavior.

Reproduce after creating an ignored `outputs/` directory:

```sh
node scripts/print-fixture.mjs sample A4 outputs/print-sample-a4.html
node scripts/print-fixture.mjs long A4 outputs/print-long-a4.html
node scripts/print-fixture.mjs long Letter outputs/print-long-letter.html
node scripts/print-fixture.mjs stale A4 outputs/print-stale-a4.html
weasyprint outputs/print-long-a4.html outputs/print-long-a4.pdf
```

The generated HTML contains only escaped sample data and the project's CSS. WeasyPrint's warnings about unsupported screen-only CSS do not establish browser defects. No raw API response, personal verification image or runtime download is versioned.

## Checks and remaining boundary

The export implementation passed **63 tests**, TypeScript and production build; the direct Worker adds six request-boundary tests for **69 passing tests** overall. The five download checks cover Unicode/BOM/quoting, JSON bytes, eighteen maximum-length records, byte limits and unpaired surrogates. An independent source review found no blocking defect. The static UX scan found mostly generated/vendor and unused starter-component signals; those were not treated as confirmed defects in this focused flow.

The browser's file-capture API explicitly does not support Blob downloads; later download event/data-link capture also timed out. Its native print action blocked the automation input response. A further manifest-link click on the current Cloudflare deployment returned without a page error, but no saved file appeared at the inspected default Downloads path. Consequently, **completed native-browser file saving, Chrome print-preview/PDF saving and physical printing remain unverified**. The saved local CSV/JSON and checked PDFs described above were produced and inspected directly; no manual files are owed by the user. The native-dialog boundary must not be relabeled passed from those separate checks.

Crate's existing hackathon submission remains submitted. The [official deadline](https://qloo.devpost.com/) checked on October 22 is October 30, 2026 at 11:45 p.m. EDT, equivalent to **October 31, 2026 at 9:15 a.m. IST**. Customer usefulness, organizer eligibility decisions and a winning probability are not established by these checks.

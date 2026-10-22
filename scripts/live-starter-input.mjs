/** Fixed work identities reviewed on 2026-10-22; no credential or API call. */
import { SAMPLE_BOOKS, SAMPLE_EVENTS } from '../lib/sample.ts';
import { validateChangedProgramme } from '../tests/live-smoke.mjs';

const input = {
  review: {
    identitiesConfirmed: true,
    reviewedAt: '2026-10-22',
    scope: 'Fixed starter works reviewed against live title/author and programme metadata; not ISBN editions or customer taste validation. See docs/LIVE-QLOO.md. Re-review any edited catalogue.',
  },
  books: SAMPLE_BOOKS,
  events: SAMPLE_EVENTS,
  changedEvent: { id: 'a', anchors: [{ name: 'Amélie', type: 'movie', entityId: 'b7a0731f-ec92-496a-9c40-47d9770489b6' }] },
};
validateChangedProgramme(input);
process.stdout.write(`${JSON.stringify(input, null, 2)}\n`);

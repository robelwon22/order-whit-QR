import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isValidBusinessDay, shiftBusinessDay } from '../lib/businessDayDate.mjs';

describe('business-day date strings', () => {
  it('shifts dates across month and year boundaries without local-time conversion', () => {
    assert.equal(shiftBusinessDay('2026-01-01', -1), '2025-12-31');
    assert.equal(shiftBusinessDay('2026-12-31', 1), '2027-01-01');
  });

  it('handles leap days and the 365-day picker boundary', () => {
    assert.equal(shiftBusinessDay('2024-02-29', 1), '2024-03-01');
    assert.equal(shiftBusinessDay('2024-03-01', -1), '2024-02-29');
    assert.equal(shiftBusinessDay('2026-10-26', -365), '2025-10-26');
  });

  it('rejects malformed or impossible business dates', () => {
    assert.equal(isValidBusinessDay('2026-02-29'), false);
    assert.equal(isValidBusinessDay('2024-02-29'), true);
    assert.equal(isValidBusinessDay('2026-2-01'), false);
    assert.equal(shiftBusinessDay('not-a-date', 1), '');
  });
});

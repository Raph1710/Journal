import assert from 'node:assert';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { getMidnightISO, getFormattedToday, generateCommitSummary } from '../src/summarizer.js';
import { buildPrefilledUrl } from '../src/urlBuilder.js';
import { isSunday, persistStorageState } from '../src/submit.js';
import { config } from '../src/config.js';

test('isSunday correctly detects Sunday vs non-Sunday', () => {
  const sundayDate = new Date('2026-08-09T12:00:00Z');
  const mondayDate = new Date('2026-08-10T12:00:00Z');

  assert.strictEqual(isSunday('UTC', sundayDate), true);
  assert.strictEqual(isSunday('UTC', mondayDate), false);
});

test('buildPrefilledUrl generates valid Google Form pre-filled URL', () => {
  const formId = '1FAIpQLSc_EXAMPLE_FORM_ID';
  const entryMap = { 'entry.123456789': 'Test response text' };

  const url = buildPrefilledUrl({
    formId,
    entryMap,
  });

  assert.ok(url.startsWith(`https://docs.google.com/forms/d/e/${formId}/viewform?usp=pp_url`));
  assert.ok(url.includes('entry.123456789=Test%20response%20text'));
});

test('buildPrefilledUrl handles raw form URL as formId', () => {
  const rawFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSc_EXTRACTED_ID/viewform';
  const entryMap = { '123456': 'Test text' };

  const url = buildPrefilledUrl({
    formId: rawFormUrl,
    entryMap,
  });

  assert.ok(url.startsWith('https://docs.google.com/forms/d/e/1FAIpQLSc_EXTRACTED_ID/viewform?usp=pp_url&entry.123456=Test%20text'));
});

test('buildPrefilledUrl maps multi-field ENTRY_MAP correctly', () => {
  const formId = 'TEST_ID';
  const entryMap = {
    'entry.187493348': 'Present',
    'entry.32162408': 'Key tasks done',
    'entry.199221807': 'None',
  };

  const url = buildPrefilledUrl({ formId, entryMap });
  assert.ok(url.includes('entry.187493348=Present'));
  assert.ok(url.includes('entry.32162408=Key%20tasks%20done'));
  assert.ok(url.includes('entry.199221807=None'));
});

test('getFormattedToday formats YYYY-MM-DD correctly', () => {
  const date = new Date('2026-08-10T10:00:00Z');
  const formatted = getFormattedToday('UTC', date);
  assert.strictEqual(formatted, '2026-08-10');
});

test('getMidnightISO returns correct UTC ISO for target timezone midnight', () => {
  const refDate = new Date('2026-08-10T10:00:00Z');
  const iso = getMidnightISO('Asia/Kolkata', refDate);
  assert.strictEqual(iso, '2026-08-09T18:30:00.000Z');
});

test('buildPrefilledUrl handles null, undefined, or empty entryMap safely', () => {
  const urlNull = buildPrefilledUrl({ formId: 'TEST_ID', entryMap: null });
  assert.ok(urlNull.includes('entry.187493348='));

  const urlEmptyObj = buildPrefilledUrl({ formId: 'TEST_ID', entryMap: {} });
  assert.ok(urlEmptyObj.includes('entry.187493348='));
});

test('generateCommitSummary returns default summary text gracefully when offline or unconfigured', async () => {
  const summary = await generateCommitSummary({});
  assert.ok(typeof summary === 'string');
  assert.ok(summary.length > 10);
});

test('config parses dryRun setting correctly', () => {
  assert.strictEqual(typeof config.dryRun, 'boolean');
});

test('isSunday handles invalid date objects gracefully', () => {
  assert.strictEqual(typeof isSunday('UTC', new Date('invalid')), 'boolean');
});

test('buildPrefilledUrl preserves falsy values like 0 and boolean false', () => {
  const url = buildPrefilledUrl({
    formId: 'TEST_ID',
    entryMap: { 'entry.100': 0, 'entry.200': false },
    journalSummaryText: 'Default text',
  });
  assert.ok(url.includes('entry.100=0'));
  assert.ok(url.includes('entry.200=false'));
});

test('buildPrefilledUrl handles single entry ID string entryMap', () => {
  const url = buildPrefilledUrl({
    formId: 'TEST_ID',
    entryMap: 'entry.999',
    journalSummaryText: 'Summary for single field',
  });
  assert.ok(url.includes('entry.999=Summary%20for%20single%20field'));
});

test('getMidnightISO and getFormattedToday handle invalid dates and fallback timezones gracefully', () => {
  const iso = getMidnightISO('Invalid/Timezone', new Date('invalid'));
  assert.ok(typeof iso === 'string' && iso.endsWith('Z'));

  const formatted = getFormattedToday('Invalid/Timezone', new Date('invalid'));
  assert.match(formatted, /^\d{4}-\d{2}-\d{2}$/);
});

test('persistStorageState persists context cookies to destination file', async () => {
  const testDir = path.resolve('test-temp');
  const testFile = path.join(testDir, 'test-storage.json');

  const mockContext = {
    async storageState({ path: targetPath }) {
      fs.writeFileSync(targetPath, JSON.stringify({ cookies: [{ name: 'TEST_COOKIE', value: '123' }] }));
    },
  };

  const success = await persistStorageState(mockContext, testFile);
  assert.strictEqual(success, true);
  assert.ok(fs.existsSync(testFile));

  const parsed = JSON.parse(fs.readFileSync(testFile, 'utf8'));
  assert.strictEqual(parsed.cookies[0].name, 'TEST_COOKIE');

  // Clean up
  fs.rmSync(testDir, { recursive: true, force: true });
});


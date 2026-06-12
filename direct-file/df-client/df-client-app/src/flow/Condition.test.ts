import { FakeFactGraph, FakePlaceholder } from '../misc/factgraphTestHelpers.js';
import { Condition } from './Condition.js';

import { store } from '../redux/store.js';
import { testDataImportProfileConfig } from '../redux/slices/data-import/DevDataImportConfig.js';
import { DataImportProfileState } from '../redux/slices/data-import/dataImportProfileSlice.js';
import { initialState } from '../redux/slices/tax-return/taxReturnSlice.js';
import { initialState as initialTelemetryState } from '../redux/slices/telemetry/telemetrySlice.js';
import { initialState as initialESigState } from '../redux/slices/electronic-signature/electronicSignatureSlice.js';

import { initialSystemAlertState } from '../redux/slices/system-alert/systemAlertSlice.js';
import { vi } from 'vitest';

vi.mock(`../redux/store.js`);

const mockState = {
  data: {
    profile: testDataImportProfileConfig.marge(),
    status: `complete`,
    createdAt: ``,
  },
};

// in this point store.getState is going to be mocked
store.getState = () => {
  return {
    taxReturns: initialState,
    systemAlert: initialSystemAlertState,
    telemetry: initialTelemetryState,
    electronicSignature: initialESigState,
    dataImportProfile: mockState as DataImportProfileState,
  };
};

describe(`Condition`, () => {
  it(`isTrue`, () => {
    const fgIncomplete = new FakeFactGraph(new Map([[`/isMarried`, null]]));
    const fgCompleteTrue = new FakeFactGraph(new Map([[`/isMarried`, true]]));
    const fgCompleteFalse = new FakeFactGraph(new Map([[`/isMarried`, false]]));
    const fgPlaceholderTrue = new FakeFactGraph(new Map([[`/isMarried`, new FakePlaceholder(true)]]));
    const fgPlaceholderFalse = new FakeFactGraph(new Map([[`/isMarried`, new FakePlaceholder(false)]]));
    const fgPlaceholderIncomplete = new FakeFactGraph(new Map([[`/isMarried`, new FakePlaceholder(null)]]));
    const condition = new Condition(`/isMarried`);
    expect(condition.evaluate(fgIncomplete, null)).toBe(false);
    expect(condition.evaluate(fgCompleteFalse, null)).toBe(false);
    expect(condition.evaluate(fgCompleteTrue, null)).toBe(true);
    expect(condition.evaluate(fgPlaceholderTrue, null)).toBe(true);
    expect(condition.evaluate(fgPlaceholderFalse, null)).toBe(false);
    expect(condition.evaluate(fgPlaceholderIncomplete, null)).toBe(false);
  });
  it(`isTrueAndComplete`, () => {
    const fgIncomplete = new FakeFactGraph(new Map([[`/isMarried`, null]]));
    const fgCompleteTrue = new FakeFactGraph(new Map([[`/isMarried`, true]]));
    const fgCompleteFalse = new FakeFactGraph(new Map([[`/isMarried`, false]]));
    const fgPlaceholderTrue = new FakeFactGraph(new Map([[`/isMarried`, new FakePlaceholder(true)]]));
    const fgPlaceholderFalse = new FakeFactGraph(new Map([[`/isMarried`, new FakePlaceholder(false)]]));
    const fgPlaceholderIncomplete = new FakeFactGraph(new Map([[`/isMarried`, new FakePlaceholder(null)]]));
    const condition = new Condition({ operator: `isTrueAndComplete`, condition: `/isMarried` });
    expect(condition.evaluate(fgIncomplete, null)).toBe(false);
    expect(condition.evaluate(fgCompleteFalse, null)).toBe(false);
    expect(condition.evaluate(fgCompleteTrue, null)).toBe(true);
    expect(condition.evaluate(fgPlaceholderTrue, null)).toBe(false);
    expect(condition.evaluate(fgPlaceholderFalse, null)).toBe(false);
    expect(condition.evaluate(fgPlaceholderIncomplete, null)).toBe(false);
  });
  it(`isTrueOrIncomplete`, () => {
    const fgIncomplete = new FakeFactGraph(new Map([[`/isMarried`, null]]));
    const fgCompleteTrue = new FakeFactGraph(new Map([[`/isMarried`, true]]));
    const fgCompleteFalse = new FakeFactGraph(new Map([[`/isMarried`, false]]));
    const condition = new Condition({ operator: `isTrueOrIncomplete`, condition: `/isMarried` });
    expect(condition.evaluate(fgIncomplete, null)).toBe(true);
    expect(condition.evaluate(fgCompleteFalse, null)).toBe(false);
    expect(condition.evaluate(fgCompleteTrue, null)).toBe(true);
  });
  it(`isFalse`, () => {
    const fgIncomplete = new FakeFactGraph(new Map([[`/isMarried`, null]]));
    const fgCompleteTrue = new FakeFactGraph(new Map([[`/isMarried`, true]]));
    const fgCompleteFalse = new FakeFactGraph(new Map([[`/isMarried`, false]]));
    const fgPlaceholderTrue = new FakeFactGraph(new Map([[`/isMarried`, new FakePlaceholder(true)]]));
    const fgPlaceholderFalse = new FakeFactGraph(new Map([[`/isMarried`, new FakePlaceholder(false)]]));
    const fgPlaceholderIncomplete = new FakeFactGraph(new Map([[`/isMarried`, new FakePlaceholder(null)]]));
    const condition = new Condition({ operator: `isFalse`, condition: `/isMarried` });
    expect(condition.evaluate(fgIncomplete, null)).toBe(false);
    expect(condition.evaluate(fgCompleteFalse, null)).toBe(true);
    expect(condition.evaluate(fgCompleteTrue, null)).toBe(false);
    expect(condition.evaluate(fgPlaceholderTrue, null)).toBe(false);
    expect(condition.evaluate(fgPlaceholderFalse, null)).toBe(true);
    expect(condition.evaluate(fgPlaceholderIncomplete, null)).toBe(false);
  });
  it(`isFalseAndComplete`, () => {
    const fgIncomplete = new FakeFactGraph(new Map([[`/isMarried`, null]]));
    const fgCompleteTrue = new FakeFactGraph(new Map([[`/isMarried`, true]]));
    const fgCompleteFalse = new FakeFactGraph(new Map([[`/isMarried`, false]]));
    const fgPlaceholderTrue = new FakeFactGraph(new Map([[`/isMarried`, new FakePlaceholder(true)]]));
    const fgPlaceholderFalse = new FakeFactGraph(new Map([[`/isMarried`, new FakePlaceholder(false)]]));
    const fgPlaceholderIncomplete = new FakeFactGraph(new Map([[`/isMarried`, new FakePlaceholder(null)]]));
    const condition = new Condition({ operator: `isFalseAndComplete`, condition: `/isMarried` });
    expect(condition.evaluate(fgIncomplete, null)).toBe(false);
    expect(condition.evaluate(fgCompleteFalse, null)).toBe(true);
    expect(condition.evaluate(fgCompleteTrue, null)).toBe(false);
    expect(condition.evaluate(fgPlaceholderTrue, null)).toBe(false);
    expect(condition.evaluate(fgPlaceholderFalse, null)).toBe(false);
    expect(condition.evaluate(fgPlaceholderIncomplete, null)).toBe(false);
  });
  it(`isFalseOrIncomplete`, () => {
    const fgIncomplete = new FakeFactGraph(new Map([[`/isMarried`, null]]));
    const fgCompleteTrue = new FakeFactGraph(new Map([[`/isMarried`, true]]));
    const fgCompleteFalse = new FakeFactGraph(new Map([[`/isMarried`, false]]));
    const condition = new Condition({ operator: `isFalseOrIncomplete`, condition: `/isMarried` });
    expect(condition.evaluate(fgIncomplete, null)).toBe(true);
    expect(condition.evaluate(fgCompleteFalse, null)).toBe(true);
    expect(condition.evaluate(fgCompleteTrue, null)).toBe(false);
  });
  it(`isIncomplete`, () => {
    const fgIncomplete = new FakeFactGraph(new Map([[`/isMarried`, null]]));
    const fgCompleteTrue = new FakeFactGraph(new Map([[`/isMarried`, true]]));
    const fgCompleteFalse = new FakeFactGraph(new Map([[`/isMarried`, false]]));
    const condition = new Condition({ operator: `isIncomplete`, condition: `/isMarried` });
    expect(condition.evaluate(fgIncomplete, null)).toBe(true);
    expect(condition.evaluate(fgCompleteFalse, null)).toBe(false);
    expect(condition.evaluate(fgCompleteTrue, null)).toBe(false);
  });
  it(`isComplete`, () => {
    const fgIncomplete = new FakeFactGraph(new Map([[`/isMarried`, null]]));
    const fgCompleteTrue = new FakeFactGraph(new Map([[`/isMarried`, true]]));
    const fgCompleteFalse = new FakeFactGraph(new Map([[`/isMarried`, false]]));
    const condition = new Condition({ operator: `isComplete`, condition: `/isMarried` });
    expect(condition.evaluate(fgIncomplete, null)).toBe(false);
    expect(condition.evaluate(fgCompleteFalse, null)).toBe(true);
    expect(condition.evaluate(fgCompleteTrue, null)).toBe(true);
  });

  describe(`data-import`, () => {
    describe(`section: ip-pin-taxpayer-has-ip-pin`, () => {
      it(`isTrue if taxpayer has IP PIN from data import and not resubmitting`, () => {
        const fgIncomplete = new FakeFactGraph(new Map([]));
        const dataImportCondition = new Condition({
          condition: `data-import`,
          section: `ip-pin-taxpayer-has-ip-pin`,
          operator: `isTrue`,
        });
        expect(dataImportCondition.evaluate(fgIncomplete, null)).toBe(true);
      });
      it(`isUnknown if taxpayer is resubmitting`, () => {
        const fgResubmitting = new FakeFactGraph(new Map([[`/isResubmitting`, true]]));
        const dataImportCondition = new Condition({
          condition: `data-import`,
          section: `ip-pin-taxpayer-has-ip-pin`,
          operator: `isUnknown`,
        });
        expect(dataImportCondition.evaluate(fgResubmitting, null)).toBe(true);
      });
    });
  });
});

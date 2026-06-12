import { describe, expect, it } from 'vitest';
import { processPopulateResult } from '../processPopulateResult.js';
import { DataImportRootResponseSchema } from '../schema/DataImportServiceResponse.js';
import marge from '../../../../../../../backend/src/main/resources/dataimportservice/mocks/marge.json'

const copy = (data: unknown) => JSON.parse(JSON.stringify(data));

describe(`Data Import one faulty w2 parse`, () => {
  it(`should handle one valid and one invalid w2`, async () => {
    const margeCopy = copy(marge) as typeof marge;
    const originalMargeW2s = copy(marge.data.w2s.payload.w2s);
    margeCopy.data.w2s.payload.w2s = copy([
      ...originalMargeW2s,
      {
        not: null,
        a: null,
        valid: null,
        w2: null,
      },
    ]);
    const rootParse = DataImportRootResponseSchema.parse(margeCopy);
    const populateResult = processPopulateResult(rootParse, `DATA_IMPORT_ABOUT_YOU_BASIC_PLUS_IP_PIN_PLUS_W2`);
    expect(populateResult.data.aboutYouBasic.state).toEqual(`success`);
    expect(populateResult.data.w2s.state).toEqual(`success`);
    if (populateResult.data.w2s.state === `success`) {
      expect(populateResult.data.w2s.payload.length).toEqual(1);
    }
  });
});

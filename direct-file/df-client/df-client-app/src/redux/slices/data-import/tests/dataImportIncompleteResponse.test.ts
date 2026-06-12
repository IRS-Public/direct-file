import { TaxReturn } from '../../../../types/core.js';
import { store } from '../../../store.js';
import { fetchProfile } from '../dataImportProfileSlice.js';
import { fetchDataImportProfile } from '../fetchDataImportProfile.js';
import { Mock, describe, expect, it, vi } from 'vitest';
import marge from '../../../../../../../backend/src/main/resources/dataimportservice/mocks/marge.json'

vi.mock(`../fetchDataImportProfile.js`, () => ({
  fetchDataImportProfile: vi.fn(), // Mock the function
}));

const TEST_RESPONSE = `{
    "data": {
        "timeSinceCreation": 10000,
        "aboutYouBasic": {
          "state": "success",
          "createdAt": "2024-11-27T00:00:00Z",
          "payload": {
            "source": "SADI",
            "tags": ["BIOGRAPHICAL"],
            "createdDate": "2024-01-01",
            "dateOfBirth": "1907-05-25",
            "email": "Homer.Simpson@test.email",
            "mobileNumber": "+12223334444",
            "landlineNumber": null,
            "firstName": "Abraham",
            "middleInitial": "J",
            "lastName": "Simpson",
            "streetAddress": "123 Retirement Castle",
            "streetAddressLine2": "",
            "city": "Springfield",
            "stateOrProvence": "MA",
            "postalCode": "01109"
          }
        },
        "ipPin": {
          "state": "success",
          "createdAt": "2024-11-27T00:00:00Z",
          "payload": {
            "source": "IPPIN",
            "tags": ["BIOGRAPHICAL"],
            "hasIpPin": true,
            "pin": "123456"
          }
        },
        "w2s": {
          "state": "success",
          "createdAt": "2024-11-27T00:00:00Z",
          "payload": []
        }
      }
}
`;
vi.useFakeTimers();

const fakeTaxReturn = { id: `tax-return-id` } as unknown as TaxReturn;

describe(`Data Import Fetch`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it(`It will take a somewhat random response and handle it`, async () => {
    (fetchDataImportProfile as Mock).mockReturnValue(Promise.resolve(TEST_RESPONSE));
    store.dispatch(fetchProfile({ currentTaxReturn: fakeTaxReturn }));

    await vi.advanceTimersToNextTimerAsync();
    expect(fetchDataImportProfile).toHaveBeenCalledTimes(1);
    const state = store.getState();
    const dataImportProfile = state.dataImportProfile.data;
    expect(dataImportProfile.status).toEqual(`error`);
  });

  it(`It will handle one broken parser`, async () => {
    const brokenMarge = {
      data: {
        ...marge.data,
        ipPin: {
          this: `will not parse`,
        },
      },
    };

    (fetchDataImportProfile as Mock).mockReturnValue(Promise.resolve(brokenMarge));
    store.dispatch(fetchProfile({ currentTaxReturn: fakeTaxReturn }));

    await vi.advanceTimersToNextTimerAsync();
    expect(fetchDataImportProfile).toHaveBeenCalledTimes(1);
    const state = store.getState();
    const dataImportProfile = state.dataImportProfile.data;
    expect(dataImportProfile.status).toEqual(`complete`);
    if (dataImportProfile.status !== `complete`) {
      throw new Error(`invariant`);
    }
    expect(dataImportProfile.profile.data.aboutYouBasic.state).toEqual(`success`);
    expect(dataImportProfile.profile.data.w2s.state).toEqual(`success`);
  });
});

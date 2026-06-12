import useUrlTranslator from './useUrlTranslator.js';
import { renderHook } from '@testing-library/react';
import { LANGUAGE_CODE_PLACEHOLDER } from '../utils/urlUtils.js';
import { StateProfile } from '../types/StateProfile.js';
import { vi } from 'vitest';

const { mockUseTranslation } = vi.hoisted(() => {
  return {
    mockUseTranslation: vi.fn(() => ({
      i18n: {
        resolvedLanguage: `en`,
      },
    })),
  };
});

vi.mock(`react-i18next`, () => {
  return {
    useTranslation: mockUseTranslation,
  };
});

const URL_THAT_NEEDS_TRANSLATION = `https://www.state-tool.gov/${LANGUAGE_CODE_PLACEHOLDER}/home`;
const EN_TRANSLATED_URL = `https://www.state-tool.gov/en/home`;
const ES_TRANSLATED_URL = `https://www.state-tool.gov/es/home`;
const CUSTOM_TRANSLATED_URL = `https://www.state-tool.gov/custom-en/home`;
const URL_THAT_DOES_NOT_NEED_TRANSLATION = `https://www.state-tool.gov/home`;

describe(useUrlTranslator.name, () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe(`translateStateProfileUrls`, () => {
    it(`translates all the URLs in a supplied state profile`, () => {
      const stateProfile: StateProfile = {
        stateCode: `DC`,
        landingUrl: URL_THAT_NEEDS_TRANSLATION,
        defaultRedirectUrl: URL_THAT_NEEDS_TRANSLATION,
        transferCancelUrl: URL_THAT_NEEDS_TRANSLATION,
        waitingForAcceptanceCancelUrl: URL_THAT_NEEDS_TRANSLATION,
        redirectUrls: [URL_THAT_NEEDS_TRANSLATION, URL_THAT_NEEDS_TRANSLATION],
        languages: { en: `en`, es: `es` },
        taxSystemName: `FSTSN`,
        acceptedOnly: false,
        customFilingDeadline: null,
        departmentOfRevenueUrl: ``,
        filingRequirementsUrl: ``,
      };

      const {
        result: {
          current: { translateStateProfileUrls },
        },
      } = renderHook(() => useUrlTranslator());

      const translatedStateProfile = translateStateProfileUrls(stateProfile);

      expect(translatedStateProfile.landingUrl).toEqual(EN_TRANSLATED_URL);
      expect(translatedStateProfile.defaultRedirectUrl).toEqual(EN_TRANSLATED_URL);
      expect(translatedStateProfile.transferCancelUrl).toEqual(EN_TRANSLATED_URL);
      expect(translatedStateProfile.waitingForAcceptanceCancelUrl).toEqual(EN_TRANSLATED_URL);
      translatedStateProfile.redirectUrls.forEach((translatedRedirectUrl) => {
        expect(translatedRedirectUrl).toEqual(EN_TRANSLATED_URL);
      });
    });

    it(`translates all the URLs in a supplied state profile to "en" if no matching supported language is found`, () => {
      const stateProfile: StateProfile = {
        stateCode: `DC`,
        landingUrl: URL_THAT_NEEDS_TRANSLATION,
        defaultRedirectUrl: URL_THAT_NEEDS_TRANSLATION,
        transferCancelUrl: URL_THAT_NEEDS_TRANSLATION,
        waitingForAcceptanceCancelUrl: URL_THAT_NEEDS_TRANSLATION,
        redirectUrls: [URL_THAT_NEEDS_TRANSLATION, URL_THAT_NEEDS_TRANSLATION],
        languages: {},
        taxSystemName: `FSTSN`,
        acceptedOnly: false,
        customFilingDeadline: null,
        departmentOfRevenueUrl: ``,
        filingRequirementsUrl: ``,
      };

      const {
        result: {
          current: { translateStateProfileUrls },
        },
      } = renderHook(() => useUrlTranslator());

      const translatedStateProfile = translateStateProfileUrls(stateProfile);

      expect(translatedStateProfile.landingUrl).toEqual(EN_TRANSLATED_URL);
      expect(translatedStateProfile.defaultRedirectUrl).toEqual(EN_TRANSLATED_URL);
      expect(translatedStateProfile.transferCancelUrl).toEqual(EN_TRANSLATED_URL);
      expect(translatedStateProfile.waitingForAcceptanceCancelUrl).toEqual(EN_TRANSLATED_URL);
      translatedStateProfile.redirectUrls.forEach((translatedRedirectUrl) => {
        expect(translatedRedirectUrl).toEqual(EN_TRANSLATED_URL);
      });
    });

    it(`translates all the URLs in a supplied state profile to "en" if no matching supported language is found,
    even if the user selected a different language`, () => {
      mockUseTranslation.mockReturnValue({
        i18n: {
          resolvedLanguage: `es`,
        },
      });

      const stateProfile: StateProfile = {
        stateCode: `DC`,
        landingUrl: URL_THAT_NEEDS_TRANSLATION,
        defaultRedirectUrl: URL_THAT_NEEDS_TRANSLATION,
        transferCancelUrl: URL_THAT_NEEDS_TRANSLATION,
        waitingForAcceptanceCancelUrl: URL_THAT_NEEDS_TRANSLATION,
        redirectUrls: [URL_THAT_NEEDS_TRANSLATION, URL_THAT_NEEDS_TRANSLATION],
        languages: {},
        taxSystemName: `FSTSN`,
        acceptedOnly: false,
        customFilingDeadline: null,
        departmentOfRevenueUrl: ``,
        filingRequirementsUrl: ``,
      };

      const {
        result: {
          current: { translateStateProfileUrls },
        },
      } = renderHook(() => useUrlTranslator());

      const translatedStateProfile = translateStateProfileUrls(stateProfile);

      expect(translatedStateProfile.landingUrl).toEqual(EN_TRANSLATED_URL);
      expect(translatedStateProfile.defaultRedirectUrl).toEqual(EN_TRANSLATED_URL);
      expect(translatedStateProfile.transferCancelUrl).toEqual(EN_TRANSLATED_URL);
      expect(translatedStateProfile.waitingForAcceptanceCancelUrl).toEqual(EN_TRANSLATED_URL);
      translatedStateProfile.redirectUrls.forEach((translatedRedirectUrl) => {
        expect(translatedRedirectUrl).toEqual(EN_TRANSLATED_URL);
      });
    });

    it(`translates all the URLs in a supplied state profile to the matching supported language if found`, () => {
      mockUseTranslation.mockReturnValue({
        i18n: {
          resolvedLanguage: `es`,
        },
      });

      const stateProfile: StateProfile = {
        stateCode: `DC`,
        landingUrl: URL_THAT_NEEDS_TRANSLATION,
        defaultRedirectUrl: URL_THAT_NEEDS_TRANSLATION,
        transferCancelUrl: URL_THAT_NEEDS_TRANSLATION,
        waitingForAcceptanceCancelUrl: URL_THAT_NEEDS_TRANSLATION,
        redirectUrls: [URL_THAT_NEEDS_TRANSLATION, URL_THAT_NEEDS_TRANSLATION],
        languages: { en: `en`, es: `es` },
        taxSystemName: `FSTSN`,
        acceptedOnly: false,
        customFilingDeadline: null,
        departmentOfRevenueUrl: ``,
        filingRequirementsUrl: ``,
      };

      const {
        result: {
          current: { translateStateProfileUrls },
        },
      } = renderHook(() => useUrlTranslator());

      const translatedStateProfile = translateStateProfileUrls(stateProfile);

      expect(translatedStateProfile.landingUrl).toEqual(ES_TRANSLATED_URL);
      expect(translatedStateProfile.defaultRedirectUrl).toEqual(ES_TRANSLATED_URL);
      expect(translatedStateProfile.transferCancelUrl).toEqual(ES_TRANSLATED_URL);
      expect(translatedStateProfile.waitingForAcceptanceCancelUrl).toEqual(ES_TRANSLATED_URL);
      translatedStateProfile.redirectUrls.forEach((translatedRedirectUrl) => {
        expect(translatedRedirectUrl).toEqual(ES_TRANSLATED_URL);
      });
    });

    it(`translates all the URLs in a supplied state profile to the matching supported language if found`, () => {
      const stateProfile: StateProfile = {
        stateCode: `DC`,
        landingUrl: URL_THAT_NEEDS_TRANSLATION,
        defaultRedirectUrl: URL_THAT_NEEDS_TRANSLATION,
        transferCancelUrl: URL_THAT_NEEDS_TRANSLATION,
        waitingForAcceptanceCancelUrl: URL_THAT_NEEDS_TRANSLATION,
        redirectUrls: [URL_THAT_NEEDS_TRANSLATION, URL_THAT_NEEDS_TRANSLATION],
        languages: { en: `custom-en`, es: `custom-es` },
        taxSystemName: `FSTSN`,
        acceptedOnly: false,
        customFilingDeadline: null,
        departmentOfRevenueUrl: ``,
        filingRequirementsUrl: ``,
      };

      const {
        result: {
          current: { translateStateProfileUrls },
        },
      } = renderHook(() => useUrlTranslator());

      const translatedStateProfile = translateStateProfileUrls(stateProfile);

      expect(translatedStateProfile.landingUrl).toEqual(CUSTOM_TRANSLATED_URL);
      expect(translatedStateProfile.defaultRedirectUrl).toEqual(CUSTOM_TRANSLATED_URL);
      expect(translatedStateProfile.transferCancelUrl).toEqual(CUSTOM_TRANSLATED_URL);
      expect(translatedStateProfile.waitingForAcceptanceCancelUrl).toEqual(CUSTOM_TRANSLATED_URL);
      translatedStateProfile.redirectUrls.forEach((translatedRedirectUrl) => {
        expect(translatedRedirectUrl).toEqual(CUSTOM_TRANSLATED_URL);
      });
    });

    it(`does not translate urls that don't need translations`, () => {
      const stateProfile: StateProfile = {
        stateCode: `DC`,
        landingUrl: URL_THAT_DOES_NOT_NEED_TRANSLATION,
        defaultRedirectUrl: URL_THAT_DOES_NOT_NEED_TRANSLATION,
        transferCancelUrl: URL_THAT_DOES_NOT_NEED_TRANSLATION,
        waitingForAcceptanceCancelUrl: URL_THAT_DOES_NOT_NEED_TRANSLATION,
        redirectUrls: [],
        languages: { en: `en`, es: `es` },
        taxSystemName: `FSTSN`,
        acceptedOnly: false,
        customFilingDeadline: null,
        departmentOfRevenueUrl: ``,
        filingRequirementsUrl: ``,
      };

      const {
        result: {
          current: { translateStateProfileUrls },
        },
      } = renderHook(() => useUrlTranslator());

      const translatedStateProfile = translateStateProfileUrls(stateProfile);

      expect(translatedStateProfile.landingUrl).toEqual(URL_THAT_DOES_NOT_NEED_TRANSLATION);
      expect(translatedStateProfile.defaultRedirectUrl).toEqual(URL_THAT_DOES_NOT_NEED_TRANSLATION);
      expect(translatedStateProfile.transferCancelUrl).toEqual(URL_THAT_DOES_NOT_NEED_TRANSLATION);
      expect(translatedStateProfile.waitingForAcceptanceCancelUrl).toEqual(URL_THAT_DOES_NOT_NEED_TRANSLATION);
      expect(translatedStateProfile.redirectUrls.length).toEqual(0);
    });

    it(`Can safely handle/ignore null urls`, () => {
      const stateProfile: StateProfile = {
        stateCode: `DC`,
        landingUrl: URL_THAT_DOES_NOT_NEED_TRANSLATION,
        defaultRedirectUrl: null,
        transferCancelUrl: null,
        waitingForAcceptanceCancelUrl: null,
        redirectUrls: [],
        languages: { en: `en`, es: `es` },
        taxSystemName: `FSTSN`,
        acceptedOnly: false,
        customFilingDeadline: null,
        departmentOfRevenueUrl: null,
        filingRequirementsUrl: null,
      };

      const {
        result: {
          current: { translateStateProfileUrls },
        },
      } = renderHook(() => useUrlTranslator());

      const translatedStateProfile = translateStateProfileUrls(stateProfile);

      expect(translatedStateProfile.landingUrl).toEqual(URL_THAT_DOES_NOT_NEED_TRANSLATION);
      expect(translatedStateProfile.defaultRedirectUrl).toEqual(null);
      expect(translatedStateProfile.transferCancelUrl).toEqual(null);
      expect(translatedStateProfile.waitingForAcceptanceCancelUrl).toEqual(null);
      expect(translatedStateProfile.redirectUrls.length).toEqual(0);
    });
  });
});

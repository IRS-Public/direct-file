import { act, ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { i18n } from '../test/test-utils.js';
import { useSubmit as useSubmit } from './useSubmit.js';
import { TaxReturn } from '../types/core.js';
import { v4 as uuidv4 } from 'uuid';
import { CURRENT_TAX_YEAR } from '../constants/taxConstants.js';
import { TaxReturnsContext } from '../context/TaxReturnsContext.js';
import { FactGraphContextProvider } from '../factgraph/FactGraphContext.js';
import { AppStore, setupStore } from '../redux/store.js';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import {
  getEmptySystemAlertsMap,
  SystemAlertContext,
  SystemAlertKey,
} from '../context/SystemAlertContext/SystemAlertContext.js';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    save: vi.fn(),
    setSystemAlert: vi.fn(),
    set: vi.fn(),
  };
});

// mocking navigator object
const NavigatorMock = {
  language: `browserLanguage`,
  platform: `platform`,
};
vi.stubGlobal(`navigator`, NavigatorMock);

vi.mock(`./useApiHook.js`, async (importOriginal) => {
  const actual: object = await importOriginal();
  return {
    ...actual,
    // todo: what is this / is it needed?
    default: { myDefaultKey: vi.fn() },
    save: mocks.save,
  };
});

// Configure i18n structure
// todo: DF-14833 make sure unit tests don't hide breaking i18n structure changes
const testNs = {
  button: {
    submit: {
      text: `test submit button`,
      errorMessages: {
        offline: `test error message - offline`,
      },
    },
  },
  systemAlerts: {
    tinMismatch: `This is a tin mismatch alert`,
    signing: {
      retriableEsignatureError: `This is a signing error`,
    },
  },
};
i18n.addResourceBundle(`en`, `test`, testNs, true, true);
i18n.addResourceBundle(`en`, `translation`, testNs, true, true);

const NOW = new Date();
const TEN_MINUTES_AGO = new Date(new Date().setMinutes(NOW.getMinutes() - 10));
const FIVE_MINUTES_AGO = new Date(new Date().setMinutes(NOW.getMinutes() - 5));

const TAX_RETURN: TaxReturn = {
  id: uuidv4(),
  createdAt: new Date().toISOString(),
  taxYear: parseInt(CURRENT_TAX_YEAR),
  facts: {},
  taxReturnSubmissions: [
    {
      id: uuidv4(),
      submitUserId: uuidv4(),
      createdAt: TEN_MINUTES_AGO.toISOString(),
      submissionReceivedAt: FIVE_MINUTES_AGO.toISOString(),
      receiptId: uuidv4(),
    },
  ],
  isEditable: false,
  surveyOptIn: null,
};

const TAX_RETURN_WITH_LEGACY_SIGNING: TaxReturn = structuredClone({
  ...TAX_RETURN,
  facts: {
    '/lastYearAgi': {
      $type: `gov.irs.factgraph.persisters.DollarWrapper`,
      item: `50.00`,
    },
  },
});

type WrapperProps = {
  children: ReactNode;
  initialTaxReturn: TaxReturn;
  store: AppStore;
};
const Wrapper = ({ store, children, initialTaxReturn }: WrapperProps) => {
  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <SystemAlertContext.Provider
          value={{
            systemAlerts: getEmptySystemAlertsMap(),
            setSystemAlert: mocks.setSystemAlert,
            deleteSystemAlert: vi.fn(),
          }}
        >
          <TaxReturnsContext.Provider
            value={{
              taxReturns: [initialTaxReturn],
              currentTaxReturnId: initialTaxReturn.id,
              fetchTaxReturns: vi.fn(),
              isFetching: false,
              fetchSuccess: false,
            }}
          >
            <FactGraphContextProvider
              existingFacts={initialTaxReturn.facts}
              taxReturnSubmissions={initialTaxReturn.taxReturnSubmissions}
              forceNewInstance
            >
              {children}
            </FactGraphContextProvider>
          </TaxReturnsContext.Provider>
        </SystemAlertContext.Provider>
      </I18nextProvider>
      ;
    </Provider>
  );
};

describe(useSubmit.name, () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe(`when the user is on the ESSAR signing path`, () => {
    let originalViteEnableEssarSigning: boolean;

    beforeAll(() => {
      originalViteEnableEssarSigning = import.meta.env.VITE_ENABLE_ESSAR_SIGNING;
      import.meta.env.VITE_ENABLE_ESSAR_SIGNING = true;
    });

    afterAll(() => {
      import.meta.env.VITE_ENABLE_ESSAR_SIGNING = originalViteEnableEssarSigning;
    });

    it(`makes a request to the /sign endpoint`, async () => {
      const {
        result: { current: signAndSubmit },
      } = renderHook(() => useSubmit(), {
        wrapper: ({ children }) => (
          <Wrapper store={setupStore()} initialTaxReturn={TAX_RETURN}>
            {children}
          </Wrapper>
        ),
      });

      await act(async () => {
        await signAndSubmit();
      });

      expect(mocks.save).toHaveBeenCalledTimes(1);
      expect(mocks.save).toHaveBeenCalledWith(expect.stringMatching(`/sign`), expect.anything());
      expect(mocks.save).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(`/sign`),
        expect.objectContaining({
          body: expect.objectContaining({
            facts: expect.anything(),
            intentStatement: expect.any(String),
          }),
        })
      );
    });

    it(`sets the electronicSigningFailed value for ESSAR errors`, async () => {
      const retryEssarError = {
        status: `BAD_REQUEST`,
        message: `400 BAD_REQUEST "Unable to electronically sign return."`,
        apiErrorKey: `signing.retriableEsignatureError`,
        body: {},
      };
      mocks.save.mockRejectedValueOnce(retryEssarError);
      const store = setupStore();

      const {
        result: { current: signAndSubmit },
      } = renderHook(() => useSubmit(), {
        wrapper: ({ children }) => (
          <Wrapper store={store} initialTaxReturn={TAX_RETURN}>
            {children}
          </Wrapper>
        ),
      });

      await act(async () => {
        await signAndSubmit();
      });

      expect(store.getState().electronicSignature.electronicSigningFailed).toBe(true);
      expect(mocks.save).toHaveBeenCalledTimes(1);
    });

    it(`falls back to legacy signing flow for subsequent attempts if legacy signing facts are set`, async () => {
      const retryEssarError = {
        status: `BAD_REQUEST`,
        message: `400 BAD_REQUEST "Unable to electronically sign return."`,
        apiErrorKey: `signing.retriableEsignatureError`,
        body: {},
      };
      mocks.save.mockRejectedValueOnce(retryEssarError);
      const store = setupStore();

      let {
        result: { current: signAndSubmit },
      } = renderHook(() => useSubmit(), {
        wrapper: ({ children }) => (
          <Wrapper store={store} initialTaxReturn={TAX_RETURN_WITH_LEGACY_SIGNING}>
            {children}
          </Wrapper>
        ),
      });

      await act(async () => {
        await signAndSubmit();
      });

      expect(store.getState().electronicSignature.electronicSigningFailed).toBe(true);
      expect(mocks.save).toHaveBeenCalledWith(expect.stringMatching(`/sign`), expect.anything());
      mocks.save.mockClear();

      ({
        result: { current: signAndSubmit },
      } = renderHook(() => useSubmit(), {
        wrapper: ({ children }) => (
          <Wrapper store={store} initialTaxReturn={TAX_RETURN_WITH_LEGACY_SIGNING}>
            {children}
          </Wrapper>
        ),
      }));

      await act(async () => {
        await signAndSubmit();
      });

      expect(mocks.save).toHaveBeenCalledWith(expect.stringMatching(`/submit`), expect.anything());
    });

    it(`keeps using the ESSAR flow for subsequent attempts if the legacy signing facts are not set`, async () => {
      const retryEssarError = {
        status: `BAD_REQUEST`,
        message: `400 BAD_REQUEST "Unable to electronically sign return."`,
        apiErrorKey: `signing.retriableEsignatureError`,
        body: {},
      };
      mocks.save.mockRejectedValueOnce(retryEssarError);
      const store = setupStore();

      let {
        result: { current: signAndSubmit },
      } = renderHook(() => useSubmit(), {
        wrapper: ({ children }) => (
          <Wrapper store={store} initialTaxReturn={TAX_RETURN}>
            {children}
          </Wrapper>
        ),
      });

      await act(async () => {
        await signAndSubmit();
      });

      expect(store.getState().electronicSignature.electronicSigningFailed).toBe(true);
      expect(mocks.save).toHaveBeenCalledWith(expect.stringMatching(`/sign`), expect.anything());
      mocks.save.mockClear();

      ({
        result: { current: signAndSubmit },
      } = renderHook(() => useSubmit(), {
        wrapper: ({ children }) => (
          <Wrapper store={store} initialTaxReturn={TAX_RETURN}>
            {children}
          </Wrapper>
        ),
      }));

      await act(async () => {
        await signAndSubmit();
      });

      expect(mocks.save).toHaveBeenCalledWith(expect.stringMatching(`/sign`), expect.anything());
    });

    it(`does not set electronicSigningFailed for non-ESSAR errors`, async () => {
      const tinMismatchError = {
        status: `BAD_REQUEST`,
        // eslint-disable-next-line max-len
        message: `400 BAD_REQUEST "TIN Validation failed. Tax Return TIN(s) must match ID.me. Taxreturn ID: <some-id>"`,
        apiErrorKey: `tinMismatch`,
        body: {},
      };
      mocks.save.mockRejectedValueOnce(tinMismatchError);
      const store = setupStore();

      const {
        result: { current: signAndSubmit },
      } = renderHook(() => useSubmit(), {
        wrapper: ({ children }) => (
          <Wrapper store={store} initialTaxReturn={TAX_RETURN}>
            {children}
          </Wrapper>
        ),
      });

      await act(async () => {
        await signAndSubmit();
      });

      expect(store.getState().electronicSignature.electronicSigningFailed).toBe(false);
      expect(mocks.save).toHaveBeenCalledTimes(1);
    });
  });

  describe(`when the user is *not* on the ESSAR signing path`, () => {
    it(`makes a request to the /sign endpoint`, async () => {
      const {
        result: { current: signAndSubmit },
      } = renderHook(() => useSubmit(), {
        wrapper: ({ children }) => (
          <Wrapper store={setupStore()} initialTaxReturn={TAX_RETURN}>
            {children}
          </Wrapper>
        ),
      });

      await act(async () => {
        await signAndSubmit();
      });

      expect(mocks.save).toHaveBeenCalledTimes(1);
      expect(mocks.save).toHaveBeenCalledWith(expect.stringMatching(`/submit`), expect.anything());
      expect(mocks.save).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(`/submit`),
        expect.objectContaining({
          body: expect.objectContaining({
            facts: expect.anything(),
          }),
        })
      );
    });
  });

  describe(`when an error occurs`, () => {
    it(`logs the error`, async () => {
      const errorMessage = `something unexpected happened`;
      mocks.save.mockRejectedValueOnce(new Error(errorMessage));

      const {
        result: { current: signAndSubmit },
      } = renderHook(() => useSubmit(), {
        wrapper: ({ children }) => (
          <Wrapper store={setupStore()} initialTaxReturn={TAX_RETURN}>
            {children}
          </Wrapper>
        ),
      });

      await act(async () => {
        await signAndSubmit();
      });

      expect(mocks.save).toHaveBeenCalledTimes(1);
    });

    it(`translates ESSAR failures into an error message with a link to the alternative signing flow`, async () => {
      const retryEssarError = {
        status: `BAD_REQUEST`,
        message: `400 BAD_REQUEST "Unable to electronically sign return."`,
        apiErrorKey: `signing.retriableEsignatureError`,
        body: {},
      };
      mocks.save.mockRejectedValueOnce(retryEssarError);

      const {
        result: { current: signAndSubmit },
      } = renderHook(() => useSubmit(), {
        wrapper: ({ children }) => (
          <Wrapper store={setupStore()} initialTaxReturn={TAX_RETURN}>
            {children}
          </Wrapper>
        ),
      });

      await act(async () => {
        await signAndSubmit();
      });

      expect(mocks.save).toHaveBeenCalledTimes(1);
      expect(mocks.setSystemAlert).toHaveBeenCalledTimes(1);
      expect(mocks.setSystemAlert).toHaveBeenCalledWith(
        SystemAlertKey.SUBMIT,
        expect.objectContaining({
          type: `error`,
          i18nKey: `signing.retriableEsignatureError`,
          internalLink: `/flow/complete/sign-and-submit/sign-return-intro`,
        })
      );
    });

    it(`translates specific API error codes into their appropriate error message`, async () => {
      const tinMismatchError = {
        status: `BAD_REQUEST`,
        // eslint-disable-next-line max-len
        message: `400 BAD_REQUEST "TIN Validation failed. Tax Return TIN(s) must match ID.me. Taxreturn ID: <some-id>"`,
        apiErrorKey: `tinMismatch`,
        body: {},
      };
      mocks.save.mockRejectedValueOnce(tinMismatchError);

      const {
        result: { current: signAndSubmit },
      } = renderHook(() => useSubmit(), {
        wrapper: ({ children }) => (
          <Wrapper store={setupStore()} initialTaxReturn={TAX_RETURN}>
            {children}
          </Wrapper>
        ),
      });

      await act(async () => {
        await signAndSubmit();
      });

      expect(mocks.save).toHaveBeenCalledTimes(1);
      expect(mocks.setSystemAlert).toHaveBeenCalledTimes(1);
      expect(mocks.setSystemAlert).toHaveBeenCalledWith(
        SystemAlertKey.SUBMIT,
        expect.objectContaining({
          type: `error`,
          i18nKey: `tinMismatch`,
        })
      );
    });

    it(`displays a generic error message for unknown API errors`, async () => {
      const genericError = {
        status: `SERVER_ERROR`,
        message: `It's all burning down`,
        apiErrorKey: `segfault`,
        body: {},
      };
      mocks.save.mockRejectedValueOnce(genericError);

      const {
        result: { current: signAndSubmit },
      } = renderHook(() => useSubmit(), {
        wrapper: ({ children }) => (
          <Wrapper store={setupStore()} initialTaxReturn={TAX_RETURN}>
            {children}
          </Wrapper>
        ),
      });

      await act(async () => {
        await signAndSubmit();
      });

      expect(mocks.save).toHaveBeenCalledTimes(1);
      expect(mocks.setSystemAlert).toHaveBeenCalledTimes(1);
      expect(mocks.setSystemAlert).toHaveBeenCalledWith(
        // todo: should this be SUBMIT?
        SystemAlertKey.SUBMIT,
        expect.objectContaining({
          type: `error`,
          i18nKey: `generic.submissionError`,
        })
      );
    });
  });
});

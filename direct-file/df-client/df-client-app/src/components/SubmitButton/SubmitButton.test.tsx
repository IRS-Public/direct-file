import { ConcretePath } from '@irs/js-factgraph-scala';
import { renderWithTranslationProvider as render } from '../../test/test-utils.js';
import { ScreenButtonProps, TaxReturn } from '../../types/core.js';
import { screen } from '@testing-library/react';
import { v4 as uuidv4 } from 'uuid';
import SubmitButton from './SubmitButton.js';
import { NetworkConnectionContext } from '../../context/networkConnectionContext.js';
import { BrowserRouter } from 'react-router-dom';
import {
  getEmptySystemAlertsMap,
  SystemAlertContext,
  SystemAlertContextType,
} from '../../context/SystemAlertContext/SystemAlertContext.js';
import { TaxReturnsContext } from '../../context/TaxReturnsContext.js';
import { userEvent } from '@testing-library/user-event';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const submit = vi.fn(() => ({ hasSubmitError: false, isRetryDisabled: false }));
  return {
    gotoNextScreen: vi.fn(),
    submit,
    useSubmit: vi.fn(() => submit),
    get: vi.fn(() => ({ hasValue: true, get: false })),
    set: vi.fn(),
  };
});

vi.mock(`../../hooks/useSubmit.js`, async (importOriginal) => {
  const actual: object = await importOriginal();
  return {
    ...actual,
    default: { myDefaultKey: vi.fn() },
    useSubmit: mocks.useSubmit,
  };
});

const testProps: ScreenButtonProps = {
  collectionId: `foo`,
  i18nKey: `bar`,
  gotoNextScreen: mocks.gotoNextScreen,
  screenHasFacts: false,
  factValidity: new Map<ConcretePath, boolean>(),
  setShowFeedback: vi.fn(),
  focusOnErrorOrSummary: vi.fn(),
};

vi.mock(`../../factgraph/FactGraphContext.js`, () => ({
  useFactGraph: () => {
    return {
      factGraph: {
        toJSON: () => {
          return `{}`;
        },
        get: mocks.get,
        set: mocks.set,
      },
    };
  },
}));

//TODO mock useContext(NetworkConnectionContext) and accessibleOffline to test when "online"
describe(SubmitButton.name, () => {
  const renderSubmitButton = (
    props: ScreenButtonProps,
    options?: { taxReturnOverrides?: Partial<TaxReturn>; systemAlertContextOverrides?: Partial<SystemAlertContextType> }
  ) => {
    const currentTaxReturnId = uuidv4();
    const network = { online: true, prevOnlineStatus: false };

    render(
      <NetworkConnectionContext.Provider value={network}>
        <BrowserRouter>
          <SystemAlertContext.Provider
            value={{
              systemAlerts: getEmptySystemAlertsMap(),
              setSystemAlert: vi.fn(),
              deleteSystemAlert: vi.fn(),
              ...options?.systemAlertContextOverrides,
            }}
          >
            <TaxReturnsContext.Provider
              value={{
                currentTaxReturnId: currentTaxReturnId,
                taxReturns: [
                  {
                    id: currentTaxReturnId,
                    isEditable: true,
                    ...options?.taxReturnOverrides,
                  } as TaxReturn,
                ],
                fetchTaxReturns: vi.fn(),
                isFetching: false,
                fetchSuccess: false,
              }}
            >
              <SubmitButton {...props} />
            </TaxReturnsContext.Provider>
          </SystemAlertContext.Provider>
        </BrowserRouter>
      </NetworkConnectionContext.Provider>
    );

    const submitButton = screen.getByRole(`button`);

    return {
      submitButton,
    };
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it(`renders without errors, enabled`, () => {
    const { submitButton } = renderSubmitButton(testProps);

    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toHaveClass(`usa-button--disabled`);
  });

  it(`Button is disabled if the return is not editable`, () => {
    const { submitButton } = renderSubmitButton(testProps, { taxReturnOverrides: { isEditable: false } });

    expect(submitButton).toHaveClass(`usa-button--disabled`);
  });

  it(`calls the useSubmit hook when clicked`, async () => {
    const user = userEvent.setup();
    const { submitButton } = renderSubmitButton(testProps);

    await user.click(submitButton);

    expect(mocks.useSubmit).toHaveBeenCalled();
    expect(mocks.submit).toHaveBeenCalled();
  });

  it(`goes to the next page after submitting`, async () => {
    const user = userEvent.setup();
    const { submitButton } = renderSubmitButton(testProps);

    await user.click(submitButton);

    expect(mocks.gotoNextScreen).toHaveBeenCalled();
  });

  it(`does not go to the next page if submitting fails`, async () => {
    mocks.submit.mockResolvedValueOnce({ hasSubmitError: true, isRetryDisabled: false });
    const user = userEvent.setup();
    const { submitButton } = renderSubmitButton(testProps);

    await user.click(submitButton);

    expect(mocks.gotoNextScreen).not.toHaveBeenCalled();
  });

  it(`re-enables the button if submitting fails with a retriable error`, async () => {
    mocks.submit.mockResolvedValueOnce({ hasSubmitError: true, isRetryDisabled: false });
    const user = userEvent.setup();
    const { submitButton } = renderSubmitButton(testProps);

    await user.click(submitButton);

    expect(submitButton).not.toHaveClass(`usa-button--disabled`);
  });

  it(`disables the button if submitting fails with a non-retriable error`, async () => {
    mocks.submit.mockResolvedValueOnce({ hasSubmitError: true, isRetryDisabled: true });
    const user = userEvent.setup();
    const { submitButton } = renderSubmitButton(testProps);

    await user.click(submitButton);

    expect(submitButton).toHaveClass(`usa-button--disabled`);
  });
});

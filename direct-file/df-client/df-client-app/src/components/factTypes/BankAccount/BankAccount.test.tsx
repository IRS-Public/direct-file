import { i18n, renderWithTranslationProvider as render, fireEvent } from '../../../test/test-utils.js';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';

import { BankAccount } from './BankAccount.js';
import { FactGraphContextProvider } from '../../../factgraph/FactGraphContext.js';
import { setupStore } from '../../../redux/store.js';
import { Path } from '../../../flow/Path.js';
import type { useFactControl } from '../../../hooks/useFactControl.js';
import type { BankAccount as SFGBankAccount, BankAccountValidationFailure } from '@irs/js-factgraph-scala';
import { vi } from 'vitest';

const mockUseFactControl = await vi.hoisted(async () => {
  type UseFactControl = typeof useFactControl<SFGBankAccount, BankAccountValidationFailure, SFGBankAccount>;
  const { useFactControl: actualUseFactControl } = (await vi.importActual(`../../../hooks/useFactControl`)) as {
    useFactControl: typeof useFactControl;
  };
  type Result = ReturnType<UseFactControl>;

  const mockGetRawValue = vi.fn(() => ({} as SFGBankAccount));
  const mockOnChange = vi.fn(undefined as unknown as Result['onChange']);

  const mockUseFactControl = vi.fn(((props) => {
    const actualResult = actualUseFactControl(props);
    return {
      ...actualResult,
      onChange: (rawValue) => {
        actualResult.onChange(rawValue);
        mockOnChange(rawValue);
      },
    };
  }) as UseFactControl);
  return {
    getRawValue: mockGetRawValue,
    onChange: mockOnChange,
    useFactControl: mockUseFactControl,
  };
});

const mockUseFact = vi.hoisted(() =>
  vi.fn((): [SFGBankAccount | undefined, (_: SFGBankAccount) => void] => [undefined, vi.fn()])
);
vi.mock(`../../../hooks/useFactControl`, () => ({
  useFact: mockUseFact,
}));

vi.mock(`../../../hooks/useFactControl`, () => ({
  useFactControl: mockUseFactControl.useFactControl as typeof useFactControl,
}));

const testLocale = {
  info: {
    '/info/bankAccount': {
      routingNumber: {
        helpText: {
          hint: {
            text: `routing number hint`,
          },
        },
      },
      accountNumber: {
        helpText: {
          hint: {
            text: `account number hint`,
          },
        },
      },
    },
  },
};
i18n.addResourceBundle(`en`, `test`, testLocale);

// Todo: update tests to new pattern
describe(`BankAccount`, () => {
  const path = `/bankAccount` as const;
  const sharedProps = {
    path,
    concretePath: Path.concretePath(path, null),
    onValidData: vi.fn(),
    showFeedback: false,
    isValid: true,
    collectionId: null,
    required: true,
    saveAndPersist: vi.fn(),
  };

  const validBankAccount: SFGBankAccount = {
    accountType: `Savings`,
    routingNumber: `011000015`,
    accountNumber: `12345`,
  };

  function renderControl(overrides: Partial<React.ComponentProps<typeof BankAccount>> = {}) {
    const props = { ...sharedProps, ...overrides };
    return render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <BankAccount {...props} />
        </FactGraphContextProvider>
      </Provider>
    );
  }

  it(`renders without error`, () => {
    renderControl();
  });

  it(`renders expected hints`, () => {
    const { getByText } = renderControl();

    expect(getByText(testLocale.info[`/info/bankAccount`].routingNumber.helpText.hint.text)).toBeInTheDocument();
    expect(getByText(testLocale.info[`/info/bankAccount`].accountNumber.helpText.hint.text)).toBeInTheDocument();
  });

  type BankAccountEntries = {
    [K in keyof SFGBankAccount]: [K, SFGBankAccount[K]];
  }[keyof SFGBankAccount][];
  test.each(Object.entries(validBankAccount) as BankAccountEntries)(
    `updates the %s field when the user modifies it`,
    (name, value) => {
      const { getByTestId } = renderControl();

      if (name === `accountType`) {
        const option = getByTestId(`field-accountType.Savings`);
        fireEvent.click(option);
      } else {
        const input = getByTestId(`field-${name}`);
        fireEvent.change(input, { target: { value } });
      }

      const [[updatedValue]] = mockUseFactControl.onChange.mock.calls;

      expect(updatedValue[name]).toBe(value);
    }
  );

  afterEach(() => {
    vi.restoreAllMocks();
  });
});

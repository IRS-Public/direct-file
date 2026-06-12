import '@testing-library/jest-dom/extend-expect';
import { createRef } from 'react';
import { Path } from '../../../flow/Path.js';
import { i18n, renderWithTranslationProvider as render, fireEvent } from '../../../test/test-utils.js';
import { DatePicker, validateDate } from './DatePicker.js';
import { ConcretePath, Day } from '@irs/js-factgraph-scala';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  // useFact related hooks
  const getFact = vi.fn();
  const setFact = vi.fn();
  const clearFact = vi.fn();
  const useFact = vi.fn(() => [getFact(), setFact, clearFact]);
  const useFactGraph = vi.fn();

  return { getFact, useFact, setFact, useFactGraph };
});

vi.mock(`../../../hooks/useFact`, () => ({
  default: mocks.useFact,
}));

vi.mock(`../../../factgraph/FactGraphContext.js`, () => ({ useFactGraph: mocks.useFactGraph }));

const testNs = {
  info: {
    '/info/achPaymentDate': {
      helpText: {
        hint: {
          text: `DatePicker hint: /info/achPaymentDate`,
        },
      },
    },
  },
  fields: {
    generics: {
      requiredExplainerSimple: `Required`,
    },
    '/filers/*/dateOfBirth': {
      name: `Date of Birth`,
      errorMessages: {
        RequiredField: `is required`,
        InvalidDay: `Please ensure the day is a valid day`,
        InvalidMonth: `Please ensure the month is between 1 and 12`,
        InvalidYear: `Please ensure the year is greater than 1862`,
        InvalidDayDueToLeapYear: `The day is not valid as the year is not a leap year`,
        InvalidDate: `Please ensure the year is 4 digits, the month is 2 digits and the day is 2 digits`,
        ExceedsMaxLimit: `Date limit exceeded`,
        AfterFilingDeadline: `Choose a new payment date before your federal tax filing deadline to continue`,
        PastDate: `You picked a payment date that's in the past`,
      },
    },
  },
};
i18n.addResourceBundle(`en`, `test`, testNs, true, true);
//DatePicker specifies `translation` namespace: const { t } = useTranslation(`translation`)
const translationNs = {
  datePicker: {
    month: `Month`,
    day: `Day`,
    year: `Year`,
  },
};
i18n.addResourceBundle(`en`, `translation`, translationNs, true, true);

const path = `/filers/*/dateOfBirth` as const;
const collectionId = `5e3c5aef-415e-48a2-a999-13bfc90d36bf`;

const ref = createRef<HTMLInputElement>();

const NOW = new Date();
const TODAY = NOW.getDate();
const CURRENT_MONTH = NOW.getMonth() + 1;
const CURRENT_YEAR = NOW.getFullYear();

const requiredMarker = `(Required)`;

const props = {
  path: path,
  concretePath: Path.concretePath(path, collectionId),
  collectionId: collectionId,
  onValidData: vi.fn(),
  isValid: true,
  showFeedback: false,
  required: true,
  labelledby: `legend`,
  ref: ref,
  saveAndPersist: vi.fn(),
};

const requirementOptions = [
  {
    name: `required`,
    requiredBoolean: true,
  },
  {
    name: `optional`,
    requiredBoolean: false,
  },
];

const testCases = [
  {
    description: `successfully validates a valid date`,
    date: { day: 4, month: 4, year: 2024 },
    allowableDate: undefined,
    disallowPastDates: undefined,
    expected: null,
  },
  {
    description: `fails validation if day is non-numeric`,
    date: { day: `a`, month: 4, year: 2024 },
    allowableDate: undefined,
    disallowPastDates: undefined,
    expected: `InvalidDate`,
  },
  {
    description: `fails validation if month is non-numeric`,
    date: { day: 4, month: `$`, year: 2024 },
    allowableDate: undefined,
    disallowPastDates: undefined,
    expected: `InvalidDate`,
  },
  {
    description: `fails validation if year is non-numeric`,
    date: { day: 4, month: 4, year: `é` },
    allowableDate: undefined,
    disallowPastDates: undefined,
    expected: `InvalidDate`,
  },
  {
    description: `fails validation if day is 0`,
    date: { day: 0, month: 4, year: 2024 },
    allowableDate: undefined,
    disallowPastDates: undefined,
    expected: `RequiredField`,
  },
  {
    description: `fails validation if month is 0`,
    date: { day: 4, month: 0, year: 2024 },
    allowableDate: undefined,
    disallowPastDates: undefined,
    expected: `RequiredField`,
  },
  {
    description: `fails validation if year is 0`,
    date: { day: 4, month: 4, year: 0 },
    allowableDate: undefined,
    disallowPastDates: undefined,
    expected: `RequiredField`,
  },
  {
    description: `fails validation if the year is two digits`,
    date: { day: 4, month: 20, year: 80 },
    allowableDate: undefined,
    disallowPastDates: undefined,
    expected: `InvalidDate`,
  },
  {
    description: `fails validation if year is before IRS creation year`,
    date: { day: 4, month: 4, year: 1860 },
    allowableDate: undefined,
    disallowPastDates: undefined,
    expected: `InvalidYear`,
  },
  {
    description: `fails validation if month is invalid`,
    date: { day: 4, month: 20, year: 2024 },
    allowableDate: undefined,
    disallowPastDates: undefined,
    expected: `InvalidDate`,
  },
  {
    description: `fails validation if day is invalid`,
    date: { day: 40, month: 4, year: 2024 },
    allowableDate: undefined,
    disallowPastDates: undefined,
    expected: `InvalidDate`,
  },
  {
    description: `fails validation for a non-leap year`,
    date: { day: 29, month: 2, year: 2021 },
    allowableDate: undefined,
    disallowPastDates: undefined,
    expected: `InvalidDayDueToLeapYear`,
  },
  {
    description: `successfully validates a leap year date`,
    date: { day: 29, month: 2, year: 2024 },
    allowableDate: undefined,
    disallowPastDates: undefined,
    expected: null,
  },
  {
    description: `successfully validates date with last allowable date`,
    date: { day: 15, month: 4, year: 2024 },
    allowableDate: new Date(`04/15/2024`),
    disallowPastDates: undefined,
    expected: null,
  },
  {
    description: `fails validation after last allowable date`,
    date: { day: 16, month: 4, year: 2024 },
    allowableDate: new Date(`04/15/2024`),
    disallowPastDates: undefined,
    expected: `AfterFilingDeadline`,
    setup: () => vi.setSystemTime(new Date(`2024-02-15T00:00:00`)),
    teardown: () => vi.setSystemTime(NOW),
  },
  {
    description: `successfully validates today if last allowable date is in the past`,
    date: { day: 17, month: 4, year: 2024 },
    allowableDate: new Date(`04/15/2024`),
    disallowPastDates: undefined,
    expected: null,
    setup: () => vi.setSystemTime(new Date(`2024-04-17T00:00:00`)),
    teardown: () => vi.setSystemTime(NOW),
  },
  {
    description: `successfully validates date in the past if allowed`,
    date: { day: 4, month: 4, year: 2020 },
    allowableDate: undefined,
    disallowPastDates: false,
    expected: null,
  },
  {
    description: `fails validation if past dates disallowed`,
    date: { day: TODAY, month: CURRENT_MONTH, year: CURRENT_YEAR - 1 },
    allowableDate: undefined,
    disallowPastDates: true,
    expected: `PastDate`,
  },
  {
    description: `passes full ACH date validation`,
    date: { day: 4, month: 4, year: 2024 },
    allowableDate: new Date(`04/15/2024`),
    disallowPastDates: false,
    expected: null,
  },
  {
    description: `allows the date to be equal to the last allowable date`,
    date: { day: TODAY, month: CURRENT_MONTH, year: CURRENT_YEAR + 1 },
    allowableDate: new Date(new Date().setFullYear(CURRENT_YEAR + 1)),
    disallowPastDates: true,
    expected: null,
  },
  {
    description: `allows the date to be equal to today`,
    date: { day: TODAY, month: CURRENT_MONTH, year: CURRENT_YEAR },
    allowableDate: new Date(new Date().setFullYear(CURRENT_YEAR + 1)),
    disallowPastDates: true,
    expected: null,
  },
  {
    description: `allows today even if the last allowable date is in the past`,
    date: { day: TODAY, month: CURRENT_MONTH, year: CURRENT_YEAR },
    allowableDate: new Date(new Date().setFullYear(CURRENT_YEAR - 1)),
    disallowPastDates: true,
    expected: null,
  },
];

describe(`DatePicker`, () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    // restoring date after each test run
    vi.useRealTimers();
  });

  beforeEach(() => {
    mocks.useFactGraph.mockImplementation(() => ({
      factGraph: new Map([
        [
          `/taxYear`,
          {
            get: `1979`,
            complete: true,
          },
        ],
        [
          `/incompleteTaxYear`,
          {
            get: `1979`,
            complete: false,
          },
        ],
        [
          `/taxDay`,
          {
            // Set the last allowable date to 10 days in the future.
            get: (new Date().getDate() + 10).toString(),
            complete: true,
          },
        ],
      ]),
    }));
  });

  it(`renders hint for path: /info/achPaymentDate`, () => {
    const { getByText } = render(
      <DatePicker
        {...{ ...props, path: `/achPaymentDate` as const, concretePath: Path.concretePath(path, collectionId) }}
      />
    );

    expect(getByText(testNs.info[`/info/achPaymentDate`].helpText.hint.text)).toBeInTheDocument();
  });

  it(`updates fields with user input`, () => {
    const { getByLabelText, getAllByRole } = render(<DatePicker {...props} />);
    const input = getAllByRole(`textbox`);
    const [monthInput, dayInput, yearInput] = input;

    fireEvent.change(monthInput, { target: { value: `12` } });
    expect(getByLabelText(translationNs.datePicker.month)).toHaveValue(`12`);
    fireEvent.change(dayInput, { target: { value: `28` } });
    expect(getByLabelText(translationNs.datePicker.day)).toHaveValue(`28`);
    fireEvent.change(yearInput, { target: { value: `2000` } });
    expect(getByLabelText(translationNs.datePicker.year)).toHaveValue(`2000`);
    fireEvent.change(monthInput, { target: { value: `` } });
  });

  it(`updates fields with error messages`, () => {
    const errorProps = {
      ...props,
      isValid: false,
      showFeedback: true,
    };

    const { getByTestId } = render(<DatePicker {...errorProps} />);
    expect(getByTestId(`errorMessage`)).toHaveTextContent(
      testNs.fields[`/filers/*/dateOfBirth`].errorMessages.RequiredField
    );
  });

  requirementOptions.forEach((option) => {
    testCases.forEach((testCase) => {
      it(`${testCase.description} when ${option.name}`, () => {
        if (testCase.setup) testCase.setup();

        const validationResult = validateDate(
          testCase.date as Day,
          testCase.allowableDate as Date | undefined,
          testCase.disallowPastDates as boolean | undefined,
          option.requiredBoolean
        );
        expect(validationResult).toBe(testCase.expected);

        if (testCase.teardown) testCase.teardown();
      });
    });
  });

  it(`does not render year picker if year is locked`, () => {
    const { queryByText } = render(<DatePicker {...{ ...props, lockYearTo: `/taxYear` as ConcretePath }} />);
    expect(queryByText(translationNs.datePicker.year)).not.toBeInTheDocument();
  });

  it(`throws error if lock year fact is incomplete`, () => {
    const renderWithError = () =>
      render(<DatePicker {...{ ...props, lockYearTo: `/incompleteTaxYear` as ConcretePath }} />);
    expect(renderWithError).toThrow();
  });

  it(`has required attribute on inputs and adds '(Required)' to legend by default`, () => {
    const { getByLabelText, getByTestId } = render(<DatePicker {...props} />);
    expect(getByLabelText(translationNs.datePicker.month)).toHaveAttribute(`required`);
    expect(getByLabelText(translationNs.datePicker.day)).toHaveAttribute(`required`);
    expect(getByLabelText(translationNs.datePicker.year)).toHaveAttribute(`required`);

    const legend = getByTestId(`legend`);
    expect(legend).toHaveTextContent(`${requiredMarker}`);
  });

  it(`does not have any required attributes on or '(Required)' in the legend if 'required' is false`, () => {
    const { getByLabelText, getByTestId } = render(<DatePicker {...{ ...props, required: false }} />);
    expect(getByLabelText(translationNs.datePicker.month)).not.toHaveAttribute(`required`);
    expect(getByLabelText(translationNs.datePicker.day)).not.toHaveAttribute(`required`);
    expect(getByLabelText(translationNs.datePicker.year)).not.toHaveAttribute(`required`);

    const legend = getByTestId(`legend`);
    expect(legend).not.toHaveTextContent(`${requiredMarker}`);
  });

  describe(`builds an appopriate autoComplete prop if...`, () => {
    it(`is not given`, () => {
      const { getByLabelText } = render(<DatePicker {...props} />);
      expect(getByLabelText(/Month/)).not.toHaveAttribute(`autoComplete`);
    });

    it(`is the primary filer's bday`, () => {
      const { getByLabelText } = render(<DatePicker autoComplete='bday' {...props} />);
      expect(getByLabelText(/Month/)).toHaveAttribute(`autoComplete`, `bday-month`);
    });

    it(`is any other date`, () => {
      const { getByLabelText } = render(<DatePicker autoComplete='secondary cc-exp' {...props} />);
      expect(getByLabelText(/Month/)).toHaveAttribute(`autoComplete`, `secondary cc-exp-month`);
    });
  });
});

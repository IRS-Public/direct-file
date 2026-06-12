import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { ComplexFormControl } from './ComplexFormControl.js';
import { PAGE_HEADING_ID } from '../PageTitle/index.js';
import { ConcretePath } from '@irs/js-factgraph-scala';
import { Path } from '../../fact-dictionary/Path.js';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    t: vi.fn((key: string) => key),
  };
});
vi.mock(`react-i18next`, () => ({
  useTranslation: () => {
    return {
      t: mocks.t,
    };
  },
  initReactI18next: {
    type: `3rdParty`,
  },
  Trans: ({ i18nKey }: { i18nKey: string }) => mocks.t(i18nKey),
}));

const mockValidationErrors = new Map();
mockValidationErrors.set(`string`, `some error`);
const sharedProps = {
  path: `/fake/path` as Path,
  concretePath: `/fake/path` as ConcretePath,
  showError: false,
  type: `text`,
  errorMessage: `Please see errors below`,
  children: <></>,
} as React.ComponentProps<typeof ComplexFormControl>;

describe(`ComplexFormControl`, () => {
  const translationPlaceholder = `TRANSLATED LABEL`;
  const renderControl = (overrides: Partial<Parameters<typeof ComplexFormControl>[0]> = {}) =>
    render(<ComplexFormControl {...{ ...sharedProps, ...overrides }} />);

  it(`renders without errrors`, () => {
    renderControl();
  });

  it(`displays and translates label`, () => {
    mocks.t.mockImplementation(() => translationPlaceholder);

    renderControl({ labelledBy: `legend` });

    const legend = screen.getByText(translationPlaceholder);

    expect(legend).toBeInTheDocument();
    expect(legend).toBeInstanceOf(HTMLLegendElement);
  });

  it(`displays error messages`, () => {
    const errorMessage = `Something went wrong`;
    const { getByText } = renderControl({ errorMessage, showError: true });

    const providedError = getByText(errorMessage);
    expect(providedError).toBeInTheDocument();
  });

  it(`only uses aria-describedby when there is an error`, () => {
    const errorMessage = `Something went wrong`;
    renderControl();

    const fieldsetWithError = screen.getByRole(`group`);
    expect(fieldsetWithError).not.toHaveAttribute(`aria-describedby`);

    renderControl({ errorMessage, showError: true });
    const fieldsetWithErrorUpdated = screen.getByRole(`group`, { description: errorMessage });
    expect(fieldsetWithErrorUpdated).toBeInTheDocument();
  });

  describe(`when labelledBy`, () => {
    describe(`is not set`, () => {
      it(`references the legend by default`, () => {
        const { queryByTestId, getByRole } = renderControl({ labelledBy: `legend` });

        const legend = queryByTestId(`legend`);
        expect(legend).toBeInTheDocument();

        const fieldset = getByRole(`group`) as HTMLFieldSetElement;
        expect(fieldset.getAttribute(`aria-labelledby`)).not.toBe(PAGE_HEADING_ID);
      });
    });

    describe(`equals 'heading'`, () => {
      it(`references the heading instead of adding a legend`, () => {
        const { queryByTestId, getByRole } = renderControl({ labelledBy: `heading` });

        const legend = queryByTestId(`legend`);
        expect(legend).not.toBeInTheDocument();

        const fieldset = getByRole(`group`) as HTMLFieldSetElement;
        expect(fieldset.getAttribute(`aria-labelledby`)).toBe(PAGE_HEADING_ID);
      });

      it(`displays '(Required)' to indicate responses are required`, () => {
        const { getByTestId } = renderControl({ labelledBy: `heading` });

        const indicatesRequired = getByTestId(`required-explainer`);
        expect(indicatesRequired).toBeInTheDocument();
      });
    });

    describe(`equals 'self'`, () => {
      it(`does not render legend and aria-labelledby is not set to heading`, () => {
        const { queryByTestId, getByRole } = renderControl({ labelledBy: `self` });

        const legend = queryByTestId(`legend`);
        expect(legend).not.toBeInTheDocument();

        const fieldset = getByRole(`group`) as HTMLFieldSetElement;
        expect(fieldset.getAttribute(`aria-labelledby`)).not.toBe(PAGE_HEADING_ID);
      });
      it(`does not display '(Required)' explainer`, () => {
        const { queryByTestId } = renderControl({ labelledBy: `self` });

        const indicatesRequired = queryByTestId(`required-explainer`);
        expect(indicatesRequired).not.toBeInTheDocument();
      });
    });

    describe(`render as select handling`, () => {
      it(`renders a label and does not wrap it in a fieldset when shouldRenderAsSelect is true`, () => {
        const { queryByTestId, getByTestId } = renderControl({ shouldRenderAsSelect: true });

        const legend = queryByTestId(`legend`);
        expect(legend).not.toBeInTheDocument();

        const label = getByTestId(`label`);
        expect(label).toBeInTheDocument();
      });
      it(`renders a fieldset and legend when shouldRenderAsSelect is false`, () => {
        const { getByTestId } = renderControl({ shouldRenderAsSelect: false, labelledBy: `legend` });

        const legend = getByTestId(`legend`);
        expect(legend).toBeInTheDocument();

        const fieldset = getByTestId(`fieldset`);
        expect(fieldset).toBeInTheDocument();
      });
    });
  });

  afterAll(() => {
    vi.clearAllMocks();
  });
});

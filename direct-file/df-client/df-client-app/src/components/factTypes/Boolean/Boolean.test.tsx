import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import Boolean from './Boolean.js';
import { FactGraphContextProvider } from '../../../factgraph/FactGraphContext.js';
import { setupStore } from '../../../redux/store.js';
import { ConcretePath } from '@irs/js-factgraph-scala';
import { test, expect } from 'vitest';
import { AbsolutePath } from '../../../fact-dictionary/Path.js';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  // useFact related hooks
  const getFact = vi.fn();
  const setFact = vi.fn();
  const useFact = vi.fn(() => [getFact(), setFact]);

  // translation
  const t = vi.fn((key: string | string[]) => (Array.isArray(key) ? key[0] : key));

  return { getFact, useFact, setFact, t };
});

vi.mock(`react-i18next`, () => ({
  useTranslation: () => {
    return {
      t: mocks.t,
    };
  },
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{mocks.t(i18nKey)}</>,
}));

vi.mock(`../../../hooks/useFact`, () => ({
  default: mocks.useFact,
}));

enum YesNo {
  Yes = `Yes`,
  No = `No`,
}

for (const inputType of [`radio`, `checkbox`]) {
  describe(`Boolean form control with ${inputType} input type`, () => {
    const path = `/livedApartAllYear` as AbsolutePath;
    const sharedProps = {
      path,
      concretePath: path as ConcretePath,
      isValid: true,
      showFeedback: false,
      onValidData: vi.fn(),
      saveAndPersist: vi.fn(),
    };

    const renderControl = (overrides: Partial<Parameters<typeof Boolean>[0]> = {}) =>
      render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Boolean
              collectionId={null}
              {...{ ...sharedProps, ...overrides }}
              inputType={inputType as `radio` | `checkbox`}
            ></Boolean>
          </FactGraphContextProvider>
        </Provider>
      );

    it(`renders without errors`, () => {
      const { getAllByRole } = renderControl();

      const expectedLabels =
        inputType === `checkbox`
          ? [`fields.${path}.boolean.yes`]
          : [`fields.${path}.boolean.no`, `fields.${path}.boolean.yes`];

      const expectedOptions = inputType === `checkbox` ? [YesNo.Yes] : [YesNo.No, YesNo.Yes];

      const options = getAllByRole(inputType) as HTMLInputElement[];
      const optionValues = options.map(({ value }) => value);
      const optionLabels = options
        .flatMap(({ labels }) => Array.from(labels ?? []))
        .map(({ textContent }) => textContent);

      // Sort results to ensure that reordering the options doesn't break the test
      optionValues.sort();
      optionLabels.sort();
      expect(optionValues).toEqual(expectedOptions);

      expect(optionLabels).toEqual(expectedLabels);
    });
    // Incomplete fact is one that does not have any prior saved information
    describe(`when fact is incomplete`, () => {
      it(`has no selected option`, () => {
        // NOTE: This exists because it is surprisingly easy to forget that undefined is falsey

        const { getAllByRole } = renderControl();

        const options = getAllByRole(inputType) as HTMLInputElement[];
        const yesOption = options.find((option) => (option.value = YesNo.Yes));
        const noOption = options.find((option) => (option.value = YesNo.No));

        expect(yesOption?.checked).toStrictEqual(false);
        expect(noOption?.checked).toStrictEqual(false);
      });
    });

    describe(`when fact is complete`, () => {
      test.each([true, false])(`selects the correct option when to %s`, () => {
        mocks.getFact.mockImplementation;
        const { getAllByRole } = renderControl();

        const options = getAllByRole(inputType) as HTMLInputElement[];

        const selectedOptions = options.filter((option) => option.checked);
        expect(selectedOptions.length).to;
      });
    });

    it(`propagates user selections`, () => {
      const { getAllByRole } = renderControl();

      const [someOption] = getAllByRole(inputType) as HTMLInputElement[];
      const valueAsBoolean = someOption.value === YesNo.Yes;

      fireEvent.click(someOption);

      expect(mocks.setFact).toBeCalledWith(valueAsBoolean);
    });

    if (inputType === `checkbox`) {
      describe(`when checkbox is required`, () => {
        it(`displays a required label`, () => {
          const { getAllByTestId } = renderControl();
          const [requiredLabel] = getAllByTestId(`required-explainer`) as HTMLInputElement[];
          expect(requiredLabel).toBeInTheDocument();
        });
        it(`will show an error if user does not check the box`, () => {
          mocks.getFact.mockImplementation;
          const { getByText } = renderControl({ showFeedback: true, isValid: false });
          expect(getByText(`enums.messages.requiredField`)).toBeInTheDocument();
        });
      });
      describe(`when checkbox is not required`, () => {
        it(`does not display a required label`, () => {
          const { queryByTestId } = renderControl({ required: false });
          const requiredLabel = queryByTestId(`required-explainer`) as HTMLInputElement;
          expect(requiredLabel).not.toBeInTheDocument();
        });
        it(`will not show an error if checkbox is not clicked`, () => {
          mocks.getFact.mockImplementation;
          const { queryByText } = renderControl({ showFeedback: true, required: false });
          expect(queryByText(`enums.messages.requiredField`)).not.toBeInTheDocument();
        });
      });
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });
  });
}

import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';

import mockEnYaml from '../../../locales/en.yaml';
import { mockUseTranslation } from '../../../test/mocks/mockFunctions.js';

import Address, { getStreetCharacterCount } from './Address.js';
import { FactGraphContextProvider } from '../../../factgraph/FactGraphContext.js';
import { setupStore } from '../../../redux/store.js';
import { createRef } from 'react';
import { ConcretePath } from '@irs/js-factgraph-scala';
import { Path } from '../../../flow/Path.js';
import { vi } from 'vitest';

// This mock allows for testing of any component that is rendered using the
// useTranslation hook from react-i18next.
vi.mock(`react-i18next`, () => ({
  useTranslation: mockUseTranslation,
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
  Trans: ({ i18nKey }: { i18nKey: string | string[] }) => mockUseTranslation().t(i18nKey),
}));

let validMap = new Map();

const onValid = (path: ConcretePath, validity: boolean) => validMap.set(path, validity);
const ref = createRef<HTMLInputElement>();

// Todo: update tests to new pattern
describe(`Address`, () => {
  beforeEach(() => {
    validMap = new Map();
    validMap.set(`/address`, false);
  });

  const props = {
    path: `/address` as const,
    concretePath: Path.concretePath(`/address`, null),
    onValidData: onValid,
    showFeedback: false,
    isValid: validMap.get(`/address`),
    ref: ref,
    collectionId: null,
    saveAndPersist: vi.fn(),
    useCombinedStreetLengthForValidation: true as const,
  };

  it(`renders correctly`, () => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <Address {...props} />
        </FactGraphContextProvider>
      </Provider>
    );
    expect(screen.getByLabelText(/Country/)).toBeInTheDocument();
  });

  it(`updates the address fact when a user enters data`, () => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <Address {...props} />
        </FactGraphContextProvider>
      </Provider>
    );
    const input = screen.getByLabelText(/City/);

    fireEvent.change(input, { target: { value: `Denver` } });
    expect(input).toHaveValue(`Denver`);
  });

  it(`uses custom address labels if provided`, () => {
    // employerAddress has special labels in the yaml
    const employerProps = { ...props, path: `/formW2s/*/employerAddress` as const };
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <Address {...employerProps} />
        </FactGraphContextProvider>
      </Provider>
    );
    let input = screen.getByLabelText(/Employer city/);
    expect(input).toBeInTheDocument();
    input = screen.getByLabelText(/Employer address/);
    expect(input).toBeInTheDocument();
    input = screen.getByLabelText(/Employer countr/);
    expect(input).toBeInTheDocument();
    input = screen.getByLabelText(/Employer state/);
    expect(input).toBeInTheDocument();
  });

  describe(`builds an appopriate autoComplete prop if...`, () => {
    function renderWithAutoComplete(autoComplete?: string) {
      return render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address autoComplete={autoComplete} {...props} />
          </FactGraphContextProvider>
        </Provider>
      );
    }

    it(`is not given`, () => {
      renderWithAutoComplete();
      expect(screen.getByLabelText(/Country/)).not.toHaveAttribute(`autoComplete`);
    });

    it(`is the primary filer's address`, () => {
      renderWithAutoComplete(`street-address`);
      expect(screen.getByLabelText(/Country/)).toHaveAttribute(`autoComplete`, `country-name`);
    });

    it(`is another given address`, () => {
      renderWithAutoComplete(`section-user1 billing`);
      expect(screen.getByLabelText(/Country/)).toHaveAttribute(`autoComplete`, `section-user1 billing country-name`);
    });
  });

  describe(`Street address field`, () => {
    it(`displays an error message if the street address is blank`, () => {
      const showErrorProps = { ...props, showFeedback: true, isDirty: true, isValid: false };
      render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );
      const addressInput = screen.getByLabelText(/Address/);

      fireEvent.change(addressInput, { target: { value: `` } });
      fireEvent.blur(addressInput);
      expect(screen.getAllByText(mockEnYaml.enums.messages.requiredField)[0]).toBeInTheDocument();
    });

    it(`displays an error message if the street address has invalid chars`, () => {
      const showErrorProps = {
        ...props,
        showFeedback: true,
        isDirty: true,
        isValid: false,
      };
      render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );
      const addressInput = screen.getByLabelText(/Address/);

      fireEvent.change(addressInput, { target: { value: `123 Cherry Ave.` } });
      fireEvent.blur(addressInput);
      expect(
        screen.getAllByText(mockEnYaml.fields.generics.address.errorMessages.InvalidStreetChars)[0]
      ).toBeInTheDocument();
    });

    it(`displays an error message if the street address line 2 has invalid chars`, () => {
      const showErrorProps = {
        ...props,
        showFeedback: true,
        isDirty: true,
        isValid: false,
      };
      render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );
      const addressInput = screen.getByLabelText(/Address/);

      fireEvent.change(addressInput, { target: { value: `123 Cherry Ave\nApt. 34` } });
      fireEvent.blur(addressInput);
      expect(
        screen.getAllByText(mockEnYaml.fields.generics.address.errorMessages.InvalidStreetChars)[0]
      ).toBeInTheDocument();
    });

    it(`adds aria-describedby to Address textarea only when there is an error`, () => {
      let showErrorProps = { ...props, showFeedback: false, isDirty: false, isValid: true };
      const { rerender } = render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );

      const fieldWithOutError = screen.getByRole(`textbox`, { name: /Address/ });
      expect(fieldWithOutError).not.toHaveAttribute(`aria-describedby`);

      showErrorProps = { ...props, showFeedback: true, isDirty: true, isValid: false };

      rerender(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );

      const fieldWithError = screen.getByRole(`textbox`, { name: /Address/, description: `This field is required` });
      expect(fieldWithError).toBeInTheDocument();
    });

    it(`tests the character count without new line`, () => {
      expect(getStreetCharacterCount(`123 Main St`)).toBe(11);
    });

    it(`tests the character count to include the new line as part of the character count`, () => {
      expect(getStreetCharacterCount(`123 Main St\nApt 2e`)).toBe(18);
    });

    it(`tests the character count to include the new line as part of the character count`, () => {
      expect(getStreetCharacterCount(`\n\n\n\n123 Main St\n\n\nApt 2e\n\n\n\n`)).toBe(18);
    });
  });

  describe(`City field`, () => {
    it(`displays an error message if the city is blank`, () => {
      const showErrorProps = { ...props, showFeedback: true, isDirty: true, isValid: false };
      render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );
      const cityInput = screen.getByLabelText(/City/);

      fireEvent.change(cityInput, { target: { value: `` } });
      fireEvent.blur(cityInput);
      expect(screen.getAllByText(mockEnYaml.enums.messages.requiredField)[0]).toBeInTheDocument();
    });

    it(`adds aria-describedby to city input only when there is an error`, () => {
      let showErrorProps = { ...props, showFeedback: false, isDirty: false, isValid: true };
      const { rerender } = render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );

      const fieldWithOutError = screen.getByRole(`textbox`, { name: /City/ });
      expect(fieldWithOutError).not.toHaveAttribute(`aria-describedby`);

      showErrorProps = { ...props, showFeedback: true, isDirty: true, isValid: false };

      rerender(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );

      const fieldWithError = screen.getByRole(`textbox`, { name: /City/, description: `This field is required` });
      expect(fieldWithError).toBeInTheDocument();
    });
  });

  describe(`State field`, () => {
    it(`displays an error message if the state is blank`, () => {
      const showErrorProps = { ...props, showFeedback: true, isDirty: true, isValid: false };
      render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );
      const stateInput = screen.getByLabelText(/State/);

      fireEvent.change(stateInput, { target: { value: `` } });
      fireEvent.blur(stateInput);
      expect(screen.getAllByText(mockEnYaml.enums.messages.requiredField)[0]).toBeInTheDocument();
    });

    it(`adds aria-describedby to state dropdown only when there is an error`, () => {
      let showErrorProps = { ...props, showFeedback: false, isDirty: false, isValid: true };
      const { rerender } = render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );

      const fieldWithOutError = screen.getByRole(`combobox`, { name: /State/ });
      expect(fieldWithOutError).not.toHaveAttribute(`aria-describedby`);

      showErrorProps = { ...props, showFeedback: true, isDirty: true, isValid: false };

      rerender(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );

      const fieldWithError = screen.getByRole(`combobox`, {
        name: /State/,
        description: `This field is required`,
      });
      expect(fieldWithError).toBeInTheDocument();
    });
  });

  describe(`ZIP code field`, () => {
    it(`displays an error message if the ZIP is blank`, () => {
      const showErrorProps = { ...props, showFeedback: true, isDirty: true, isValid: false };
      render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );
      const zipInput = screen.getByLabelText(/ZIP code/);

      fireEvent.change(zipInput, { target: { value: `` } });
      fireEvent.blur(zipInput);
      expect(screen.getAllByText(mockEnYaml.enums.messages.requiredField)[0]).toBeInTheDocument();
    });

    it(`adds aria-describedby to zip code textbox only when there is an error`, () => {
      let showErrorProps = { ...props, showFeedback: false, isDirty: false, isValid: true };
      const { rerender } = render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );

      const fieldWithOutError = screen.getByRole(`textbox`, { name: /ZIP code/ });
      expect(fieldWithOutError).not.toHaveAttribute(`aria-describedby`);

      showErrorProps = { ...props, showFeedback: true, isDirty: true, isValid: false };

      rerender(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...showErrorProps} />
          </FactGraphContextProvider>
        </Provider>
      );

      const fieldWithError = screen.getByRole(`textbox`, { name: /ZIP code/, description: `This field is required` });
      expect(fieldWithError).toBeInTheDocument();
    });
  });

  describe(`Country field`, () => {
    it(`does not display an error message if the country is valid`, () => {
      render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <Address {...props} />
          </FactGraphContextProvider>
        </Provider>
      );
      const countryInput = screen.getByLabelText(/Country/);
      fireEvent.change(countryInput, { target: { value: `United States` } });
      expect(
        screen.queryByText(mockEnYaml.fields.generics.address.errorMessages.RequiredField)
      ).not.toBeInTheDocument();
    });
  });
});

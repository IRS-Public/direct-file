import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';

import { mockUseTranslation } from '../../../test/mocks/mockFunctions.js';
import mockEnYaml from '../../../locales/en.yaml';

import PhoneNumber from './PhoneNumber.js';
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
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{mockUseTranslation().t(i18nKey)}</>,
}));

const path = `/phone` as const;

let validMap = new Map();

const onValid = (path: ConcretePath, validity: boolean) => validMap.set(path, validity);

const ref = createRef<HTMLInputElement>();

const requiredMarker = `(Required)`;

const props = {
  path: path,
  concretePath: Path.concretePath(path, null),
  onValidData: onValid,
  isValid: validMap.get(path),
  showFeedback: false,
  ref: ref,
  required: true,
  collectionId: null,
  saveAndPersist: vi.fn(),
};

describe(`Phone Number`, () => {
  beforeEach(() => {
    validMap = new Map();
    validMap.set(path, false);
  });

  it(`renders without errors`, () => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <PhoneNumber {...props} />
        </FactGraphContextProvider>
      </Provider>
    );
  });

  it(`displays label correctly`, () => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <PhoneNumber {...props} />
        </FactGraphContextProvider>
      </Provider>
    );
    const label = screen.getByLabelText(`${mockEnYaml.fields[`${path}`].name} ${requiredMarker}`);
    expect(label).toBeInTheDocument();
  });

  it(`field updates with user input`, () => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <PhoneNumber {...props} />
        </FactGraphContextProvider>
      </Provider>
    );
    const input = screen.getByLabelText(`${mockEnYaml.fields[`${path}`].name} ${requiredMarker}`);
    fireEvent.change(input, { target: { value: `123` } });
    expect(input).toHaveValue(`123`);
  });
});

describe(`validation errors`, () => {
  const mockEnYamlErrorMessages = mockEnYaml.fields[`${path}`].usPhoneNumber.errorMessages;
  const testCases = [
    {
      name: `checks if malformed or number of digits on change`,
      input: `123`,
      error: mockEnYamlErrorMessages.MalformedPhoneNumber,
    },
    {
      name: `checks if area code starts with 0 on change`,
      input: `0123450987`,
      error: mockEnYamlErrorMessages.InvalidAreaCode,
    },
    {
      name: `checks if area code starts with 1 on change`,
      input: `1123450987`,
      error: mockEnYamlErrorMessages.InvalidAreaCode,
    },
    {
      name: `checks if Office code starts with 0 on change`,
      input: `5120450987`,
      error: mockEnYamlErrorMessages.InvalidOfficeCode,
    },
    {
      name: `checks if Office code starts with 1 on change`,
      input: `5121450987`,
      error: mockEnYamlErrorMessages.InvalidOfficeCode,
    },
    {
      name: `checks if area code middle 9 on change`,
      input: `3925555555`,
      error: mockEnYamlErrorMessages.InvalidAreaCode,
    },
  ];

  for (const test of testCases) {
    it(test.name, () => {
      render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <PhoneNumber
              path={path}
              concretePath={Path.concretePath(path, null)}
              onValidData={onValid}
              isValid={validMap.get(path)}
              showFeedback={true}
              ref={ref}
              required={true}
              collectionId={null}
              saveAndPersist={vi.fn()}
            />
          </FactGraphContextProvider>
        </Provider>
      );
      const input = screen.getByLabelText(`${mockEnYaml.fields[`${path}`].name} ${requiredMarker}`);
      fireEvent.change(input, { target: { value: test.input } });
      expect(screen.getByText(test.error)).toBeInTheDocument();
    });
  }
});

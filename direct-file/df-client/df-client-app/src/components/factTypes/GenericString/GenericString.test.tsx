import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';

import mockEnYaml from '../../../locales/en.yaml';
import { mockUseTranslation } from '../../../test/mocks/mockFunctions.js';

import GenericString from './GenericString.js';
import { FactGraphContextProvider } from '../../../factgraph/FactGraphContext.js';
import { setupStore } from '../../../redux/store.js';
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

let validMap = new Map();

const onValid = (path: ConcretePath, validity: boolean) => validMap.set(path, validity);
const requiredMarker = `(Required)`;

describe(`/email`, () => {
  const path = `/email` as const;
  beforeEach(() => {
    validMap = new Map();
    validMap.set(path, false);
  });

  const props = {
    path: path,
    concretePath: Path.concretePath(path, null),
    onValidData: onValid,
    isValid: validMap.get(path),
    showFeedback: false,
    collectionId: null,
    saveAndPersist: vi.fn(),
  };

  it(`renders without errrors`, () => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <GenericString {...props} />
        </FactGraphContextProvider>
      </Provider>
    );
  });

  it(`displays label correctly and is enabled by default`, () => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <GenericString {...props} />
        </FactGraphContextProvider>
      </Provider>
    );
    const label = screen.getByLabelText(`${mockEnYaml.fields[`${path}`].name} ${requiredMarker}`);
    expect(label).toBeInTheDocument();
    const input = screen.getByLabelText(`${mockEnYaml.fields[`${path}`].name} ${requiredMarker}`);
    expect(input).toBeEnabled();
  });

  it(`is disabled when read-only is true`, () => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <GenericString {...props} readOnly={true} />
        </FactGraphContextProvider>
      </Provider>
    );
    const input = screen.getByLabelText(`${mockEnYaml.fields[`${path}`].name}`);
    expect(input).toHaveAttribute(`readOnly`);
  });

  it(`is enabled when read-only is false`, () => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <GenericString {...props} readOnly={false} />
        </FactGraphContextProvider>
      </Provider>
    );
    const input = screen.getByLabelText(`${mockEnYaml.fields[`${path}`].name} ${requiredMarker}`);
    expect(input).not.toHaveAttribute(`readOnly`);
  });
});

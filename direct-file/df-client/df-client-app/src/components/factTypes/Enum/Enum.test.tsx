import { createRef } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { mockUseTranslation } from '../../../test/mocks/mockFunctions.js';
import { Path as FgPath } from '../../../fact-dictionary/Path.js';
import { FactGraphContextProvider } from '../../../factgraph/FactGraphContext.js';
import { setupStore } from '../../../redux/store.js';
import { Path } from '../../../flow/Path.js';
import { vi } from 'vitest';

import Enum from './Enum.js';

const mocks = vi.hoisted(() => {
  const getOptionsPath = vi.fn((path: FgPath) => {
    return `${path}Options`;
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getValues = vi.fn((_path: FgPath) => [] as string[]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const useEnumOptions = vi.fn((path: FgPath, _collectionId: string) => {
    return {
      optionsPath: getOptionsPath(path),
      values: getValues(path),
    };
  });

  return { getOptionsPath, getValues, useEnumOptions };
});

vi.mock(`react-i18next`, () => ({
  useTranslation: mockUseTranslation,
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
  Trans: ({ i18nKey }: { i18nKey: string | string[] }) => mockUseTranslation().t(i18nKey),
}));

vi.mock(`../../../hooks/useEnumOptions`, () => ({
  useEnumOptions: mocks.useEnumOptions,
}));

const ref = createRef<HTMLInputElement>();

const path: FgPath = `/languagePreference`;
const optionsPath: FgPath = `/languageOptions`;
const sharedProps: Parameters<typeof Enum>[0] = {
  path,
  concretePath: Path.concretePath(path, null),
  isValid: true,
  onValidData: vi.fn(),
  showFeedback: false,
  ref,
  collectionId: null,
  saveAndPersist: vi.fn(),
};

describe(`Enum`, () => {
  it(`renders without error`, () => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <Enum {...sharedProps} />
        </FactGraphContextProvider>
      </Provider>
    );
  });

  it(`renders the options associated with its path`, () => {
    const mockOptions = [`english`, `spanish`];
    mocks.getValues.mockReturnValue(mockOptions);
    mocks.getOptionsPath.mockReturnValue(optionsPath);

    const { getAllByRole } = render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <Enum {...sharedProps} />
        </FactGraphContextProvider>
      </Provider>
    );

    const options = getAllByRole(`radio`) as HTMLInputElement[];

    expect(mocks.useEnumOptions).toBeCalledWith(sharedProps.path, sharedProps.collectionId);
    expect(options.map(({ value }) => value)).toEqual(mockOptions);

    const labels = options.flatMap((option) => Array.from(option.labels ?? []));
    const labelsText = labels.map((label) => label.textContent);
    const expectedLabelsText = [`English`, `Spanish (Español)`];

    expect(labels.length).toEqual(options.length);
    expect(labelsText).toEqual(expectedLabelsText);
  });

  it(`renders as a dropdown select when there are fewer than 7 options but renderAs prop is set to 'select'`, () => {
    const mockOptions = [`english`, `spanish`, `korean`];
    mocks.getValues.mockReturnValue(mockOptions);
    mocks.getOptionsPath.mockReturnValue(optionsPath);

    const { getByRole } = render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <Enum {...sharedProps} renderAs='select' />
        </FactGraphContextProvider>
      </Provider>
    );

    const dropdown = getByRole(`combobox`);
    expect(dropdown).toBeInTheDocument();
  });

  it(`renders as a dropdown select when there are more than 7 options`, () => {
    const mockOptions = [`english`, `spanish`, `korean`, `vietnamese`, `russian`, `arabic`, `haitian`, `tagalog`];
    mocks.getValues.mockReturnValue(mockOptions);
    mocks.getOptionsPath.mockReturnValue(optionsPath);

    const { getByRole } = render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <Enum {...sharedProps} />
        </FactGraphContextProvider>
      </Provider>
    );

    const dropdown = getByRole(`combobox`);
    expect(dropdown).toBeInTheDocument();
  });

  it(`renders as radio buttons when there are fewer than 7 options`, () => {
    const mockOptions = [`english`, `spanish`];
    mocks.getValues.mockReturnValue(mockOptions);
    mocks.getOptionsPath.mockReturnValue(optionsPath);

    const { getAllByRole } = render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <Enum {...sharedProps} />
        </FactGraphContextProvider>
      </Provider>
    );

    const radioButtons = getAllByRole(`radio`);
    expect(radioButtons.length).toBe(2);
  });

  it(`renders as radio buttons when there are more than 7 options, but the renderAs prop is set to radio`, () => {
    const mockOptions = [`english`, `spanish`, `korean`, `vietnamese`, `russian`, `arabic`, `haitian`, `tagalog`];
    mocks.getValues.mockReturnValue(mockOptions);
    mocks.getOptionsPath.mockReturnValue(optionsPath);

    const { getAllByRole } = render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <Enum {...sharedProps} renderAs='radio' />
        </FactGraphContextProvider>
      </Provider>
    );

    const radioButtons = getAllByRole(`radio`);
    expect(radioButtons.length).toBe(8);
  });

  it(`renders an error when no values are provided`, () => {
    mocks.getValues.mockReturnValue([]);
    mocks.getOptionsPath.mockReturnValue(optionsPath);

    const { getByTestId } = render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <Enum {...sharedProps} />
        </FactGraphContextProvider>
      </Provider>
    );

    const errorAlert = getByTestId(`alert`);
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveClass(`usa-alert--error`);
    expect(errorAlert).toHaveTextContent(`Unable to display options -- incomplete data`);
  });

  it(`does not use aria-describedby on select box only when there are no errors`, () => {
    mocks.getValues.mockReturnValue([
      `english`,
      `spanish`,
      `korean`,
      `vietnamese`,
      `russian`,
      `arabic`,
      `haitian`,
      `tagalog`,
    ]);
    mocks.getOptionsPath.mockReturnValue(optionsPath);

    const { getByRole } = render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <Enum {...sharedProps} />
        </FactGraphContextProvider>
      </Provider>
    );

    const combobox = getByRole(`combobox`);
    expect(combobox).not.toHaveAttribute(`aria-describedby`);
  });

  it(`uses aria-describedby on select box only when there are errors`, () => {
    mocks.getValues.mockReturnValue([
      `english`,
      `spanish`,
      `korean`,
      `vietnamese`,
      `russian`,
      `arabic`,
      `haitian`,
      `tagalog`,
    ]);
    mocks.getOptionsPath.mockReturnValue(optionsPath);

    const { getByRole } = render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <Enum {...{ ...sharedProps, isValid: false, showFeedback: true }} />
        </FactGraphContextProvider>
      </Provider>
    );

    const combobox = getByRole(`combobox`);
    expect(combobox).toHaveAttribute(`aria-describedby`);
  });

  afterEach(() => vi.restoreAllMocks());
});

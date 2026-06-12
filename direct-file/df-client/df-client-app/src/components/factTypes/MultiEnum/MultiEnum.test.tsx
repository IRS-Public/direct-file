import { createRef } from 'react';
import { render } from '@testing-library/react';
import MultiEnum from './MultiEnum.js';
import { Path as FgPath } from '../../../fact-dictionary/Path.js';
import { Path } from '../../../flow/Path.js';
import { vi } from 'vitest';

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

  const useFact = vi.fn(() => [undefined, vi.fn(), vi.fn(), false]);

  return { getOptionsPath, getValues, useEnumOptions, useFact };
});

vi.mock(`react-i18next`, () => ({
  useTranslation: () => ({ t: (path: string) => path, i18n: { exists: () => true } }),
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
  Trans: ({ i18nKey }: { i18nKey: string | string[] }) => i18nKey,
}));

vi.mock(`../../../hooks/useEnumOptions`, () => ({
  useEnumOptions: mocks.useEnumOptions,
}));

vi.mock(`../../../hooks/useFact`, () => ({ default: mocks.useFact }));

const ref = createRef<HTMLInputElement>();

const path = `/fakeFact1` as FgPath;
const optionsPath = `/fakeOptions`;
const sharedProps: Parameters<typeof MultiEnum>[0] = {
  path,
  concretePath: Path.concretePath(path, null),
  isValid: true,
  onValidData: vi.fn(),
  showFeedback: false,
  ref,
  collectionId: null,
  saveAndPersist: vi.fn(),
};

describe(`MultiEnum component`, () => {
  it(`renders without error`, () => {
    const props = {
      id: `myId`,
      name: `missingReason`,
      ...sharedProps,
    };
    render(<MultiEnum {...props} />);
  });

  it(`renders the options associated with its path`, () => {
    const mockOptions = [`fakeOption1`, `fakeOption2`];
    mocks.getValues.mockReturnValue(mockOptions);
    mocks.getOptionsPath.mockReturnValue(optionsPath);

    const { getAllByRole } = render(<MultiEnum {...sharedProps} />);

    const options = getAllByRole(`checkbox`) as HTMLInputElement[];

    expect(mocks.useEnumOptions).toBeCalledWith(sharedProps.path, sharedProps.collectionId);
    expect(options.map(({ value }) => value)).toEqual(mockOptions);

    const labels = options.flatMap((option) => Array.from(option.labels ?? []));
    const labelsText = labels.map((label) => label.textContent);
    const expectedLabelsText = [
      `fields./fakeFact1./fakeOptions.fakeOption1,fields./fakeOptions.fakeOption1.text`,
      `fields./fakeFact1./fakeOptions.fakeOption2,fields./fakeOptions.fakeOption2.text`,
    ];

    expect(labels.length).toEqual(options.length);
    expect(labelsText).toEqual(expectedLabelsText);
  });

  it(`renders an error when no values are provided`, () => {
    mocks.getValues.mockReturnValue([]);
    mocks.getOptionsPath.mockReturnValue(optionsPath);

    const { getByTestId } = render(<MultiEnum {...sharedProps} />);

    const errorAlert = getByTestId(`alert`);
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveClass(`usa-alert--error`);
    expect(errorAlert).toHaveTextContent(`enums.errorMessages.IncompleteData`);
  });
});

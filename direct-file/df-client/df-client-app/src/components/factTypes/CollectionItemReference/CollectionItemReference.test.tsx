import { createRef } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';

import { Path as FgPath } from '../../../fact-dictionary/Path.js';
import { FactGraphContextProvider } from '../../../factgraph/FactGraphContext.js';
import { setupStore } from '../../../redux/store.js';
import { Path } from '../../../flow/Path.js';

import { mockUseTranslation } from '../../../test/mocks/mockFunctions.js';

import CollectionItemReference from './CollectionItemReference.js';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const getCollectionPath = vi.fn((path: FgPath) => path);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getCollectionItems = vi.fn((_path: FgPath) => [] as string[]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const useCollectionItems = vi.fn((path: FgPath, _collectionId: string) => {
    return {
      collectionPath: getCollectionPath(path),
      collectionItems: getCollectionItems(path),
    };
  });

  const verySimpleMockUseTranslation = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = (path: any): string => path;
    const i18n = {
      changeLanguage: () => new Promise(() => {}),
      exists: () => true,
    };

    return { t, i18n };
  };
  return { getCollectionPath, getCollectionItems, useCollectionItems, verySimpleMockUseTranslation };
});

vi.mock(`react-i18next`, () => ({
  useTranslation: mocks.verySimpleMockUseTranslation,
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
  Trans: ({ i18nKey }: { i18nKey: string | string[] }) => mockUseTranslation().t(i18nKey),
}));

vi.mock(`../../../hooks/useCollectionItems`, () => ({
  useCollectionItems: mocks.useCollectionItems,
}));

const ref = createRef<HTMLInputElement>();

const path: FgPath = `/formW2s`;
const collectionPath: FgPath = `/filers`;
const sharedProps: Parameters<typeof CollectionItemReference>[0] = {
  path,
  concretePath: Path.concretePath(path, null),
  isValid: true,
  onValidData: vi.fn(),
  showFeedback: false,
  ref,
  collectionId: null,
  saveAndPersist: vi.fn(),
};

describe(`CollectionItemReference`, () => {
  it(`renders without error`, () => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <CollectionItemReference {...sharedProps} />
        </FactGraphContextProvider>
      </Provider>
    );
  });

  it(`renders the items associated with its path`, () => {
    const mockItems = [`17383b81-24aa-4f3d-9747-a2609c91881f`, `114b1efc-1a2e-440f-98be-b250c5f494a3`];
    mocks.getCollectionItems.mockReturnValue(mockItems);
    mocks.getCollectionPath.mockReturnValue(collectionPath);

    const { getAllByRole } = render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <CollectionItemReference {...sharedProps} />
        </FactGraphContextProvider>
      </Provider>
    );

    const options = getAllByRole(`radio`) as HTMLInputElement[];

    expect(mocks.useCollectionItems).toBeCalledWith(sharedProps.path, sharedProps.collectionId);
    expect(options.map(({ value }) => value)).toEqual(mockItems);
  });

  afterEach(() => vi.restoreAllMocks());
});

import '@testing-library/jest-dom/extend-expect';
import { mockUseTranslation } from '../../../test/mocks/mockFunctions.js';
import { ConcretePath } from '@irs/js-factgraph-scala';
import { createRef } from 'react';
import { Path } from '../../../flow/Path.js';
import { customRender } from '../../../utils/test-utils.js';
import Tin from './Tin.js';
import { vi } from 'vitest';

// This mock allows for testing of any component that is rendered using the
// useTranslation hook from react-i18next.
vi.mock(`react-i18next`, () => ({
  useTranslation: mockUseTranslation,
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

const mocks = vi.hoisted(() => {
  return {
    mockUseFactGraph: vi.fn(),
  };
});

vi.mock(`../../../factgraph/FactGraphContext.tsx`, () => ({ useFactGraph: mocks.mockUseFactGraph }));

const path = `/primaryFiler/tin` as const;
const collectionId = `5e3c5aef-415e-48a2-a999-13bfc90d36bf`;

let validMap = new Map();

const onValid = (path: ConcretePath, validity: boolean) => validMap.set(path, validity);

const ref = createRef<HTMLInputElement>();

const props = {
  path: path,
  concretePath: Path.concretePath(path, collectionId),
  collectionId: collectionId,
  onValidData: onValid,
  isValid: validMap.get(path),
  showFeedback: false,
  saveAndPersist: vi.fn(),
  ref: ref,
};

describe(`Tin`, () => {
  beforeEach(() => {
    validMap = new Map();
    validMap.set(path, false);
    mocks.mockUseFactGraph.mockImplementation(() => ({
      factGraph: {
        get: () => `123`,
        getFact: () => {
          return {
            value: {
              allowAllZeros: false,
            },
          };
        },
      },
    }));
  });

  it(`renders without errors`, () => {
    customRender(<Tin {...props} />);
  });
});

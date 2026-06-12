import { render, screen } from '@testing-library/react';
import { beforeAll } from 'vitest';
import { Provider } from 'react-redux';

import { mockUseTranslation } from '../../test/mocks/mockFunctions.js';
import mockEnYaml from '../../locales/en.yaml';

import SummaryErrorAlert from './SummaryErrorAlert.js';
import { FactGraphContextProvider } from '../../factgraph/FactGraphContext.js';
import { ConcretePath } from '@irs/js-factgraph-scala';
import { MutableRefObject } from 'react';
import { setupStore } from '../../redux/store.js';
import { vi } from 'vitest';

// This mock allows for testing of any component that is rendered using the
// useTranslation hook from react-i18next.
vi.mock(`react-i18next`, () => {
  return {
    Trans: ({ i18nKey }: { i18nKey: string | string[] }) => mockUseTranslation().t(i18nKey),
    useTranslation: mockUseTranslation,
    initReactI18next: {
      type: `3rdParty`,
      init: () => {},
    },
  };
});

const mocks = vi.hoisted(() => {
  return {
    mockUsePrefersReducedMotion: vi.fn(),
  };
});
vi.mock(`../../hooks/usePrefersReducedMotion`, () => ({
  default: mocks.mockUsePrefersReducedMotion,
}));

describe(`Summary Error Alert`, () => {
  it(`test non-enum facts`, async () => {
    const factsInError = [`/phone`, `/address`, `/filers/*/firstName`, `/filers/*/writableMiddleInitial`] as const;
    const factValidity = new Map();
    const factInputRef = new Map();
    factsInError.forEach((fact) => {
      factValidity.set(fact, false);
      factInputRef.set(fact, <input id={`${fact}`}></input>);
    });
    const factRefs = { current: factInputRef };
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <SummaryErrorAlert factValidity={factValidity} factRefs={factRefs} id={`errorSummary`} />
        </FactGraphContextProvider>
      </Provider>
    );
    const errorLinks = screen.getAllByRole(`link`);
    errorLinks.forEach((link, index) => expect(link).toHaveTextContent(mockEnYaml.fields[factsInError[index]].name));
  });

  it(`test enum facts`, async () => {
    const factsInError = [`/primaryFilerSsnEmploymentValidity`];
    const factValidity = new Map();
    const factInputRef = new Map();
    factsInError.forEach((fact) => {
      factValidity.set(fact, false);
      factInputRef.set(fact, <input id={`${fact}`}></input>);
    });
    const factRefs = { current: factInputRef };
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <SummaryErrorAlert factValidity={factValidity} factRefs={factRefs} id={`errorSummary`} />
        </FactGraphContextProvider>
      </Provider>
    );
    const errorLinks = screen.getAllByRole(`link`);
    errorLinks.forEach((link) => expect(link).toHaveTextContent(mockEnYaml.enums.messages.chooseOption));
  });

  describe(`when user prefers reduced motion`, () => {
    beforeAll(() => {
      vi.useFakeTimers();
      mocks.mockUsePrefersReducedMotion.mockImplementation(() => true);
    });

    it(`should instantly scroll without animation`, async () => {
      const factPath = `/primaryFilerSsnEmploymentValidity` as ConcretePath;
      const factValidity = new Map([[factPath, false]]);

      const mockFocus = vi.fn();
      const mockScrollIntoView = vi.fn();
      const factInputRef = {
        current: { focus: mockFocus, scrollIntoView: mockScrollIntoView } as unknown as HTMLElement,
      } as MutableRefObject<HTMLElement>;
      const factRefMap = new Map([[factPath as string, factInputRef]]);
      const factRefs = { current: factRefMap } as MutableRefObject<typeof factRefMap>;

      const { getByRole } = render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <SummaryErrorAlert factValidity={factValidity} factRefs={factRefs} id={`errorSummary`} />
          </FactGraphContextProvider>
        </Provider>
      );

      getByRole(`link`).click();

      vi.runAllTicks();

      expect(mockFocus).toHaveBeenCalledWith({ preventScroll: false });
      expect(mockScrollIntoView).not.toBeCalled();
    });

    afterAll(() => {
      vi.clearAllMocks();
    });
  });

  describe(`when user has not expressed a preference for reduced motion`, () => {
    beforeAll(() => {
      vi.useFakeTimers();
      mocks.mockUsePrefersReducedMotion.mockImplementation(() => false);
    });

    it(`should instantly scroll without animation`, async () => {
      const factPath = `/primaryFilerSsnEmploymentValidity` as ConcretePath;
      const factValidity = new Map([[factPath, false]]);

      const mockFocus = vi.fn();
      const mockScrollIntoView = vi.fn();
      const factInputRef = {
        current: { focus: mockFocus, scrollIntoView: mockScrollIntoView } as unknown as HTMLElement,
      } as MutableRefObject<HTMLElement>;
      const factRefMap = new Map([[factPath as string, factInputRef]]);
      const factRefs = { current: factRefMap } as MutableRefObject<typeof factRefMap>;

      const { getByRole } = render(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <SummaryErrorAlert factValidity={factValidity} factRefs={factRefs} id={`errorSummary`} />
          </FactGraphContextProvider>
        </Provider>
      );

      getByRole(`link`).click();

      vi.runAllTicks();

      expect(mockFocus).toHaveBeenCalledWith({ preventScroll: true });
      expect(mockScrollIntoView).toBeCalled();
    });

    afterAll(() => {
      vi.clearAllMocks();
    });
  });
});

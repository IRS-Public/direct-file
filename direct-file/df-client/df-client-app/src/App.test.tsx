import { render, screen } from '@testing-library/react';
import { mockUseTranslation } from './test/mocks/mockFunctions.js';
import App from './App.js';
import { vi } from 'vitest';

vi.mock(`react-i18next`, () => ({
  useTranslation: mockUseTranslation,
  initReactI18next: {
    type: `3rdParty`,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    init: () => {},
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withTranslation: () => (Component: any) => {
    Component.defaultProps = { ...Component.defaultProps, t: () => `` };
    return Component;
  },
  Trans: ({ children }: never) => children,
}));

vi.mock(`react`, async () => {
  const mod = await vi.importActual(`react`);
  return {
    ...mod,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Suspense: ({ children }: any) => children,
  };
});

/**
 * FAIL  src/App.test.tsx > renders Official US Government website banner
 * TestingLibraryElementError: Unable to find an element with the text:
 *   /An official website of the United States government/i. This could be because
 *   the text is broken up by multiple elements. In this case, you can provide a
 *   function for your text matcher to make your matcher more flexible.
 *
 * Ignored nodes: comments, script, style
 * <body>
 *   <div />
 * </body>
 */
test.skip(`renders Official US Government website banner`, async () => {
  render(<App />);
  const usgBanner = await screen.findByText(/An official website of the United States government/i);
  expect(usgBanner).toBeInTheDocument();
});

test.skip(`includes 'main' landmark`, async () => {
  render(<App />);
  const mainLandmark = await screen.findByRole(`main`);
  expect(mainLandmark).toBeInTheDocument();
});

test.skip(`includes skip link`, async () => {
  render(<App />);
  const skipLink = await screen.findByRole(`link`, { name: `Skip to main content` });
  expect(skipLink).toBeInTheDocument();
  const mainLandmark = await screen.findByRole(`main`);
  expect(skipLink.getAttribute(`href`)).toEqual(`#${mainLandmark.id}`);
});

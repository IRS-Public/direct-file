import { render, waitFor } from '@testing-library/react';

import { mockUseTranslation } from '../../test/mocks/mockFunctions.js';

import Head from './Head.js';
import { NetworkConnectionContext } from '../../context/networkConnectionContext.js';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { vi } from 'vitest';

vi.mock(`react-i18next`, () => ({
  useTranslation: mockUseTranslation,
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
}));

const networkContext = { online: true, prevOnlineStatus: true };

describe(`Title the document correctly`, () => {
  test(`titles document with default`, async () => {
    render(
      <NetworkConnectionContext.Provider value={networkContext}>
        <HelmetProvider>
          <Head />
        </HelmetProvider>
      </NetworkConnectionContext.Provider>
    );
    await waitFor(() => expect(document.title).toBe(`Direct File | Internal Revenue Service`));
  });

  test(`titles document with nested helmet to override title`, async () => {
    const title = `Landing Page`;
    render(
      <NetworkConnectionContext.Provider value={networkContext}>
        <HelmetProvider>
          <Head />
          <Helmet title={title} />
        </HelmetProvider>
      </NetworkConnectionContext.Provider>
    );
    await waitFor(() => expect(document.title).toBe(`${title} | Direct File | Internal Revenue Service`));
  });
});

import { render, screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { Mock } from 'vitest';

import mockEnYaml from '../../locales/en.yaml';
import { mockUseTranslation } from '../../test/mocks/mockFunctions.js';
import { NetworkConnectionContext } from '../../context/networkConnectionContext.js';
import ConnectivityBanner from './index.js';
import { NetworkStatus } from '../../hooks/useNetworkConnectionStatus.js';
import { vi } from 'vitest';

vi.mock(`react-i18next`, () => ({
  useTranslation: mockUseTranslation,
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
  Trans: ({ children }: never) => children,
}));

vi.mock(`react-router-dom`);

describe(`ConnectivityBanner`, () => {
  describe(`on an inaccessible page`, () => {
    beforeAll(() => {
      (useLocation as Mock).mockReturnValue({
        pathname: `/home`,
      });
    });

    afterAll(() => {
      vi.clearAllMocks();
    });

    test(`renders non-accessible page message and className when connectivity is lost`, () => {
      const networkStatus: NetworkStatus = { online: false, prevOnlineStatus: true };
      render(
        <NetworkConnectionContext.Provider value={networkStatus}>
          <ConnectivityBanner />
        </NetworkConnectionContext.Provider>
      );

      expect(screen.getByText(mockEnYaml.banner.connectivity.offline.not_accessible)).toBeInTheDocument();
      expect(screen.getByRole(`alert`)).toHaveClass(`usa-alert--warning`);
    });

    test(`renders non-accessible page message and className when connectivity regained`, () => {
      const networkStatus: NetworkStatus = { online: true, prevOnlineStatus: false };
      render(
        <NetworkConnectionContext.Provider value={networkStatus}>
          <ConnectivityBanner />
        </NetworkConnectionContext.Provider>
      );

      expect(screen.getByText(mockEnYaml.banner.connectivity.online.not_accessible)).toBeInTheDocument();
      expect(screen.getByRole(`alert`)).toHaveClass(`usa-alert--info`);
    });
  });
});

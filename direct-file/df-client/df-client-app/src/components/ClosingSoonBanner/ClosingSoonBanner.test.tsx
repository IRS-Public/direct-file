import { render, screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { Mock } from 'vitest';

import mockEnYaml from '../../locales/en.yaml';
import { mockUseTranslation } from '../../test/mocks/mockFunctions.js';
import ClosingSoonBanner from './index.js';
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

describe(`ClosingSoonBanner`, () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test(`renders on home`, () => {
    (useLocation as Mock).mockReturnValue({ pathname: `/home` });
    render(<ClosingSoonBanner />);

    expect(screen.getByText(mockEnYaml.banner.closingSoon.header)).toBeInTheDocument();
    expect(screen.getByRole(`alert`)).toHaveClass(`usa-alert--warning`);
  });

  test(`renders on checklist`, () => {
    (useLocation as Mock).mockReturnValue({ pathname: `/checklist` });
    render(<ClosingSoonBanner />);

    expect(screen.getByText(mockEnYaml.banner.closingSoon.header)).toBeInTheDocument();
    expect(screen.getByRole(`alert`)).toHaveClass(`usa-alert--warning`);
  });
});

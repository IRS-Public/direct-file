import { Provider } from 'react-redux';
import { mockUseTranslation } from '../../test/mocks/mockFunctions.js';
import { FactGraphContextProvider } from '../../factgraph/FactGraphContext.js';
import { setupStore } from '../../redux/store.js';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

import IconList from './IconList.js';

// This mock allows for testing of any component that is rendered using the
// useTranslation hook from react-i18next.
vi.mock(`react-i18next`, () => ({
  useTranslation: mockUseTranslation,
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
  Trans: ({ i18nKey }: { i18nKey: string }) => mockUseTranslation().t(i18nKey),
}));

describe(`IconList component`, () => {
  test(`renders without errors`, () => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <BrowserRouter>
            <IconList
              collectionId='foo'
              i18nKey={`/iconList/your-taxes/payment-method/refund-outro/direct-deposit`}
              gotoNextScreen={vi.fn()}
            />
          </BrowserRouter>
        </FactGraphContextProvider>
      </Provider>
    );
    const list = screen.getByRole(`list`);
    const listItem = screen.getAllByRole(`listitem`)[0];
    const svg = screen.getAllByRole(`presentation`)[0];
    expect(list).toBeInTheDocument();
    expect(list).toHaveClass(`usa-icon-list`);
    expect(listItem).toBeInTheDocument();
    expect(listItem).toHaveClass(`usa-icon-list__item`);
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass(`usa-icon`);
  });
  test(`will not render if no icon list key found`, () => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <BrowserRouter>
            <IconList collectionId='foo' i18nKey={`bar`} gotoNextScreen={vi.fn()} />
          </BrowserRouter>
        </FactGraphContextProvider>
      </Provider>
    );
    const list = screen.queryByRole(`list`);
    const listItem = screen.queryAllByRole(`listitem`);
    const svg = screen.queryAllByRole(`presentation`);
    expect(list).toBe(null);
    expect(listItem.length).toBe(0);
    expect(svg.length).toBe(0);
  });
});

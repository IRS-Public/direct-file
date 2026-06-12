import { render, screen } from '@testing-library/react';
import { mockUseTranslation } from '../test/mocks/mockFunctions.js';
import ErrorBoundary from './errorBoundary.js';
import { Provider } from 'react-redux';
import { store } from '../redux/store.js';
import { isTelemetryEnabled } from '../constants/pageConstants.js';
import { Mock, vi } from 'vitest';

vi.useFakeTimers();

vi.mock(`../constants/pageConstants.js`, () => ({
  isTelemetryEnabled: vi.fn(), // Mock the function
}));

vi.mock(`../constants/pageConstants.js`, async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    isTelemetryEnabled: vi.fn(), // Mock the function
  };
});

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

const ErrorThrowingComponent = () => {
  throw new Error(`An error has been thrown`);
};

describe(`Error boundary component`, () => {
  (isTelemetryEnabled as Mock).mockReturnValue(true);

  test(`renders and and sets alert element`, () => {
    render(
      <Provider store={store}>
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      </Provider>
    );
    expect(screen.getByTestId(`alert`)).toBeVisible();
  });
});

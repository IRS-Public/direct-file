import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

import mockEnYaml from '../../locales/en.yaml';
import { sessionStorageMock, mockUseTranslation } from '../../test/mocks/mockFunctions.js';
import { authKeys } from '../../auth/constants.js';
import { vi } from 'vitest';

import Header from './Header.js';

vi.mock(`react-i18next`, () => ({
  useTranslation: mockUseTranslation,
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
  Trans: () => {},
}));

Object.defineProperty(window, `sessionStorage`, {
  value: sessionStorageMock,
});

describe(`Header component`, () => {
  test(`clicking on account circle navigates to account page`, () => {
    // Simulate logged in user by setting session storage
    authKeys.forEach((key) => {
      sessionStorage.setItem(key, `testValue`);
    });

    render(
      <BrowserRouter>
        <Header switchLang={() => {}} autoSpanishModal={false} />
      </BrowserRouter>
    );

    // Click on account circle
    userEvent.click(screen.getByRole(`link`, { name: `${mockEnYaml.account.title}` }));

    // Expect to navigate to /account/
    // Todo: Figure out why window object is not available
    // expect(window.location).toBe("/account/");
  });

  test(`account circle icon is not displayed when user is not logged in`, () => {
    // Simulate logged out user by clearing session storage
    sessionStorage.clear();
    render(
      <BrowserRouter>
        <Header switchLang={() => {}} autoSpanishModal={false} />
      </BrowserRouter>
    );

    expect(screen.queryByLabelText(/My account/i)).not.toBeInTheDocument();
  });

  test(`opens and closes the mobile menu`, async () => {
    const user = userEvent.setup();
    // Simulate logged in user by setting session storage
    authKeys.forEach((key) => {
      sessionStorage.setItem(key, `testValue`);
    });

    render(
      <BrowserRouter>
        <Header switchLang={() => {}} autoSpanishModal={false} />
      </BrowserRouter>
    );

    const menuButton = screen.getByRole(`button`, { name: `Menu` });

    await user.click(menuButton);
    expect(screen.getByRole(`navigation`)).toHaveAttribute(`class`, expect.stringContaining(`is-visible`));

    await user.click(screen.getByRole(`button`, { name: `Close Navigation Menu` }));
    expect(screen.getByRole(`navigation`)).not.toHaveAttribute(`class`, expect.stringContaining(`is-visible`));
  });
});

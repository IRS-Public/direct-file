import ErrorScreen, { ErrorScreenProps } from './ErrorScreen.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SystemAlertContextProvider } from '../../../context/SystemAlertContext/SystemAlertContext.js';
import { store } from '../../../redux/store.js';
import { Provider } from 'react-redux';
import { wrapComponent } from '../../../test/helpers.js';
import { vi } from 'vitest';

const handleGoBack = vi.fn();
const errorMessage = `Details about an error!`;
const defaultProps: ErrorScreenProps = {
  errorMessage,
  handleGoBack,
};

describe(`AuthorizeStateScreen.ErrorScreen`, () => {
  beforeEach(() => {
    handleGoBack.mockClear();
  });

  const renderErrorScreen = (props: ErrorScreenProps) => {
    render(
      wrapComponent(
        <Provider store={store}>
          <SystemAlertContextProvider>
            <ErrorScreen {...props} />
          </SystemAlertContextProvider>
        </Provider>
      )
    );

    const alert = screen.getByRole(`alert`);
    const backButton = screen.getByRole(`button`);

    return { alert, backButton };
  };

  it(`Renders without error`, () => {
    const { alert, backButton } = renderErrorScreen(defaultProps);

    expect(alert).toHaveTextContent(errorMessage);
    expect(backButton).toBeInTheDocument();
  });

  it(`Renders children, if passed in`, () => {
    renderErrorScreen({ ...defaultProps, children: <div role='group'>content</div> });

    const childContent = screen.queryByRole(`group`);

    expect(childContent).toBeInTheDocument();
    expect(childContent).toHaveTextContent(`content`);
  });

  it(`Calls callback on back button click`, async () => {
    const user = userEvent.setup();

    const { backButton } = renderErrorScreen(defaultProps);

    expect(handleGoBack).toHaveBeenCalledTimes(0);

    await user.click(backButton);

    expect(handleGoBack).toHaveBeenCalledTimes(1);
  });
});

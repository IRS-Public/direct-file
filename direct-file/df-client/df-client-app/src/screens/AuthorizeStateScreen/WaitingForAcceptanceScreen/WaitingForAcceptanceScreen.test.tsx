import WaitingForAcceptanceScreen, {
  STATUS_FETCH_LOCKOUT_SECONDS,
  WaitingForAcceptanceScreenProps,
} from './WaitingForAcceptanceScreen.js';
import { render, screen, within } from '@testing-library/react';
import { CURRENT_TAX_YEAR, FEDERAL_RETURN_STATUS } from '../../../constants/taxConstants.js';
import { userEvent } from '@testing-library/user-event';
import { wrapComponent } from '../../../test/helpers.js';
import {
  SubmissionStatusContext,
  SubmissionStatusContextType,
} from '../../../context/SubmissionStatusContext/SubmissionStatusContext.js';
import { TaxReturnSubmissionStatus } from '../../../types/core.js';
import { Provider } from 'react-redux';
import { store } from '../../../redux/store.js';
import { getEmptySystemAlertsMap, SystemAlertContext } from '../../../context/SystemAlertContext/SystemAlertContext.js';
import { vi } from 'vitest';

const NOW = new Date();
const BEFORE_LOCKOUT = new Date(new Date().setSeconds(NOW.getSeconds() - (STATUS_FETCH_LOCKOUT_SECONDS + 1)));

const defaultSubmissionStatus: TaxReturnSubmissionStatus = {
  status: FEDERAL_RETURN_STATUS.PENDING,
  createdAt: new Date().toISOString(),
  rejectionCodes: [],
};
const mockSetSubmissionStatus = vi.fn();
const mockFetchSubmissionStatus = vi.fn();

const defaultProps: WaitingForAcceptanceScreenProps = {
  taxYear: parseInt(CURRENT_TAX_YEAR),
  taxReturnStatus: defaultSubmissionStatus.status,
  stateCode: `GA`,
  stateTaxSystemName: `Peach State Tax Tool`,
  goBackUrl: new URL(`https://taxes.ga.gov/file/`),
  taxReturnId: `test-id`,
};

const defaultSubmissionStatusContext: SubmissionStatusContextType = {
  submissionStatus: defaultSubmissionStatus,
  setSubmissionStatus: mockSetSubmissionStatus,
  fetchSubmissionStatus: mockFetchSubmissionStatus,
  isFetching: false,
  fetchSuccess: false,
  fetchError: false,
  lastFetchAttempt: BEFORE_LOCKOUT,
};

describe(WaitingForAcceptanceScreen.name, () => {
  const renderWaitingForAcceptanceScreen = (
    props: WaitingForAcceptanceScreenProps,
    submissionStatusContextOverrides: Partial<SubmissionStatusContextType> = {}
  ) => {
    render(
      wrapComponent(
        <Provider store={store}>
          <SystemAlertContext.Provider
            value={{
              systemAlerts: getEmptySystemAlertsMap(),
              setSystemAlert: vi.fn(),
              deleteSystemAlert: vi.fn(),
            }}
          >
            <SubmissionStatusContext.Provider
              value={{ ...defaultSubmissionStatusContext, ...submissionStatusContextOverrides }}
            >
              <WaitingForAcceptanceScreen {...props} />
            </SubmissionStatusContext.Provider>
          </SystemAlertContext.Provider>
        </Provider>
      )
    );

    const heading = screen.getByRole(`heading`, { name: `heading`, level: 1 });
    const infoAlert = screen.getByTestId(`status-info-alert`);
    const infoAlertHeading = within(infoAlert).getByRole(`heading`);
    const statusInfoButton = screen.getByRole(`button`, { name: `modalOpenButtonText` });
    const statusInfoModal = screen.getByRole(`dialog`);
    const goBackLink = screen.getByRole(`link`, { name: `goBack` });

    const queryForStatusFetchLockoutMessage = () => screen.queryByTestId(`status-fetch-lockout-alert`);
    const queryForStatusFetchButton = () => screen.queryByRole(`button`, { name: `checkStatusButtonText` });

    return {
      heading,
      infoAlert,
      infoAlertHeading,
      statusInfoButton,
      statusInfoModal,
      goBackLink,
      queryForStatusFetchLockoutMessage,
      queryForStatusFetchButton,
    };
  };

  it(`Renders without error`, () => {
    const {
      heading,
      infoAlert,
      infoAlertHeading,
      statusInfoButton,
      statusInfoModal,
      goBackLink,
      queryForStatusFetchLockoutMessage,
      queryForStatusFetchButton,
    } = renderWaitingForAcceptanceScreen(defaultProps);

    const statusFetchLockoutMessage = queryForStatusFetchLockoutMessage();
    const statusFetchButton = queryForStatusFetchButton();

    expect(heading).toBeInTheDocument();
    expect(infoAlert).toBeInTheDocument();
    expect(infoAlertHeading).toHaveTextContent(defaultProps.taxReturnStatus);
    expect(statusInfoButton).toHaveProperty(`type`, `button`);
    expect(statusInfoModal).toHaveClass(`is-hidden`);
    expect(statusFetchLockoutMessage).not.toBeInTheDocument();
    expect(statusFetchButton).toBeInTheDocument();
    expect(goBackLink).toBeInTheDocument();
  });

  // TODO: happy-dom not compatible with modal focus-trap
  it.skip(`User can open status info modal`, async () => {
    const user = userEvent.setup();

    const { statusInfoButton, statusInfoModal } = renderWaitingForAcceptanceScreen(defaultProps);

    expect(statusInfoModal).toHaveClass(`is-hidden`);

    await user.click(statusInfoButton);

    expect(statusInfoModal).toHaveClass(`is-visible`);
  });

  it(`Shows the user a lockout alert when they must wait before re-fetching their submission status`, async () => {
    const user = userEvent.setup();
    const { queryForStatusFetchLockoutMessage, queryForStatusFetchButton } = renderWaitingForAcceptanceScreen(
      defaultProps,
      { lastFetchAttempt: NOW }
    );

    let statusFetchLockoutMessage = queryForStatusFetchLockoutMessage();
    let statusFetchButton = queryForStatusFetchButton();

    expect(statusFetchLockoutMessage).not.toBeInTheDocument();
    expect(statusFetchButton).toBeInTheDocument();

    // clicking the button should trigger lockout message display
    // (we've already verified the button is in the document above, hence the type assertion)
    await user.click(statusFetchButton as HTMLElement);

    statusFetchLockoutMessage = queryForStatusFetchLockoutMessage();
    statusFetchButton = queryForStatusFetchButton();

    expect(statusFetchLockoutMessage).toBeInTheDocument();
    expect(statusFetchButton).not.toBeInTheDocument();
  });
});

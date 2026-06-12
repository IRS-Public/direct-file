import TransferReturnScreen, { TransferReturnScreenProps } from './TransferReturnScreen.js';
import { CURRENT_TAX_YEAR, FEDERAL_RETURN_STATUS } from '../../../constants/taxConstants.js';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { v4 as uuidv4 } from 'uuid';
import { wrapComponent } from '../../../test/helpers.js';
import { InterceptingFactGraph } from '../../../factgraph/InterceptingFactGraph.js';
import { SystemAlertConfigs, SystemAlertContext } from '../../../context/SystemAlertContext/SystemAlertContext.js';
import { initI18n } from '../../../i18n.js';
import { StateApiErrorCode } from '../../../constants/stateApiConstants.js';
import { vi } from 'vitest';

const { mockUseFactGraph } = vi.hoisted(() => ({
  mockUseFactGraph: vi.fn(() => ({
    factGraph: new InterceptingFactGraph(),
  })),
}));
vi.mock(`../../../factgraph/FactGraphContext`, () => ({
  useFactGraph: mockUseFactGraph,
}));

const mockHandleSubmit = vi.fn();

const defaultProps: TransferReturnScreenProps = {
  taxYear: parseInt(CURRENT_TAX_YEAR),
  taxReturnStatus: FEDERAL_RETURN_STATUS.ACCEPTED,
  taxReturnUuid: uuidv4(),
  stateCode: `GA`,
  stateTaxSystemName: `Peach State Tax Tool`,
  handleSubmit: mockHandleSubmit,
  goBackUrl: new URL(`https://taxes.ga.gov/file/`),
  isSubmittingTransfer: false,
};

describe(`TransferReturnScreen`, () => {
  const renderTransferReturnScreen = (props: TransferReturnScreenProps, systemAlerts: SystemAlertConfigs = {}) => {
    render(
      wrapComponent(
        <SystemAlertContext.Provider
          value={{ systemAlerts: systemAlerts, setSystemAlert: vi.fn(), deleteSystemAlert: vi.fn() }}
        >
          <TransferReturnScreen {...props} />
        </SystemAlertContext.Provider>
      )
    );

    const heading = screen.getByRole(`heading`, {
      name: `Your ${props.taxYear} federal tax return is ready to transfer to Georgia.`,
      level: 1,
    });
    const infoAlert = screen.getByTestId(`status-info-alert`);
    const infoAlertHeading = within(infoAlert).getByRole(`heading`);
    const attestation = screen.getByText((string) =>
      string.startsWith(`By clicking this button, I agree to transfer my federal tax return data to`)
    );
    const transferInfoButton = screen.getByRole(`button`, {
      name: `What data will I transfer?`,
    });
    const transferInfoModal = screen.getByRole(`dialog`);
    const authorizeTransferButton = screen.getByRole(`button`, {
      name: `Transfer my ${props.taxYear} federal tax return to ${props.stateTaxSystemName}`,
    });
    const goBackLink = screen.getByRole(`link`, { name: `Exit and return to ${props.stateTaxSystemName}` });

    const queryForSystemAlert = () => screen.queryByTestId(`system-alert`);

    return {
      heading,
      infoAlert,
      infoAlertHeading,
      attestation,
      transferInfoButton,
      transferInfoModal,
      authorizeTransferButton,
      goBackLink,
      queryForSystemAlert,
    };
  };

  beforeAll(async () => {
    await initI18n();
  });

  beforeEach(() => {
    mockHandleSubmit.mockClear();
  });

  it(`Renders without error`, () => {
    const {
      heading,
      infoAlert,
      infoAlertHeading,
      attestation,
      transferInfoButton,
      transferInfoModal,
      authorizeTransferButton,
      goBackLink,
      queryForSystemAlert,
    } = renderTransferReturnScreen(defaultProps);

    const systemAlert = queryForSystemAlert();

    expect(heading).toBeInTheDocument();
    expect(infoAlert).toBeInTheDocument();
    expect(infoAlertHeading).toHaveTextContent(defaultProps.taxReturnStatus);
    expect(attestation).toBeInTheDocument();
    expect(transferInfoButton).toHaveProperty(`type`, `button`);
    expect(transferInfoModal).toHaveClass(`is-hidden`); // https://github.com/testing-library/jest-dom/issues/209
    expect(authorizeTransferButton).toHaveProperty(`type`, `submit`);
    expect(goBackLink).toBeInTheDocument();
    expect(systemAlert).not.toBeInTheDocument();
  });

  // TODO: happy-dom not compatible with modal focus-trap
  it.skip(`User can open transfer info modal`, async () => {
    const user = userEvent.setup();

    const { transferInfoButton, transferInfoModal } = renderTransferReturnScreen(defaultProps);

    expect(transferInfoModal).toHaveClass(`is-hidden`);

    await user.click(transferInfoButton);

    expect(transferInfoModal).toHaveClass(`is-visible`);
  });

  it(`Renders when taxReturnStatus is ${FEDERAL_RETURN_STATUS.PENDING}`, () => {
    const {
      heading,
      infoAlert,
      infoAlertHeading,
      attestation,
      transferInfoButton,
      transferInfoModal,
      authorizeTransferButton,
      goBackLink,
    } = renderTransferReturnScreen(defaultProps);

    expect(heading).toBeInTheDocument();
    expect(infoAlert).toBeInTheDocument();
    expect(infoAlertHeading).toHaveTextContent(defaultProps.taxReturnStatus);
    expect(attestation).toBeInTheDocument();
    expect(transferInfoButton).toHaveProperty(`type`, `button`);
    expect(transferInfoModal).toHaveClass(`is-hidden`); // https://github.com/testing-library/jest-dom/issues/209
    expect(authorizeTransferButton).toHaveProperty(`type`, `submit`);
    expect(goBackLink).toBeInTheDocument();
  });

  it(`Runs an authorize handler when the user clicks the authorize button`, async () => {
    const user = userEvent.setup();

    const { authorizeTransferButton } = renderTransferReturnScreen(defaultProps);

    await user.click(authorizeTransferButton);

    expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
  });

  it(`Shows a system alert`, async () => {
    const errorCode = StateApiErrorCode.E_TAX_RETURN_NOT_ACCEPTED_OR_PENDING;
    const errorMessage = `An error occurred authorizing transfer. Please try again in five minutes. (${errorCode})`;

    const systemAlerts: SystemAlertConfigs = {
      CREATE_AUTHORIZATION_CODE: {
        alertConfig: {
          type: `error`,
          i18nKey: `systemAlerts.stateTransfer.unableToGenerateAuthorizationCode`,
          context: {
            errorCode,
          },
        },
        shouldClearOnRouteChange: true,
        timestamp: Date.now(),
      },
    };

    const { queryForSystemAlert } = renderTransferReturnScreen(defaultProps, systemAlerts);

    const errorAlert = queryForSystemAlert();

    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent(errorMessage);
    expect(errorAlert).toHaveClass(`usa-alert--error`);
  });

  it(`Disables the transfer button while a transfer is in progress`, async () => {
    const { authorizeTransferButton } = renderTransferReturnScreen({
      ...defaultProps,
      isSubmittingTransfer: true,
    });

    expect(authorizeTransferButton).toBeDisabled();
  });
});

import ReturnRejectedScreen, { RejectedReturnScreenProps } from './ReturnRejectedScreen.js';
import { render, screen, within } from '@testing-library/react';
import { CURRENT_TAX_YEAR, FEDERAL_RETURN_STATUS } from '../../../constants/taxConstants.js';
import { userEvent } from '@testing-library/user-event';
import { wrapComponent } from '../../../test/helpers.js';
import { vi } from 'vitest';

const mockHandleGoBack = vi.fn();

const defaultProps: RejectedReturnScreenProps = {
  taxYear: parseInt(CURRENT_TAX_YEAR),
  taxReturnStatus: FEDERAL_RETURN_STATUS.REJECTED,
  stateCode: `GA`,
  stateTaxSystemName: `Peach State Tax Tool`,
  federalReturnMustBeAccepted: true,
  handleGoBack: mockHandleGoBack,
};
describe(`ReturnRejectedScreen`, () => {
  const renderReturnRejectedScreen = (props: RejectedReturnScreenProps) => {
    render(wrapComponent(<ReturnRejectedScreen {...props} />));

    const heading = screen.getByRole(`heading`, { name: `heading`, level: 1 });
    const infoAlert = screen.getByRole(`alert`);
    const infoAlertHeading = within(infoAlert).getByRole(`heading`);
    // const infoAlertContent = within(infoAlert).getByRole('paragraph'); TODO: mock i18n so that this can render

    const goBackLink = screen.getByRole(`button`, { name: `goBack` });

    return { heading, infoAlert, infoAlertHeading, goBackLink };
  };

  it(`Renders without error`, () => {
    const { heading, infoAlert, infoAlertHeading, goBackLink } = renderReturnRejectedScreen(defaultProps);

    expect(heading).toBeInTheDocument();
    expect(infoAlert).toBeInTheDocument();
    expect(infoAlertHeading).toBeInTheDocument();
    expect(infoAlertHeading).toHaveTextContent(defaultProps.taxReturnStatus);
    // TODO: verify info alert content
    expect(goBackLink).toBeInTheDocument();
  });

  it(`Renders when federalReturnMustBeAccepted is false`, () => {
    const renderProps = { ...defaultProps, federalReturnMustBeAccepted: false };

    const { heading, infoAlert, infoAlertHeading, goBackLink } = renderReturnRejectedScreen(renderProps);

    expect(heading).toBeInTheDocument();
    expect(infoAlert).toBeInTheDocument();
    expect(infoAlertHeading).toBeInTheDocument();
    expect(infoAlertHeading).toHaveTextContent(defaultProps.taxReturnStatus);
    // TODO: verify info alert content when federalReturnMustBeAccepted is false
    expect(goBackLink).toBeInTheDocument();
  });

  it(`Calls calback when clicking back button`, async () => {
    const user = userEvent.setup();

    const { goBackLink } = renderReturnRejectedScreen(defaultProps);

    await user.click(goBackLink);

    expect(mockHandleGoBack).toHaveBeenCalledTimes(1);
  });
});

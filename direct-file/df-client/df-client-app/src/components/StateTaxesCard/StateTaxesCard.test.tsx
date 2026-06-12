import { render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import StateTaxesCard, { StateTaxesCardProps } from './StateTaxesCard.js';
import { CURRENT_TAX_YEAR } from '../../constants/taxConstants.js';
import { StateProfile } from '../../types/StateProfile.js';
import { ENVIRONMENT_CONFIGS } from '../../constants/pageConstants.js';
import { FactGraphContextProvider } from '../../factgraph/FactGraphContext.js';
import { TaxReturnsContext } from '../../context/TaxReturnsContext.js';
import { wrapComponent } from '../../test/helpers.js';
import { setupStore } from '../../redux/store.js';
import { vi } from 'vitest';

const { t } = vi.hoisted(() => {
  return {
    t: vi.fn((key: string) => key),
  };
});
vi.mock(`react-i18next`, () => ({
  useTranslation: () => {
    return {
      t: t,
      i18n: {
        language: `en`,
        exists: vi.fn(),
      },
    };
  },
  initReactI18next: {
    type: `3rdParty`,
  },
  Trans: ({ i18nKey }: { i18nKey: string }) => t(i18nKey),
}));

describe(`StateTaxesCard`, () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`2024-02-15`));
  });
  afterAll(() => {
    // restoring date after each test run
    vi.useRealTimers();
  });

  const renderStateTaxesCard = (props: StateTaxesCardProps) => {
    render(
      wrapComponent(
        <Provider store={setupStore()}>
          <FactGraphContextProvider>
            <TaxReturnsContext.Provider
              value={{
                taxReturns: [],
                currentTaxReturnId: `foo`,
                fetchTaxReturns: vi.fn(),
                isFetching: false,
                fetchSuccess: true,
              }}
            >
              <StateTaxesCard {...props} />
            </TaxReturnsContext.Provider>
          </FactGraphContextProvider>
        </Provider>
      )
    );

    const stateTaxesCard = screen.getByTestId(`state-taxes-card`);
    const stateTaxesCardScope = within(stateTaxesCard);

    const headings = stateTaxesCardScope.getAllByRole(`heading`, { level: 2 });

    const stateTaxesCardHeading = headings[0];
    const stateTaxesCardBody = stateTaxesCardScope.getByTestId(`state-taxes-card-body`);
    const stateTaxesButton = stateTaxesCardScope.queryByRole(`button`);
    const stateTaxesLink = stateTaxesCardScope.queryByRole(`link`);
    const alert = stateTaxesCardScope.queryByTestId(`state-taxes-card-alert`);

    return { stateTaxesCardHeading, stateTaxesCardBody, stateTaxesButton, stateTaxesLink, alert };
  };

  describe(`State income taxes`, () => {
    const defaultProps: StateTaxesCardProps = {
      id: `state-taxes`,
      taxYear: parseInt(CURRENT_TAX_YEAR),
      stateProfile: {
        stateCode: `DC`,
        taxSystemName: `A fake state tax system`,
        landingUrl: `https://www.irs.gov/`,
      } as StateProfile,
      stateCanTransferData: true,
      returnWasRejected: false,
    };

    it(`renders correctly when transfer is enabled`, () => {
      const { stateTaxesCardHeading, stateTaxesCardBody, stateTaxesButton, stateTaxesLink, alert } =
        renderStateTaxesCard(defaultProps);

      expect(stateTaxesCardHeading).toHaveTextContent(`stateTaxesCard.heading`);
      expect(stateTaxesCardBody).toHaveTextContent(`stateTaxesCard.genericBody`);
      expect(stateTaxesLink).toHaveTextContent(`stateTaxesCard.startYourStateTaxesButtonText`);
      expect(stateTaxesButton).toBeNull();
      expect(stateTaxesLink).toHaveProperty(`href`, `${defaultProps.stateProfile.landingUrl}?ref_location=df_home`);

      expect(alert).toBeTruthy();
    });
  });

  describe(`Washington`, () => {
    const defaultProps: StateTaxesCardProps = {
      id: `state-taxes`,
      taxYear: parseInt(CURRENT_TAX_YEAR),
      stateProfile: {
        stateCode: `WA`,
        taxSystemName: `A fake state tax system`,
        landingUrl: `https://www.irs.gov/`,
      } as StateProfile,
      stateCanTransferData: false,
      returnWasRejected: false,
    };

    it(`should render correct text content, no alert banner, no button to file state taxes in DF, 
      and a link to washington's tax platform`, () => {
      const { stateTaxesCardHeading, stateTaxesCardBody, stateTaxesButton, stateTaxesLink, alert } =
        renderStateTaxesCard(defaultProps);

      expect(stateTaxesCardHeading).toHaveTextContent(`stateTaxesCard.heading`);
      expect(stateTaxesCardBody).toHaveTextContent(`stateTaxesCard.washingtonBody`);
      expect(stateTaxesButton).toBeNull();

      expect(stateTaxesLink).not.toBeNull();
      expect(stateTaxesLink).toHaveTextContent(`stateTaxesCard.washingtonButtonText`);
      expect(stateTaxesLink).toHaveProperty(`href`, `${defaultProps.stateProfile.landingUrl}?ref_location=df_home`);

      expect(alert).toBeNull();
    });
  });

  describe(`Rejected Return`, () => {
    const defaultProps: StateTaxesCardProps = {
      id: `state-taxes`,
      taxYear: parseInt(CURRENT_TAX_YEAR),
      stateProfile: {
        stateCode: `MA`,
        taxSystemName: `A fake state tax system`,
        landingUrl: `https://www.irs.gov/`,
      } as StateProfile,
      stateCanTransferData: false,
      returnWasRejected: true,
    };

    it(`should render correct text content, no alert banner, and a toggle modal button`, () => {
      const { stateTaxesCardHeading, stateTaxesCardBody, stateTaxesButton, stateTaxesLink, alert } =
        renderStateTaxesCard(defaultProps);

      expect(stateTaxesCardHeading).toHaveTextContent(`stateTaxesCard.heading`);
      expect(stateTaxesCardBody).toHaveTextContent(`stateTaxesCard.rejectedGenericBody`);
      expect(stateTaxesButton).toHaveTextContent(`stateTaxesCard.modalButtonText`);

      expect(stateTaxesLink).toBeNull();
      expect(alert).toBeNull();
    });
  });
});

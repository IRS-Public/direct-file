import { render, screen, waitFor } from '@testing-library/react';
import { PriorYearTaxReturnCard } from './PriorYearTaxReturnCard.js';
import { TaxReturn, TaxReturnSubmission, TaxReturnSubmissionStatus } from '../../types/core.js';
import { CURRENT_TAX_YEAR, FEDERAL_RETURN_STATUS } from '../../constants/taxConstants.js';
import { store } from '../../redux/store.js';
import { Provider } from 'react-redux';
import { TaxReturnsContext } from '../../context/TaxReturnsContext.js';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentTaxYearReturn } from '../../utils/taxReturnUtils.js';
import { vi } from 'vitest';

const currentTaxYear = parseInt(CURRENT_TAX_YEAR);
const previousTaxYear = Number.parseInt(CURRENT_TAX_YEAR) - 1;
const currentYearTaxReturn: TaxReturn = {
  id: uuidv4(),
  createdAt: new Date().toISOString(),
  taxYear: currentTaxYear,
  facts: {},
  taxReturnSubmissions: [],
  isEditable: true,
  surveyOptIn: null,
};
const taxReturnSubmission: TaxReturnSubmission = {
  id: `submissionId`,
  submitUserId: `submitUserId`,
  createdAt: new Date().toISOString(),
  receiptId: `receiptId`,
  submissionReceivedAt: new Date().toISOString(),
};
const previousYearTaxReturn: TaxReturn = {
  id: uuidv4(),
  createdAt: new Date().toISOString(),
  taxYear: previousTaxYear,
  facts: {},
  taxReturnSubmissions: [taxReturnSubmission],
  isEditable: false,
  surveyOptIn: null,
};
const oldTaxReturn: TaxReturn = {
  id: uuidv4(),
  createdAt: new Date().toISOString(),
  taxYear: previousTaxYear - 1,
  facts: {},
  taxReturnSubmissions: [taxReturnSubmission],
  isEditable: false,
  surveyOptIn: null,
};

const previousYearTaxReturnWithoutSubmission: TaxReturn = {
  id: uuidv4(),
  createdAt: new Date().toISOString(),
  taxYear: previousTaxYear,
  facts: {},
  taxReturnSubmissions: [],
  isEditable: false,
  surveyOptIn: null,
};

const mockReturns = [currentYearTaxReturn, previousYearTaxReturn];
const mockStatus: TaxReturnSubmissionStatus = {
  status: FEDERAL_RETURN_STATUS.ACCEPTED,
  createdAt: new Date().toISOString(),
  rejectionCodes: [],
};

const { mockRead } = vi.hoisted(() => ({
  mockRead: vi.fn(),
}));

vi.mock(`../../hooks/useApiHook.js`, async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    read: mockRead,
  };
});

const renderPriorYearTaxReturnCard = (taxReturns: TaxReturn[]) => {
  const currentTaxReturn = getCurrentTaxYearReturn(taxReturns);

  return render(
    <Provider store={store}>
      <TaxReturnsContext.Provider
        value={{
          taxReturns: taxReturns,
          currentTaxReturnId: currentTaxReturn?.id || null,
          fetchTaxReturns: () => {},
          isFetching: false,
          fetchSuccess: true,
        }}
      >
        <PriorYearTaxReturnCard />
      </TaxReturnsContext.Provider>
    </Provider>
  );
};

describe(PriorYearTaxReturnCard.name, () => {
  beforeEach(() => {
    mockRead.mockRestore();
  });

  it(`renders the card`, async () => {
    mockRead.mockResolvedValue(mockStatus);

    renderPriorYearTaxReturnCard(mockReturns);

    await waitFor(() => {
      expect(screen.getByTestId(`pastYearTaxReturnCard`)).toBeInTheDocument();
      expect(screen.getByRole(`button`)).toBeInTheDocument();
    });
  });

  it(`calls the /status endpoint for the previous year tax return, if it was submitted`, async () => {
    mockRead.mockResolvedValue(mockStatus);

    renderPriorYearTaxReturnCard(mockReturns);

    await waitFor(() => {
      expect(screen.getByTestId(`pastYearTaxReturnCard`)).toBeInTheDocument();
      expect(screen.getByRole(`button`)).toBeInTheDocument();
    });
    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(mockRead).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`v1/taxreturns/${previousYearTaxReturn.id}/status`))
    );
  });

  it(`does not call the /status endpoint or render the card for the previous year tax return, if not submitted`, () => {
    renderPriorYearTaxReturnCard([currentYearTaxReturn, previousYearTaxReturnWithoutSubmission]);

    expect(mockRead).not.toHaveBeenCalled();
    expect(screen.queryByTestId(`pastYearTaxReturnCard`)).not.toBeInTheDocument();
  });

  describe(`when the /status call fails`, () => {
    it(`does not display a card`, async () => {
      mockRead.mockRejectedValue(new Error(`test error`));

      renderPriorYearTaxReturnCard(mockReturns);

      expect(screen.queryByTestId(`pastYearTaxReturnCard`)).not.toBeInTheDocument();
    });
  });

  describe(`when the /status was not accepted`, () => {
    it(`does not display a card`, async () => {
      mockRead.mockRejectedValue({
        ...mockStatus,
        status: FEDERAL_RETURN_STATUS.REJECTED,
      });

      renderPriorYearTaxReturnCard(mockReturns);

      await waitFor(() => {
        expect(mockRead).toHaveBeenCalledTimes(1);
      });

      expect(screen.queryByTestId(`pastYearTaxReturnCard`)).not.toBeInTheDocument();
    });
  });

  describe(`when there are no tax returns`, () => {
    it(`does not display the card`, () => {
      renderPriorYearTaxReturnCard([]);

      expect(mockRead).not.toHaveBeenCalled();
      expect(screen.queryByTestId(`pastYearTaxReturnCard`)).not.toBeInTheDocument();
    });
  });

  describe(`where there is no past year tax return`, () => {
    it(`does not display the card`, () => {
      renderPriorYearTaxReturnCard([currentYearTaxReturn, oldTaxReturn]);

      expect(mockRead).not.toHaveBeenCalled();
      expect(screen.queryByTestId(`pastYearTaxReturnCard`)).not.toBeInTheDocument();
    });
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { TaxProfileContextOrSpinnerGate } from '../screens/TaxProfileContextOrSpinnerGate.js';
import Checklist from '../screens/Checklist.js';
import { TaxReturn } from '../types/core.js';
import { HelmetProvider } from 'react-helmet-async';
import Head from '../components/Head/Head.js';
import { BrowserRouter } from 'react-router-dom';
import { initI18n } from '../i18n.js';
import { SystemAlertContextProvider } from '../context/SystemAlertContext/SystemAlertContext.js';
import { TaxReturnsContextProvider } from '../context/TaxReturnsContext.js';
import { Provider } from 'react-redux';
import { store } from '../redux/store.js';
import { taxReturnFetch } from '../redux/slices/tax-return/taxReturnFetch.js';
import { Mock } from 'vitest';
import { taxReturnCreate } from '../redux/slices/tax-return/taxReturnCreate.js';
import { vi } from 'vitest';

vi.mock(`../redux/slices/tax-return/taxReturnFetch.js`, () => ({
  taxReturnFetch: vi.fn(), // Mock the function
}));

vi.mock(`../redux/slices/tax-return/taxReturnCreate.js`, () => ({
  taxReturnCreate: vi.fn(), // Mock the function
}));

const testTaxReturn: TaxReturn = {
  id: `1`,
  createdAt: new Date().toUTCString(),
  taxYear: 2024,
  taxReturnSubmissions: [],
  facts: {
    '/email': { $type: `gov.irs.factgraph.persisters.EmailAddressWrapper`, item: { email: `user.0000@example.com` } },
    '/filers/#5662d8ec-1123-4bbc-8e01-eb80274a92d4/tin': {
      $type: `gov.irs.factgraph.persisters.TinWrapper`,
      item: { area: `123`, group: `45`, serial: `6788` },
    },
    '/filers/#a9e940e7-6574-4201-805d-b8a783dde42c/isPrimaryFiler': {
      $type: `gov.irs.factgraph.persisters.BooleanWrapper`,
      item: false,
    },
    '/filers': {
      $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
      item: { items: [`5662d8ec-1123-4bbc-8e01-eb80274a92d4`, `a9e940e7-6574-4201-805d-b8a783dde42c`] },
    },
    '/filers/#5662d8ec-1123-4bbc-8e01-eb80274a92d4/isPrimaryFiler': {
      $type: `gov.irs.factgraph.persisters.BooleanWrapper`,
      item: true,
    },
  },
  isEditable: true,
  surveyOptIn: null,
};

// If we grab screen text below to ensure the checklist is rendered, we need to set up i18n.
initI18n();

describe(`Flow Renderer`, () => {
  (taxReturnFetch as Mock).mockReturnValue(Promise.resolve([testTaxReturn]));
  (taxReturnCreate as Mock).mockReturnValue(Promise.resolve(testTaxReturn));

  /*
     This test is less about the checklist and more about testing the code that sets up the fact graph
     and uses it to start rendering information that comes from the fact graph. The checklist, going through
     the TaxReturnLoaderGate, is a first line of defense of "did we set up the fact graph, and do we have
     and ability to query our facts without throwing an error?"
  */
  it(`Can set up the fact graph and render the checklist`, async () => {
    render(
      <HelmetProvider>
        <BrowserRouter>
          <Provider store={store}>
            <SystemAlertContextProvider>
              <Head />
              <TaxReturnsContextProvider>
                <TaxProfileContextOrSpinnerGate>
                  <Checklist />
                </TaxProfileContextOrSpinnerGate>
              </TaxReturnsContextProvider>
            </SystemAlertContextProvider>
          </Provider>
        </BrowserRouter>
      </HelmetProvider>
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Checklist/)).toBeInTheDocument();
        expect(screen.getByText(/You and your family/)).toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });
});

import { CURRENT_TAX_YEAR } from '../../../constants/taxConstants.js';
import { save } from '../../../hooks/useApiHook.js';
import { TaxReturn } from '../../../types/core.js';

/**
 * Performs the network fetch for tax returns.
 *
 * This encapsulates our fetch promise in a way that is easy to use `spy` on in tests
 * previously, we just used `spy` on a fetch which has the downside that we can't
 * then trigger any logging on this fetch.
 */
export async function taxReturnCreate(): Promise<TaxReturn> {
  const year = Number.parseInt(CURRENT_TAX_YEAR);

  return await save<TaxReturn>(`${import.meta.env.VITE_BACKEND_URL}v1/taxreturns`, {
    body: {
      taxYear: year,
      facts: {},
    },
  });
}

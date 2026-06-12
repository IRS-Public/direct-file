import { FetchStateProfileHookResponse } from '../../hooks/useFetchStateProfile.js';
import { StateProfile } from '../../types/StateProfile.js';
import { CURRENT_TAX_YEAR, FEDERAL_RETURN_STATUS } from '../../constants/taxConstants.js';

import { v4 as uuidv4 } from 'uuid';
import { SubmissionStatusContextType } from '../../context/SubmissionStatusContext/SubmissionStatusContext.js';
import { TaxReturnSubmissionStatus } from '../../types/core.js';
import { InterceptingFactGraph } from '../../factgraph/InterceptingFactGraph.js';
import scenarioJson from '../../../../../backend/src/test/resources/scenarios/mfj-all-income-types-withholding.json'
import { TaxReturnsSliceStateData } from '../../redux/slices/tax-return/taxReturnSlice.js';

const noop = () => {
  // noop
};

const taxReturnId = uuidv4();
const noopUrl = `https://www.irs.gov/`;

export type FetchStateProfileHookResponseStateProfileNotOptional = FetchStateProfileHookResponse & {
  stateProfile: StateProfile;
};

export const DEFAULT_FETCH_STATE_PROFILE_HOOK_RESPONSE: FetchStateProfileHookResponseStateProfileNotOptional = {
  stateProfile: {
    stateCode: `MA`,
    landingUrl: noopUrl,
    defaultRedirectUrl: noopUrl,
    transferCancelUrl: noopUrl,
    waitingForAcceptanceCancelUrl: noopUrl,
    redirectUrls: [],
    languages: {},
    taxSystemName: `MassTaxConnect`,
    acceptedOnly: false,
    customFilingDeadline: null,
    departmentOfRevenueUrl: noopUrl,
    filingRequirementsUrl: noopUrl,
  },
  isFetching: false,
  fetchSuccess: true,
  fetchError: undefined,
  fetchSkipped: false,
};

export const DEFAULT_FACTS = scenarioJson.facts;
export const DEFAULT_FACT_GRAPH = new InterceptingFactGraph(DEFAULT_FACTS);

export const DEFAULT_TAX_RETURNS_SLICE_STATE_DATA: TaxReturnsSliceStateData = {
  currentTaxReturnId: taxReturnId,
  taxReturns: [
    {
      id: taxReturnId,
      createdAt: new Date().toISOString(),
      taxYear: Number.parseInt(CURRENT_TAX_YEAR),
      facts: DEFAULT_FACTS,
      taxReturnSubmissions: [
        {
          id: uuidv4(),
          submitUserId: uuidv4(),
          createdAt: new Date().toISOString(),
          receiptId: `receiptIdFromMeF`,
          submissionReceivedAt: new Date().toISOString(),
        },
      ],
      isEditable: false,
      surveyOptIn: null,
    },
  ],
  isFetching: false,
  fetchSuccess: true,
  hasFetchError: false,
  creationFetch: {
    isFetching: false,
    hasFetchError: false,
    fetchSuccess: false,
  },
};

export type SubmissionStatusContextTypeStatusNotOptional = SubmissionStatusContextType & {
  submissionStatus: TaxReturnSubmissionStatus;
};
export const DEFAULT_SUBMISSION_STATUS_CONTEXT: SubmissionStatusContextTypeStatusNotOptional = {
  submissionStatus: {
    status: FEDERAL_RETURN_STATUS.ACCEPTED,
    rejectionCodes: [],
    createdAt: new Date().toISOString(),
  },
  isFetching: false,
  fetchSuccess: true,
  fetchError: undefined,
  setSubmissionStatus: noop,
  fetchSubmissionStatus: noop,
  lastFetchAttempt: new Date(),
};

export const DEFAULT_TRANSFER_DISABLED = false;

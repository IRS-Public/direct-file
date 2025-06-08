import { useTranslation } from 'react-i18next';
import { Alert } from '@trussworks/react-uswds';
import {
  isBeforeStdDeadline,
  isPostStateFilingDeadline,
  isPostDeadlineButBeforeMassachussettsDeadline,
  isBeforeResubmissionDeadline,
} from '../../utils/dateUtils.js';
import { useContext, useMemo } from 'react';
import styles from './EndOfFilingSeasonBanner.module.scss';
import { TaxReturn, TaxReturnSubmissionStatus } from '../../types/core.js';
import { hasBeenSubmitted } from '../../utils/taxReturnUtils.js';
import { SubmissionStatusContext } from '../../context/SubmissionStatusContext/SubmissionStatusContext.js';
import { FEDERAL_RETURN_STATUS } from '../../constants/taxConstants.js';
import { areAnyRejectionsNotFixable } from '../../utils/submissionStatusUtils.js';
import { BareContentDisplay } from '../ContentDisplay/ContentDisplay.js';
import { useAppSelector } from '../../redux/hooks.js';
import { selectCurrentTaxReturn } from '../../redux/slices/tax-return/taxReturnSlice.js';

type BannerContent = {
  headingI18nKey: null | string;
  bodyI18nKey: null | string;
};

export const getBannerI18nKeys = (
  currentTaxReturn: TaxReturn | undefined,
  submissionStatus: TaxReturnSubmissionStatus | undefined
): BannerContent => {
  let headingI18nKey: null | string = null;
  let bodyI18nKey: null | string = null;
  const now = new Date();

  // This can be simplified, but kept verbose and explicitly cover all scenarios
  if (submissionStatus && submissionStatus.status === FEDERAL_RETURN_STATUS.ACCEPTED) {
    headingI18nKey = null;
    bodyI18nKey = null;
  } else if (submissionStatus && submissionStatus.status === FEDERAL_RETURN_STATUS.PENDING) {
    if (currentTaxReturn?.taxReturnSubmissions.length === 1) {
      if (isBeforeStdDeadline(now)) {
        headingI18nKey = `banner.endOfFilingSeason.headingBeforeStdDeadline`;
        bodyI18nKey = `banner.endOfFilingSeason.contentBase`;
      } else {
        headingI18nKey = `banner.endOfFilingSeason.headingBeforeMaDeadline`;
        bodyI18nKey = `banner.endOfFilingSeason.contentBase`;
      }
    } else {
      headingI18nKey = `banner.endOfFilingSeason.headingResubmissionDeadline`;
      bodyI18nKey = `banner.endOfFilingSeason.contentBase`;
    }
  } else if (submissionStatus && submissionStatus.status === FEDERAL_RETURN_STATUS.REJECTED) {
    if (areAnyRejectionsNotFixable(submissionStatus.rejectionCodes)) {
      if (isBeforeStdDeadline(now)) {
        headingI18nKey = `banner.endOfFilingSeason.headingBeforeStdDeadline`;
        bodyI18nKey = `banner.endOfFilingSeason.contentBase`;
      } else {
        headingI18nKey = `banner.endOfFilingSeason.headingClosed`;
        bodyI18nKey = `afterDeadlineBanner`;
      }
    } else {
      if (isBeforeResubmissionDeadline(now)) {
        headingI18nKey = `banner.endOfFilingSeason.headingResubmissionDeadline`;
        bodyI18nKey = `banner.endOfFilingSeason.contentBase`;
      } else {
        headingI18nKey = `banner.endOfFilingSeason.headingClosed`;
        bodyI18nKey = `afterDeadlineBanner`;
      }
    }
  } else if (submissionStatus && submissionStatus.status === FEDERAL_RETURN_STATUS.ERROR) {
    if (isBeforeStdDeadline(now)) {
      headingI18nKey = `banner.endOfFilingSeason.headingBeforeStdDeadline`;
      bodyI18nKey = `banner.endOfFilingSeason.contentBase`;
    } else {
      headingI18nKey = `banner.endOfFilingSeason.headingClosed`;
      bodyI18nKey = `afterDeadlineBanner`;
    }
  } else if (isBeforeStdDeadline(now)) {
    headingI18nKey = `banner.endOfFilingSeason.headingBeforeStdDeadline`;
    bodyI18nKey = `banner.endOfFilingSeason.contentBase`;
  } else if (isPostDeadlineButBeforeMassachussettsDeadline(now)) {
    headingI18nKey = `banner.endOfFilingSeason.headingBeforeMaDeadline`;
    bodyI18nKey = `banner.endOfFilingSeason.contentBase`;
  } else if (isPostStateFilingDeadline(now)) {
    headingI18nKey = `afterDeadlineBanner.heading`;
    bodyI18nKey = `afterDeadlineBanner`;
  }
  return { headingI18nKey, bodyI18nKey };
};

const EndOfFilingSeasonBanner = () => {
  const { t } = useTranslation();
  const currentTaxReturn = useAppSelector(selectCurrentTaxReturn);
  const isFetchingReturns = useAppSelector((store) => store.taxReturns.data.isFetching);
  const successFetchingReturns = useAppSelector((store) => store.taxReturns.data.fetchSuccess);
  const hasErrorFetchingReturns = useAppSelector((store) => store.taxReturns.data.hasFetchError);

  const hasAttemptedLoadingTaxReturns = !isFetchingReturns && (successFetchingReturns || hasErrorFetchingReturns);

  const {
    submissionStatus,
    isFetching: isFetchingStatus,
    fetchError: errorFetchingStatus,
    fetchSuccess: successFetchingStatus,
  } = useContext(SubmissionStatusContext);
  const needStatus = currentTaxReturn && hasBeenSubmitted(currentTaxReturn);
  const hasAttemptedLoadingStatus = !isFetchingStatus && (errorFetchingStatus || successFetchingStatus);
  const waitingForStatus = needStatus ? !hasAttemptedLoadingStatus : false;

  // use useMemo to prevent temporary rendering of null when switching from home to checklist
  const { headingI18nKey, bodyI18nKey } = useMemo(
    () => getBannerI18nKeys(currentTaxReturn, submissionStatus),
    [currentTaxReturn, submissionStatus]
  );

  const renderBanner = headingI18nKey !== null || bodyI18nKey !== null;

  // We need to decide when this banner will return.
  // https://git.irslabs.org/irslabs-prototypes/direct-file/-/issues/8045
  const HIDE_BANNER = true;

  if (!hasAttemptedLoadingTaxReturns || waitingForStatus || HIDE_BANNER || !renderBanner) {
    return null;
  }

  return (
    <section aria-label={t(`banner.endOfFilingSeason.name`)}>
      {/* headingLevel here doesn't do anything since its overwritten by existing styles */}
      <Alert type='warning' headingLevel='h4' role='alert' className={styles.endOfFilingSeasonBanner}>
        {headingI18nKey && <strong>{t(headingI18nKey)}</strong>}
        {bodyI18nKey && (
          <>
            <br />
            <BareContentDisplay i18nKey={bodyI18nKey} collectionId={null}></BareContentDisplay>
          </>
        )}
      </Alert>
    </section>
  );
};

export default EndOfFilingSeasonBanner;

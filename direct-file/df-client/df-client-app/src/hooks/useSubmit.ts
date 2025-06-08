import { useCallback, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../redux/hooks.js';
import { setElectronicSignatureFailure } from '../redux/slices/electronic-signature/electronicSignatureSlice.js';
import { useFactGraph } from '../factgraph/FactGraphContext.js';
import { isTranslateable, save } from './useApiHook.js';
import {
  SYSTEM_ALERT_I18N_PREFIX,
  SystemAlertKey,
  SetSystemAlertConfig,
  useSystemAlertContext,
} from '../context/SystemAlertContext/SystemAlertContext.js';
import { FactGraph } from '@irs/js-factgraph-scala';
import { TaxReturnsContext } from '../context/TaxReturnsContext.js';
import { Condition } from '../flow/Condition.js';

const NONRETRIABLE_ERRORS = [`tinMismatch`, `uneditableTaxReturn`];

const signTaxReturn = async (taxReturnId: string, intentStatement: string, factGraph: FactGraph) => {
  const facts = JSON.parse(factGraph.toJSON());

  await save(`${import.meta.env.VITE_BACKEND_URL}v1/taxreturns/${taxReturnId}/sign`, {
    body: {
      facts,
      intentStatement,
    },
  });
};

const submitTaxReturn = async (taxReturnId: string, factGraph: FactGraph) => {
  const facts = JSON.parse(factGraph.toJSON());

  await save(`${import.meta.env.VITE_BACKEND_URL}v1/taxreturns/${taxReturnId}/submit`, {
    body: {
      facts,
    },
  });
};

export const useSubmit = () => {
  const dispatch = useAppDispatch();
  const electronicSigningFailed = useAppSelector((state) => state.electronicSignature.electronicSigningFailed);
  const { setSystemAlert } = useSystemAlertContext();
  const { currentTaxReturnId } = useContext(TaxReturnsContext);

  const { factGraph } = useFactGraph();
  const { i18n, t } = useTranslation();

  const isEssarSigningPath = new Condition(`isEssarSigningPath`).evaluate(factGraph, null);

  const intentStatement = t(`info./info/complete/sign-and-submit/statement.body`);

  return useCallback(async (): Promise<{ hasSubmitError: boolean; isRetryDisabled: boolean }> => {
    const alertKey: SystemAlertKey = SystemAlertKey.SUBMIT;
    let hasSubmitError = false;
    let isRetryDisabled = false;

    const hasSelfSelectPinLastYear = new Condition({
      operator: `isComplete`,
      condition: `/selfSelectPinLastYear`,
    }).evaluate(factGraph, null);
    const hasLastYearAgi = new Condition({ operator: `isComplete`, condition: `/lastYearAgi` }).evaluate(
      factGraph,
      null
    );
    const legacySigningCompleted = hasSelfSelectPinLastYear || hasLastYearAgi;

    try {
      if (!isEssarSigningPath || (electronicSigningFailed && legacySigningCompleted)) {
        await submitTaxReturn(currentTaxReturnId as string, factGraph);
      } else {
        await signTaxReturn(currentTaxReturnId as string, intentStatement, factGraph);
      }
    } catch (e) {
      hasSubmitError = true;

      let config: SetSystemAlertConfig = {
        type: `error`,
        i18nKey: `generic.submissionError`,
      };
      if (isTranslateable(e)) {
        // Don't allow retries if the error is not retriable
        isRetryDisabled = NONRETRIABLE_ERRORS.includes(e.apiErrorKey);
        if (i18n.exists(`${SYSTEM_ALERT_I18N_PREFIX}.${e.apiErrorKey}`)) {
          config = {
            type: `error`,
            i18nKey: e.apiErrorKey,
            customSystemAlertConfigBuilderOptions: {
              errorBody: e.body,
            },
          };
          if (e.apiErrorKey === `signing.retriableEsignatureError`) {
            config.internalLink = `/flow/complete/sign-and-submit/sign-return-intro`;
            // Remember that the user has failed electronic signing at least once. The user can still retry but
            // if they proceed through the legacy signing flow we'll prefer the legacy /submit endpoint next time.
            dispatch(setElectronicSignatureFailure());
          }
        }
      }
      setSystemAlert(alertKey, config);
    }

    return {
      hasSubmitError,
      isRetryDisabled,
    };
  }, [
    dispatch,
    factGraph,
    setSystemAlert,
    currentTaxReturnId,
    i18n,
    intentStatement,
    isEssarSigningPath,
    electronicSigningFailed,
  ]);
};

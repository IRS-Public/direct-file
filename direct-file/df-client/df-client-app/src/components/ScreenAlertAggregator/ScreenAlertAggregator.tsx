import SummaryErrorAlert from '../SummaryAlert/index.js';
import { MutableRefObject, useEffect } from 'react';
import { ConcretePath } from '@irs/js-factgraph-scala';
import { AggregatedAlertConfig } from '../../flow/ContentDeclarations.js';
import MefAlert from '../Alert/MefAlert.js';
import TaxReturnAlert from '../Alert/TaxReturnAlert.js';
import { useSystemAlertContext } from '../../context/SystemAlertContext/SystemAlertContext.js';
import SystemAlertAggregator from '../SystemAlertAggregator/SystemAlertAggregator.js';
import { ScreenInfo, buildRenderedScreenContentKey, conditionsAsKeySuffix } from '../screenUtils.js';
import { RenderedScreenContent } from '../RenderedScreenContent.js';
import { useTranslation } from 'react-i18next';
import { assertNever } from 'assert-never';

export const ERROR_SUMMARY_ID = `error-summary`;

type ScreenMefAlert = AggregatedAlertConfig & { componentName: `MefAlert` };
type ScreenTaxReturnAlert = AggregatedAlertConfig & { componentName: `TaxReturnAlert` };

function parseAlertsByType<AlertConfig extends AggregatedAlertConfig>(alerts: AlertConfig[]) {
  const warnings: AlertConfig[] = [];
  const errors: AlertConfig[] = [];

  alerts.forEach((alert) => {
    switch (alert.props.type) {
      case `warning`:
        warnings.push(alert);
        break;
      case `error`:
        errors.push(alert);
        break;
    }
  });

  return { warnings, errors };
}

const buildAlertKey = (alert: AggregatedAlertConfig) =>
  `${alert.props.i18nKey}-${alert.componentName}-${alert.props.type}-${conditionsAsKeySuffix(alert)}`;

type ScreenAlertAggregatorProps = {
  // General props
  collectionId: string | null;
  factRefs: MutableRefObject<Map<ConcretePath, React.MutableRefObject<HTMLInputElement>>>;
  factValidity: Map<ConcretePath, boolean>;
  // Mef alerts
  mefAlerts: ScreenMefAlert[];
  // Tax return alerts
  taxReturnAlerts: ScreenTaxReturnAlert[];
  // Field validation error summary
  showSummary: boolean;
  screenInfo: ScreenInfo;
  // Field errors are only generated when showFeedback true
  showFeedback: boolean;
};

/**
 * A component that deals with presentation of alerts following the DF Alert Aggregation System:
 * - Wiki: https://git.irslabs.org/irslabs-prototypes/direct-file/-/wikis/Errors,-Warnings,-and-Status-Messages
 */
const ScreenAlertAggregator = ({
  collectionId,
  factRefs,
  factValidity,
  mefAlerts,
  taxReturnAlerts,
  showSummary,
  screenInfo,
  showFeedback,
}: ScreenAlertAggregatorProps) => {
  const { t, i18n } = useTranslation(`translation`);
  const { systemAlerts } = useSystemAlertContext();

  const { errors: mefErrors, warnings: mefWarnings } = parseAlertsByType(mefAlerts);
  const { errors: taxReturnErrors, warnings: taxReturnWarnings } = parseAlertsByType(taxReturnAlerts);

  const shouldRender =
    Object.keys(systemAlerts).length > 0 ||
    mefErrors.length > 0 ||
    mefWarnings.length > 0 ||
    taxReturnErrors.length > 0 ||
    taxReturnWarnings.length > 0 ||
    showSummary;

  return (
    shouldRender && (
      <div className='margin-top-3'>
        {
          // System alerts
          <SystemAlertAggregator />
        }
        {
          // Mef errors
          mefErrors.map((mefError) => (
            <MefAlert
              {...mefError.props as any}
              collectionId={collectionId}
              key={`${buildAlertKey(mefError)}-${mefError.props.mefErrorCode}`}
            />
          ))
        }
        {
          // Tax return errors
          taxReturnErrors.map((taxReturnError) => (
            <TaxReturnAlert {...taxReturnError.props as any} collectionId={collectionId} key={buildAlertKey(taxReturnError)} />
          ))
        }
        {
          // Field validation error summary
          showSummary && <SummaryErrorAlert factRefs={factRefs} factValidity={factValidity} id={ERROR_SUMMARY_ID} />
        }
        {
          // MeF warnings
          mefWarnings.map((mefWarning) => (
            <MefAlert
              {...mefWarning.props as any}
              collectionId={collectionId}
              key={`${buildAlertKey(mefWarning)}-${mefWarning.props.mefErrorCode}`}
            />
          ))
        }
        {
          // Tax return warnings
          taxReturnWarnings.map((taxReturnWarning) => {
            const { childConfigs, ...props } = taxReturnWarning.props;

            return (
              <TaxReturnAlert {...props as any} collectionId={collectionId} key={buildAlertKey(taxReturnWarning)}>
                {childConfigs?.map((childConfig) => {
                  return (
                    <RenderedScreenContent
                      key={buildRenderedScreenContentKey(childConfig)}
                      config={childConfig}
                      collectionId={collectionId}
                      factValidity={factValidity}
                      factRefs={factRefs}
                      screenInfo={screenInfo}
                    />
                  );
                })}
              </TaxReturnAlert>
            );
          })
        }
      </div>
    )
  );
};

export default ScreenAlertAggregator;

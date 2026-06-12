import { DFAlertProps } from '../../components/Alert/DFAlert.js';
import { CommonLinkRenderer } from 'df-common-link-renderer';

/**
 * see I18nErrorKeys.java for backend source for these keys
 */
export enum I18nAlertKeysWithCustomConfig {
  TIN_MISMATCH = `tinMismatch`,
}

type CustomSystemAlertConfig = Pick<DFAlertProps, 'additionalComponents' | 'context' | 'internalLink'> & {
  nestedI18nKey?: string;
};

export type CustomSystemAlertConfigBuilderOptions = {
  errorBody?: object;
};
type CustomSystemAlertConfigBuilder = (options?: CustomSystemAlertConfigBuilderOptions) => CustomSystemAlertConfig;

type CustomSystemAlertConfigs = Map<string, CustomSystemAlertConfig | CustomSystemAlertConfigBuilder>;

// tinMismatch Custom Alert Config ---
// The following define handling of the custom tinMismatch alerting

// tinMismatchBody is the expected shape of the tinMismatch error body
type tinMismatchBody = {
  mfj: string;
  taxReturnId?: string;
};

// isTinMismatchBody is a typeguard that checks that the body matches the tinMismatchBody type
// and tells typescript to use this more specific type
const isTinMismatchBody = (maybeBody: unknown): maybeBody is tinMismatchBody => {
  return typeof maybeBody === `object` && maybeBody !== null && `mfj` in maybeBody;
};

// getTinMismatchCustomConfig is a "builder function" that returns a CustomSystemAlertConfig
// It returns 2 variants depending on input from the error body - mfj or default
const getTinMismatchCustomConfig: CustomSystemAlertConfigBuilder = (options = {}): CustomSystemAlertConfig => {
  const { errorBody } = options;
  const isMfj = isTinMismatchBody(errorBody) && errorBody.mfj;
  const primarySsnUrl = `/flow/you-and-your-family/about-you/about-you-tin`;
  const secondarySsnUrl = `/flow/you-and-your-family/spouse/spouse-mfj-tax-id`;

  return {
    nestedI18nKey: isMfj ? `mfj` : undefined,
    additionalComponents: isMfj
      ? {
          primaryFilerSsnOrItinLink: <CommonLinkRenderer url={primarySsnUrl} />,
          spouseSsnOrItinLink: <CommonLinkRenderer url={secondarySsnUrl} />,
        }
      : {
          primaryFilerSsnOrItinLink: <CommonLinkRenderer url={primarySsnUrl} />,
        },
  } as any;
};

/**
 * Some system alerts require additional context on the front end that the neither backend, en.yaml, nor the flow
 * files can provide. Instead, we provide a map of the context that the system alert might need so that if a matching
 * system alert is added, we can retrieve the context based on the i18nKey (which is managed by the backend).
 *
 * Note:
 * - This allows us to do really powerful things, but also makes adding and maintaining complex system alert
 *   behavior burdensome.
 * - Use sparingly and advocate for simple design wherever possible.
 */
export const CUSTOM_SYSTEM_ALERT_CONFIGS: CustomSystemAlertConfigs = new Map<
  string,
  CustomSystemAlertConfig | CustomSystemAlertConfigBuilder
>([[I18nAlertKeysWithCustomConfig.TIN_MISMATCH, getTinMismatchCustomConfig]]);

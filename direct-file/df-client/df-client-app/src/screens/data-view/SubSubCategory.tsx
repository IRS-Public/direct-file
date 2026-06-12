import { Link, To } from 'react-router-dom';
import { useFactGraph } from '../../factgraph/FactGraphContext.js';
import { FlowAssertion, FlowSubSubcategory, SubSubcategoryBorderStyle } from '../../flow/flowConfig.js';
import { Path } from '../../flow/Path.js';
import Translation from '../../components/Translation/index.js';
import { AlertConfig, AlertConfigs, MefAlertConfig } from '../../misc/aggregatedAlertHelpers.js';
import { handleRefFromRoute } from '../../components/SummaryAlert/summaryHelpers.js';
import { useTranslation } from 'react-i18next';
import {
  DATE_FORMAT_PARAMS,
  DOLLAR_FORMAT_PARAMS,
  prettyPrintFactGraphValues,
} from '../../misc/factGraphPrettyPrint.js';
import useTranslateWithFacts from '../../hooks/useTranslateWithFacts.js';
import {
  AssertionDeclaration,
  FactConfig,
  InfoDisplayConfig,
  ResultAssertionDeclaration,
  ScreenContentConfig,
  contentConfigIsFactConfig,
  contentConfigIsInfoDisplayConfig,
} from '../../flow/ContentDeclarations.js';
import { CommonLinkRenderer } from 'df-common-link-renderer';
import { useState, FC, RefObject } from 'react';
import { conditionsPass } from '../../utils/condition.js';
import InternalLink from '../../components/InternalLink/index.js';
import Result from './ResultAssertion.js';
import Assertion from './Assertion.js';
import styles from './SubSubCategory.module.scss';
import { renderMefAlertForDataView, renderTaxReturnAlertForDataView } from '../DataView.js';
import { ConcretePath, FactGraph } from '@irs/js-factgraph-scala';
import { getCurrentFactSelectValues } from '../../components/FormControl/FactSelect/FactSelect.js';
import { BLANK_BANK_ACCOUNT } from '../../components/factTypes/BankAccount/BankAccount.js';
import { BooleanFactProps } from '../../types/core.js';
import { getCollectionId } from '../BaseScreen.js';
import { Icon, HeadingLevel } from '@trussworks/react-uswds';
import { AbsolutePath } from '../../fact-dictionary/Path.js';
import { ScreenConfig } from '../../flow/ScreenConfig.js';

export interface SubSubCategoryProps {
  ssc: FlowSubSubcategory;
  collectionId: string | null;
  alertConfigs?: AlertConfigs;
  mefAlertConfigs?: AlertConfigs<MefAlertConfig>;
  // These refs insert anchors that the alert links can use to jump to the correct heading
  refs: React.MutableRefObject<Map<string, React.MutableRefObject<HTMLHeadingElement>>>;
  assertion?: FlowAssertion;
  // This is the i18n extra variables that i18n uses to render the heading
  headingContext?: object;
  // If this ssc is incomplete, this is the next incomplete screen
  nextIncompleteScreen?: ScreenConfig | undefined;
  isAfterNextIncompleteScreen: boolean;
  includesNextIncompleteScreen: boolean;
  sectionIsComplete: boolean;
  // This is the border above the subsubcategory
  borderStyle?: SubSubcategoryBorderStyle;
  // This is the heading level of the subsubcategory header in the dataview (not context heading)
  headingLevel?: HeadingLevel;
}

interface Fact {
  isNextIncompleteFact: boolean;
  isCheckbox: boolean;
  path: AbsolutePath;
  value: string | Date | number;
  type: string;
  inputType?: string;
  isSensitive?: boolean;
  collectionId?: string | null;
  editRoute: string;
  anchorLink?: string;
  isReadOnly: boolean;
  mefAlerts: AlertConfigs<MefAlertConfig>;
  taxReturnAlerts: AlertConfigs;
}

type SensitiveFactProps = {
  value: string;
};

const SensitiveFact: FC<SensitiveFactProps> = ({ value }) => {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState<boolean>(true);

  return (
    <>
      {hidden ? [...Array(value.length)].map((_e) => ` •`) : value}
      &nbsp; (
      <button type='button' className='usa-button--unstyled' onClick={() => setHidden((hidden: boolean) => !hidden)}>
        {t(`button.${hidden ? `show` : `hide`}`)}
      </button>
      )
    </>
  );
};

const filterByScreenRoute = (a: AlertConfig | MefAlertConfig, screenRoute: string | undefined) =>
  a.route === screenRoute;
const filterByFactPath = (a: AlertConfig | MefAlertConfig, path: string) => a.factPaths?.includes(path);

const getMefAlertsByScreen = (
  mefAlertConfigs: AlertConfigs<MefAlertConfig> | undefined,
  screenRoute: string | undefined,
  path: string
): Omit<AlertConfigs<MefAlertConfig>, 'infos' | 'successes'> => {
  return {
    warnings:
      mefAlertConfigs?.warnings.filter((warning: MefAlertConfig) =>
        warning.factPaths ? filterByFactPath(warning, path) : filterByScreenRoute(warning, screenRoute)
      ) || [],
    errors:
      mefAlertConfigs?.errors.filter((error: MefAlertConfig) =>
        error.factPaths ? filterByFactPath(error, path) : filterByScreenRoute(error, screenRoute)
      ) || [],
  };
};
const getTaxReturnAlertsByScreen = (
  alertConfigs: AlertConfigs | undefined,
  screenRoute: string | undefined,
  path: string
): Omit<AlertConfigs, 'infos' | 'successes'> => {
  return {
    warnings:
      alertConfigs?.warnings.filter((warning: AlertConfig) =>
        warning.factPaths ? filterByFactPath(warning, path) : filterByScreenRoute(warning, screenRoute)
      ) || [],
    errors:
      alertConfigs?.errors.filter((error: AlertConfig) =>
        error.factPaths ? filterByFactPath(error, path) : filterByScreenRoute(error, screenRoute)
      ) || [],
  };
};

const filterFactsForDataView = (content: ScreenContentConfig, factGraph: FactGraph, collectionId: string | null) => {
  // Do not show the fact if the condition on it evaluates to false
  const showFact = conditionsPass(content.props, factGraph, collectionId);
  const isFact = contentConfigIsFactConfig(content);
  const isOptional = isFact ? content.props.required === false : false;
  // eslint-disable-next-line eqeqeq
  return (isFact || isOptional) && content.props.displayOnlyOn != `edit` && showFact;
};

// Finds the first ContextHeading available in the subsubcategory
// Available means all of the following are true:
// - the condition on the screen is true
// - the ContextHeading condition is true
// - the ContextHeading is not marked with displayOnlyOn='edit'
export const getFirstContextHeading = (ssc: FlowSubSubcategory, factGraph: FactGraph, collectionId: string | null) => {
  // Return true if you find a ContextHeading with true condition
  const isContextHeading = (content: ScreenContentConfig, factGraph: FactGraph, collectionId: string | null) => {
    const isContextHeading = contentConfigIsInfoDisplayConfig(content) && content.componentName === `ContextHeading`;
    const isAvailable = conditionsPass(content.props, factGraph, collectionId);
    return isContextHeading && isAvailable && content.props.displayOnlyOn !== `edit`;
  };

  const firstAvailableScreen = ssc.screens.find((c) => c.isAvailable(factGraph, collectionId));
  const firstContextHeader = firstAvailableScreen?.content?.find((content): content is InfoDisplayConfig =>
    isContextHeading(content, factGraph, collectionId)
  );
  return firstContextHeader;
};

export const getAllFactPathsInSubsection = (
  ssc: FlowSubSubcategory,
  factGraph: FactGraph,
  collectionId: string | null,
  t: (path: string | string[]) => string,
  sscIsAfterNextIncompleteScreen: boolean,
  sectionIsComplete: boolean,
  nextIncompleteScreen: ScreenConfig | undefined,
  alertConfigs?: AlertConfigs,
  mefAlertConfigs?: AlertConfigs<MefAlertConfig>
) => {
  const availableScreens = ssc.screens.filter((c) => c.isAvailable(factGraph, collectionId));
  const firstFactFromIncompleteScreen = nextIncompleteScreen?.content?.find((content): content is FactConfig =>
    filterFactsForDataView(content, factGraph, collectionId)
  );
  return (
    availableScreens
      .flatMap((screen) => screen.content)
      .filter((content): content is FactConfig => filterFactsForDataView(content, factGraph, collectionId))
      .flatMap((factConfig) => {
        // FactSelect configs require a special case since they represent many facts
        if (factConfig.componentName === `FactSelect`) {
          const { currentValues, pathPrefix } = getCurrentFactSelectValues(
            factConfig.props.path,
            collectionId,
            factGraph
          );
          const currentValuesFiltered = currentValues.filter((value) => value.currentResult.complete);
          if (currentValuesFiltered.length) {
            return currentValuesFiltered.map((value) => {
              const factPath = Path.fromConcretePath(`${pathPrefix}/${value.optionValue}` as ConcretePath);
              const factValue = prettyPrintFactGraphValues(
                factPath,
                value.currentResult,
                t,
                `dataviews.${ssc.subcategoryRoute}.enums`
              ).output;
              // When the fact is a Dollar the factValue can be 0 and we want to still show that value
              if (factValue || factValue === 0) {
                return {
                  path: factPath,
                  value: factValue,
                  type: value.currentResult.typeName,
                  // Right now, we have nowhere where you could even configure these facts to be sensitive.
                  isSensitive: false,
                } as Fact;
              } else {
                return undefined;
              }
            });
          } else {
            const factPath = Path.fromConcretePath(`noFactSelectSelections` as ConcretePath);
            return {
              path: factPath,
              value: t(`dataviews.noneListed`),
            } as Fact;
          }
        } else if (factConfig.componentName === `BankAccount`) {
          const currentResult = factGraph.get(Path.concretePath(factConfig.props.path, collectionId) as ConcretePath);
          if (!currentResult.complete) {
            return undefined;
          }
          const results = Object.keys(BLANK_BANK_ACCOUNT).map((key) => {
            return {
              path: Path.fromConcretePath(`${factConfig.props.path}/${key}` as ConcretePath),
              value: currentResult.get[key],
              type: currentResult.typeName,
              isSensitive: key === `routingNumber` || key === `accountNumber` ? `true` : undefined,
            } as Fact;
          });
          return results;
        }
        const { path } = factConfig.props;
        const retValue = factGraph.get(Path.concretePath(path, collectionId));
        const collectionNames = [`/primaryFiler`, `/secondaryFiler`];
        const collectionName = collectionNames.find((name) => path.includes(name)) as ConcretePath;
        const factValue = prettyPrintFactGraphValues(
          path,
          retValue,
          t,
          `dataviews.${ssc.subcategoryRoute}.enums`,
          factConfig
        ).output;
        const isNextIncompleteFact = factValue === `` ? firstFactFromIncompleteScreen?.props.path === path : false;
        if (
          // Don't render the placeholder facts if its subsubcategory comes after the next incomplete section.
          !retValue.complete &&
          sscIsAfterNextIncompleteScreen &&
          !sectionIsComplete &&
          !isNextIncompleteFact
        ) {
          return undefined;
        }
        // Only display checked checkboxes
        const booleanProps = factConfig.props as BooleanFactProps;
        if (retValue.typeName === `class java.lang.Boolean` && booleanProps.inputType === `checkbox` && !retValue.get) {
          return {
            path,
            value: t(`dataviews.no`),
          };
        }

        const screenRoute = availableScreens.find((screen) => screen.factPaths.includes(path))?.fullRoute(collectionId);
        return {
          path,
          value: factValue === `` ? t(`dataviews.blank`) : factValue,
          type: retValue.typeName,
          isSensitive: factConfig.props.isSensitive,
          collectionId: getCollectionId(factGraph, new URLSearchParams(), collectionName) || null,
          editRoute: factConfig.props.editRoute || ``,
          isCheckbox: booleanProps.inputType === `checkbox`,
          anchorLink: factConfig.props.dataViewAnchorLink,
          isReadOnly: factConfig.props.readOnly,
          mefAlerts: getMefAlertsByScreen(mefAlertConfigs, screenRoute, path),
          taxReturnAlerts: getTaxReturnAlertsByScreen(alertConfigs, screenRoute, path),
          isNextIncompleteFact,
        };
      })
      // exclude any incomplete facts
      .filter((fact): fact is Fact => fact !== undefined)
  );
};

type SubSubCategoryHeaderProps = {
  ssc: FlowSubSubcategory;
  i18nKey: string;
  headingContext?: object; // i18n context for the heading
  collectionId: string | null;
  addRef?: RefObject<HTMLAnchorElement> | RefObject<HTMLHeadingElement>;
  to?: To;
  action?: 'edit' | 'review';
  contextHeading?: InfoDisplayConfig; // SSC contains a ContextHeading
  headingLevel?: HeadingLevel;
};

// Displays the header of the subsubcategory in a dataview section
// Includes the link action, and the context heading if provided
export const SubSubCategoryHeader = ({
  ssc,
  i18nKey,
  headingContext,
  collectionId,
  addRef,
  to,
  headingLevel,
  action,
  contextHeading,
}: SubSubCategoryHeaderProps) => {
  const { t } = useTranslation();
  const DataviewHeadingLevel = headingLevel || `h2`;

  return (
    <>
      {contextHeading && (
        <div className={styles.dataViewSectionHeader}>
          <h2 className={styles.dataViewSectionHeading}>
            <Translation
              i18nKey={`headings.${contextHeading.props.i18nKey}`}
              context={headingContext}
              collectionId={collectionId}
            />
          </h2>
        </div>
      )}
      <div className={styles.dataViewSectionHeader}>
        <DataviewHeadingLevel
          id={ssc.routeSuffix}
          className={styles.dataViewSectionHeading}
          ref={addRef as RefObject<HTMLHeadingElement>}
          tabIndex={-1}
        >
          <Translation i18nKey={i18nKey} context={headingContext} collectionId={collectionId} />
        </DataviewHeadingLevel>
        {action !== undefined ? (
          <div className={styles.dataViewSectionAction}>
            <Link to={to as To} aria-describedby={ssc.routeSuffix} className='display-flex flex-align-center'>
              {ssc.editable ? <Icon.Edit aria-hidden='true' className='margin-right-05' /> : null}
              {!ssc.editable ? t(`button.review`) : t(`button.edit`)}
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
};

export function DataViewFact({
  fact,
  ssc,
  collectionId,
  sectionIsComplete,
  t,
}: {
  fact: Fact;
  ssc: FlowSubSubcategory;
  collectionId: string | null;
  sectionIsComplete: boolean;
  t: (path: string | string[]) => string;
}) {
  const { i18n } = useTranslation(`translation`);
  const { factGraph } = useFactGraph();

  const DATE_FORMATTER = new Intl.DateTimeFormat(i18n.language, DATE_FORMAT_PARAMS);
  const DOLLAR_FORMATTER = new Intl.NumberFormat(i18n.language, DOLLAR_FORMAT_PARAMS);

  // Gets the alternate label with context if it exists
  // and the specified condition results in true.
  const getLabelWithContext = (labelKey: string) => {
    const conditionContextMap = {
      [`_spouse`]: Path.concretePath(`/treatAsMFJ`, collectionId),
      [`_has1099G`]: Path.concretePath(`/form1099Gs/*/has1099`, collectionId),
    };
    const possibleContexts = Object.keys(conditionContextMap) as (keyof typeof conditionContextMap)[];
    const context = possibleContexts.find((context) => i18n.exists(`${labelKey}${context}`));
    if (!context) return labelKey;
    const condition = conditionContextMap[context as keyof typeof conditionContextMap];
    const result = factGraph.get(condition).complete ? factGraph.get(condition).get : null;
    return result ? `${labelKey}${context}` : labelKey;
  };

  // There is enough divergence between the keys in data views and our field names,
  // that we require a defined key for each field that can appear in a data view.
  const labelKey = `dataviews.${ssc.subcategoryRoute}.${fact.path}`;
  const labelKeyWithContext = getLabelWithContext(labelKey);
  const labelHasAnchorLink = i18n.exists(`${labelKey}.anchorLink`);
  const labelHasExternalLink = i18n.exists(`${labelKey}.externalLink`);
  const labelHasInternalLink = fact.editRoute && i18n.exists(`${labelKey}.internalLink`);
  const renderedFact = (() => {
    if (fact.anchorLink || (fact.isNextIncompleteFact && !sectionIsComplete)) {
      return null;
    } else if (fact.type === `class gov.irs.factgraph.types.Day`) {
      return <span key={fact.path}>{DATE_FORMATTER.format(fact.value as Date)}</span>;
    } else if (typeof fact.value === `number`) {
      return <span key={fact.path}>{DOLLAR_FORMATTER.format(fact.value)}</span>;
    } else if (typeof fact.value === `string`) {
      if (fact.type === `class java.lang.Boolean`) {
        const yesOrNo = fact.value === `true` ? `yes` : `no`;
        return i18n.exists(`fields.${fact.path}.boolean.${yesOrNo}`) && !fact.isCheckbox ? (
          <Translation key={fact.path} i18nKey={`fields.${fact.path}.boolean.${yesOrNo}`} collectionId={collectionId} />
        ) : (
          <span key={fact.path}>{t(`booleans.${fact.value}`)}</span>
        );
      } else if (fact.isSensitive) {
        return <SensitiveFact key={fact.path} value={fact.value} />;
      } else {
        // The address split returned from the fact graph has line breaks.
        // Rather than do some sort of dangerously set inner HTML, which could pose future
        // security issues, we special case line breaks on fact graph values.
        // Also, remove <strong> tags from value
        // The filter ensures that we don't render empty lines, which render as extra spaces.
        const valueWithoutTags = fact.value.replace(/<strong>|<\/strong>/g, ``);
        return valueWithoutTags
          .split(`<br />`)
          .filter((line): line is string => {
            if (!line || typeof line !== `string`) {
              return false;
            }
            return line.trim().length > 0;
          })
          .map((line) => (
            <span key={fact.path + line}>
              {line}
              <br />
            </span>
          ));
      }
    }
  })();
  return (
    <li key={fact.path} className={`${styles.dataViewItem}  usa-prose`}>
      <strong className='display-block'>
        <Translation i18nKey={labelKeyWithContext || labelKey} collectionId={collectionId} />
      </strong>
      {renderedFact}
      {labelHasAnchorLink && (
        <>
          &nbsp;
          <Translation
            i18nKey={`dataviews.anchorLink`}
            collectionId={collectionId}
            components={{ AnchorLink: <a href={t(`${labelKey}.anchorLink.url`)}></a> }}
          />
        </>
      )}
      {fact.anchorLink && (
        <>
          &nbsp;
          <Translation
            i18nKey={`dataviews.anchorLink`}
            collectionId={collectionId}
            components={{ AnchorLink: <a href={`#${fact.anchorLink}`}></a> }}
          />
        </>
      )}
      {labelHasExternalLink && (
        <Translation
          i18nKey={`${labelKey}.externalLink`}
          collectionId={collectionId}
          components={{
            ExternalLink: <CommonLinkRenderer url={t(`${labelKey}.externalLink.url`)} />,
          }}
        />
      )}
      {labelHasInternalLink && (
        <>
          <br />
          <InternalLink i18nKey={labelKey} collectionId={fact.collectionId || null} route={fact.editRoute} />
        </>
      )}
      {fact.mefAlerts?.errors.map((error: MefAlertConfig) => renderMefAlertForDataView(error))}
      {fact.taxReturnAlerts?.errors.map((error) => renderTaxReturnAlertForDataView(error))}
      {fact.mefAlerts?.warnings.map((warning) => renderMefAlertForDataView(warning))}
      {fact.taxReturnAlerts?.warnings.map((warning) => renderTaxReturnAlertForDataView(warning))}
    </li>
  );
}
// Sections that we want to include in the data preview, even if they are not editable
const REVIEWABLE_READONLY_SECTIONS = [
  `/flow/you-and-your-family/about-you/your-tax-identification`,
  `/flow/you-and-your-family/about-you/your-identity-protection`,
];

// This Subsubcategory component is only used to display the dataview version of a subsubcategory.
// So it's quite different than the other components that share a name with a flow component.
// The normal Screen.tsx file doesn't display this, but the Dataview.tsx and CollectionHubDataView.tsx do.
// It autogenerates a "summary" from the subsubcategory structure and facts.
export function SubSubCategory({
  ssc,
  collectionId,
  alertConfigs,
  mefAlertConfigs,
  refs,
  assertion,
  headingContext,
  isAfterNextIncompleteScreen,
  includesNextIncompleteScreen,
  nextIncompleteScreen,
  sectionIsComplete,
  borderStyle = `normal`,
  headingLevel,
}: SubSubCategoryProps) {
  const { factGraph } = useFactGraph();
  const { i18n } = useTranslation(`translation`);
  const { t } = useTranslateWithFacts(factGraph, collectionId);
  if (ssc.hidden) {
    return null;
  }
  // We need to pass useTranslateWithFacts to prettyPrintGraphValues so that we infer fact graph values that
  // are returned in our enum option strings.
  const availableScreens = ssc.screens.filter((c) => c.isAvailable(factGraph, collectionId));
  // eslint-disable-next-line eqeqeq
  if (availableScreens.length == 0 && !assertion) {
    return null;
  }
  const rawFacts = getAllFactPathsInSubsection(
    ssc,
    factGraph,
    collectionId,
    t,
    isAfterNextIncompleteScreen,
    sectionIsComplete,
    nextIncompleteScreen,
    alertConfigs,
    mefAlertConfigs
  );
  const incompleteFactIndex = rawFacts.findIndex((fact: Fact) => fact.isNextIncompleteFact) + 1;
  const facts = rawFacts.slice(0, incompleteFactIndex || rawFacts.length);
  const subsectionHasOnlyReadOnlyFacts = facts.every((fact: Fact) => fact.isReadOnly);
  const reviewableSubSubsection = REVIEWABLE_READONLY_SECTIONS.includes(ssc.fullRoute);

  const allAssertions = availableScreens
    .flatMap((sc) =>
      sc.content.filter((c) =>
        {
          return (
            conditionsPass(c.props, factGraph, collectionId) &&
            (c.componentName === `FactAssertion` || c.componentName === `FactResultAssertion`)
          )
        }
      )
    )
    .filter((result) => result);
  const factAssertion = allAssertions.find((a) => a?.componentName === `FactAssertion`)?.props as AssertionDeclaration;
  const sscAssertion = assertion || factAssertion;

  // Gets the alternate label with context if it exists
  // and the specified condition results in true.
  const getLabelWithContext = (labelKey: string) => {
    const conditionContextMap = {
      [`_spouse`]: Path.concretePath(`/treatAsMFJ`, collectionId),
      [`_has1099G`]: Path.concretePath(`/form1099Gs/*/has1099`, collectionId),
    };
    const possibleContexts = Object.keys(conditionContextMap) as (keyof typeof conditionContextMap)[];
    const context = possibleContexts.find((context) => i18n.exists(`${labelKey}${context}`));
    if (!context) return labelKey;
    const condition = conditionContextMap[context as keyof typeof conditionContextMap];
    const result = factGraph.get(condition).complete ? factGraph.get(condition).get : null;
    return result ? `${labelKey}${context}` : labelKey;
  };

  const contextHeading = getFirstContextHeading(ssc, factGraph, collectionId);
  // Setting borderStyle to `auto` will use the heavy border if the contextHeading is present
  // eslint-disable-next-line eqeqeq
  const borderVariant = borderStyle == `auto` && contextHeading ? `heavy` : borderStyle;

  if (includesNextIncompleteScreen && subsectionHasOnlyReadOnlyFacts) {
    return (
      <div
        data-testid='subsubcategory'
        key={ssc.fullRoute}
        className={`${styles.incompleteDataViewSection} border-${borderVariant}`}
      >
        <SubSubCategoryHeader
          ssc={ssc}
          i18nKey={getLabelWithContext(`subsubcategories.${ssc.subcategoryRoute}.${ssc.routeSuffix}`)}
          collectionId={collectionId}
          addRef={handleRefFromRoute(ssc.routeSuffix, refs) as RefObject<HTMLHeadingElement>}
          to={availableScreens[0].fullRoute(collectionId, { reviewMode: true })}
          contextHeading={contextHeading}
          headingLevel={headingLevel}
        />
      </div>
    );
  }

  if (
    (subsectionHasOnlyReadOnlyFacts && sscAssertion === undefined && !reviewableSubSubsection) ||
    (isAfterNextIncompleteScreen && !sectionIsComplete && sscAssertion === undefined)
  ) {
    return null;
  }

  const factResult = allAssertions.find((a) => a?.componentName === `FactResultAssertion`)
    ?.props as ResultAssertionDeclaration;

  // eslint-disable-next-line eqeqeq
  if (availableScreens.length == 0 && sscAssertion) {
    return (
      <div key={ssc.fullRoute} className={`${styles.dataViewSection} border-${borderVariant}`}>
        <SubSubCategoryHeader
          ssc={ssc}
          i18nKey={getLabelWithContext(`subsubcategories.${ssc.subcategoryRoute}.${ssc.routeSuffix}`)}
          collectionId={collectionId}
          addRef={handleRefFromRoute(ssc.routeSuffix, refs) as RefObject<HTMLHeadingElement>}
          contextHeading={contextHeading}
          headingLevel={headingLevel}
        />
        <Assertion
          i18nKey={sscAssertion.i18nKey}
          type={sscAssertion.type}
          collectionId={collectionId}
          editRoute={sscAssertion.editRoute}
        />
      </div>
    );
  }
  return (
    <div
      data-testid='subsubcategory'
      key={ssc.fullRoute}
      className={`${styles.dataViewSection} border-${borderVariant}`}
    >
      <SubSubCategoryHeader
        ssc={ssc}
        i18nKey={getLabelWithContext(`subsubcategories.${ssc.subcategoryRoute}.${ssc.routeSuffix}`)}
        collectionId={collectionId}
        addRef={handleRefFromRoute(ssc.routeSuffix, refs) as RefObject<HTMLHeadingElement>}
        action={`edit`}
        to={availableScreens[0].fullRoute(collectionId, { reviewMode: true })}
        headingContext={headingContext}
        contextHeading={contextHeading}
        headingLevel={headingLevel}
      />
      <ul className={styles.dataViewItems}>
        {factResult && (
          <li className={`${styles.dataViewItem}  usa-prose`}>
            <Result i18nKey={factResult.i18nKey} collectionId={collectionId} />
          </li>
        )}
        {facts.map((fact) => {
          return (
            <DataViewFact
              key={fact.path}
              fact={fact}
              ssc={ssc}
              collectionId={collectionId}
              sectionIsComplete={sectionIsComplete}
              t={t}
            />
          );
        })}
      </ul>
      {sscAssertion && (
        <Assertion
          i18nKey={sscAssertion.i18nKey}
          type={sscAssertion.type}
          collectionId={collectionId}
          editRoute={sscAssertion.editRoute}
        />
      )}
    </div>
  );
}

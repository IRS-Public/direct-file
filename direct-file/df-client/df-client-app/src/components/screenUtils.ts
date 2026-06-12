import { assertNever } from 'assert-never';
import {
  ScreenContentConfig,
  contentConfigIsFactConfig,
  contentConfigIsCollectionItemManagerConfig,
  contentConfigIsDFAlertConfig,
  contentConfigIsInfoDisplayConfig,
  contentConfigIsInternalLinkConfig,
  contentConfigIsConditionalListConfig,
  contentConfigIsScreenButtonConfig,
  contentConfigIsCollectionDataViewInternalLinkConfig,
  contentConfigIsIconDisplayConfig,
  contentConfigIsDataPreviewConfig,
  contentConfigIsCollectionDataPreviewConfig,
} from '../flow/ContentDeclarations.js';

import { scrollToRef } from '../misc/misc.js';
import { ERROR_SUMMARY_ID } from './ScreenAlertAggregator/ScreenAlertAggregator.js';
import { CollectionFactory, ConcretePath, FactGraph } from '@irs/js-factgraph-scala';
import { MutableRefObject, createRef, useCallback, useContext, useMemo } from 'react';
import { useFilterContentContext } from '../context/FilterContentContext.js';
import { SubmissionStatusContext } from '../context/SubmissionStatusContext/SubmissionStatusContext.js';
import { useFactGraph } from '../factgraph/FactGraphContext.js';
import { conditionsPass } from '../utils/condition.js';
import { isRelevantMefAlert } from '../misc/aggregatedAlertHelpers.js';
import { SetFactActionConfig } from '../flow/ScreenConfig.js';
import { Path } from '../flow/Path.js';

export type ScreenContentComponentName = ScreenContentConfig[`componentName`];

export const HEADER_COMPONENT_NAMES = [
  `IconDisplay`,
  `ContextHeading`,
  `Heading`,
] satisfies ScreenContentComponentName[];
export type HeaderComponentName = (typeof HEADER_COMPONENT_NAMES)[number];

export const AGGREGATED_ALERT_COMPONENT_NAMES = [`MefAlert`, `TaxReturnAlert`] satisfies ScreenContentComponentName[];
export type AggregatedAlertComponentName = (typeof AGGREGATED_ALERT_COMPONENT_NAMES)[number];

/**
 * Find and focus the error summary box or any invalid inputs.
 *
 * Used with Continue buttons to highlight why the tax filer cannot move forward.
 */
export const focusOnErrorOrSummary = () => {
  const el = document.querySelector(`input:invalid,textarea:invalid,select:invalid,[id='${ERROR_SUMMARY_ID}']`);
  const id = el?.id || ``;
  scrollToRef(document.getElementById(id));
};

export function conditionsAsKeySuffix({ props: { condition, conditions } }: ScreenContentConfig) {
  const normalizedConditions = condition === undefined ? conditions ?? [] : [condition];

  return normalizedConditions
    .map((condition: any) =>
      typeof condition === `string` ? condition : `${condition.operator ?? `isTrue`}:${condition.condition}`
    )
    .join(`-`);
}

export function buildRenderedScreenContentKey(config: ScreenContentConfig) {
  const conditionSuffix = conditionsAsKeySuffix(config);

  if (contentConfigIsFactConfig(config)) {
    return `${config.props.path}-${conditionSuffix}-${config.props.displayOnlyOn}`;
  } else if (contentConfigIsCollectionItemManagerConfig(config)) {
    return `${config.props.loopName}`;
  } else if (contentConfigIsDFAlertConfig(config)) {
    return `${config.props.i18nKey ?? `wrapper`}-${config.componentName}-${config.props.type}-${conditionSuffix}`;
  } else if (
    contentConfigIsInfoDisplayConfig(config) ||
    contentConfigIsInternalLinkConfig(config) ||
    contentConfigIsConditionalListConfig(config) ||
    contentConfigIsScreenButtonConfig(config) ||
    contentConfigIsCollectionDataViewInternalLinkConfig(config)
  ) {
    return `${config.props.i18nKey}-${config.componentName}-${conditionSuffix}`;
  } else if (contentConfigIsDataPreviewConfig(config) || contentConfigIsCollectionDataPreviewConfig(config)) {
    return `${config.componentName}-${conditionSuffix}`;
  } else if (contentConfigIsIconDisplayConfig(config)) {
    return `${config.props.i18nKey ?? config.props.name}-${conditionSuffix}`;
  } else if (config.componentName === `MefAlert`) {
    return `${config.props.mefErrorCode}-${config.props.i18nKey}-${conditionSuffix}`;
  } else if (config.componentName === `TaxReturnAlert`) {
    return `${config.props.i18nKey}-${conditionSuffix}`;
  } else {
    assertNever(config);
  }
}

export function useGetFactRef(factRefs: MutableRefObject<Map<ConcretePath, MutableRefObject<HTMLInputElement>>>) {
  return useCallback(
    (concretePath: ConcretePath) => {
      if (factRefs.current.has(concretePath)) {
        return factRefs.current.get(concretePath) as React.MutableRefObject<HTMLInputElement>;
      } else {
        const ref = createRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
        factRefs.current.set(concretePath, ref);
        return ref;
      }
    },
    [factRefs]
  );
}

export function useScreenInfo(
  screenRoute: string,
  screenContent: ScreenContentConfig[],
  collectionId: string | null,
  componentsToHide: ReadonlySet<ScreenContentComponentName> | undefined
) {
  const { shouldFilterContentBasedOnTaxState } = useFilterContentContext();
  const { submissionStatus } = useContext(SubmissionStatusContext);
  const { factGraph } = useFactGraph();

  const { visibleContent, hasFacts } = useMemo(() => {
    // first we hide any content with hidden components
    const contentWithoutHiddenComponents = screenContent.filter(
      (sc) => !componentsToHide || !componentsToHide.has(sc.componentName)
    );

    let visibleContent;
    if (!shouldFilterContentBasedOnTaxState) {
      // eslint-disable-next-line eqeqeq
      visibleContent = contentWithoutHiddenComponents.filter((sc) => sc.props.displayOnlyOn != `data-view`);
    } else {
      const mefErrorCodes = submissionStatus?.rejectionCodes.map((rc) => rc.MeFErrorCode);
      visibleContent = contentWithoutHiddenComponents.filter((sc) => {
        const isMefAlert = sc.componentName === `MefAlert`;
        return (
          conditionsPass(sc.props, factGraph, collectionId) &&
          // eslint-disable-next-line eqeqeq
          sc.props.displayOnlyOn != `data-view` &&
          (!isMefAlert || (mefErrorCodes && isRelevantMefAlert(mefErrorCodes, sc)))
        );
      });
    }

    return {
      visibleContent,
      hasFacts: visibleContent.some(contentConfigIsFactConfig),
    };
  }, [
    componentsToHide,
    screenContent,
    shouldFilterContentBasedOnTaxState,
    submissionStatus?.rejectionCodes,
    factGraph,
    collectionId,
  ]);

  return {
    screenRoute,
    visibleContent,
    hasFacts,
  };
}

export type ScreenInfo = ReturnType<typeof useScreenInfo>;

export const setFactsFromFactActionPaths = (
  factGraph: FactGraph,
  collectionId: string | null,
  setFactActionPaths: SetFactActionConfig[]
) => {
  setFactActionPaths
    .filter((action) => conditionsPass(action, factGraph, collectionId))
    .forEach(({ path, source }) => {
      if (source !== `df.language`) {
        const targetPath = Path.concretePath(path, collectionId);
        // We should revert this as soon as we can, this is a stopgap fix to resolve an issue in prod
        // https://git.irslabs.org/irslabs-prototypes/direct-file/-/issues/15596
        if (source === `emptyCollection`) {
          const emptyArray = CollectionFactory([]);
          factGraph.set(targetPath, emptyArray);
        } else {
          const sourcePath = Path.concretePath(source, collectionId);
          const maybeValue = factGraph.get(sourcePath);
          if (maybeValue.hasValue) {
            factGraph.set(targetPath, maybeValue.get);
          }
        }
      }
    });
};

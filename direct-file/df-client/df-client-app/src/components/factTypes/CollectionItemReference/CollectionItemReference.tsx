import { forwardRef } from 'react';
import { Radio } from '@trussworks/react-uswds';

import { CollectionItem as CollectionItemValue, CollectionItemReferenceFactory } from '@irs/js-factgraph-scala';
import { FactProps } from '../../../types/core.js';
import useFact from '../../../hooks/useFact.js';
import { useFactControl } from '../../../hooks/useFactControl.js';
import Translation from '../../Translation/index.js';
import { ComplexFormControl } from '../../FormControl/index.js';
import { useFactGraph } from '../../../factgraph/FactGraphContext.js';
import { useCollectionItems } from '../../../hooks/useCollectionItems.js';
import { InterceptingFactGraph } from '../../../factgraph/InterceptingFactGraph.js';

const CollectionItemReference = forwardRef<HTMLInputElement, FactProps>(
  ({ path, onValidData, showFeedback = false, concretePath, collectionId, isValid, readOnly }, ref) => {
    const [fact, setFact, clearFact, isComplete] = useFact<CollectionItemValue>(concretePath);
    const { factGraph } = useFactGraph();

    // Get the collection we are referencing and its items
    const { collectionPath, collectionItems } = useCollectionItems(path, collectionId);

    const setValidity = (isValid: boolean) => {
      onValidData(concretePath, isValid);
    };

    const { onChange } = useFactControl({
      setValidity,
      setFact,
      clearFact,
      isFactRequired: true, // Optional not implemented for CollectionItems
      onError(error) {
        // It should not actually be possible to reach this point
        // TODO: What should we do if we do somehow reach this point?
        throw new Error(`Unexpected error when parsing collection item`, { cause: error });
      },
      factParser: (rawValue: string) => {
        const result = CollectionItemReferenceFactory(
          rawValue,
          collectionPath,
          (factGraph as InterceptingFactGraph).sfgGraph
        );
        return result;
      },
    });

    const showError = showFeedback && !isValid;

    const collectionItemRadios = collectionItems.map((value) => {
      const translationKey = `fields.${path}.item`;
      const fullPath = `${concretePath}/${value}`;
      // This is a little weird and a little bit of a hack. We need to be able to set
      // placeholders for these references so they don't disappear in our collection system,
      // but then we don't want the placeholders to be visible to the user when selecting, say,
      // which filer a W-2 belongs to. So, we only show complete values for which we one we check
      // in the UI
      const defaultChecked = isComplete && value === fact?.idString;
      return (
        <Radio
          id={fullPath}
          inputRef={ref}
          radioGroup={path}
          name={path}
          label={<Translation i18nKey={translationKey} collectionId={value} />}
          value={value}
          onChange={(event: any) => onChange(event.target.value)}
          defaultChecked={defaultChecked}
          required
          key={fullPath}
          // eslint-disable-next-line eqeqeq
          disabled={readOnly == true}
        />
      );
    });

    return (
      <ComplexFormControl
        path={path}
        concretePath={concretePath}
        showError={showError}
        labelledBy={`heading`}
        errorMessage={<Translation i18nKey={`enums.messages.requiredField`} collectionId={collectionId} />}
      >
        {collectionItemRadios}
      </ComplexFormControl>
    );
  }
);

CollectionItemReference.displayName = `CollectionItemReference`;

export default CollectionItemReference;

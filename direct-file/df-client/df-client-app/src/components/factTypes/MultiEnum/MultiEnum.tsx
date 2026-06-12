import { forwardRef, useState } from 'react';
import { Checkbox } from '@trussworks/react-uswds';
import { MultiEnumProps } from '../../../types/core.js';
import { useEnumOptions } from '../../../hooks/useEnumOptions.js';
import useFact from '../../../hooks/useFact.js';
import {
  MultiEnum as MultiEnumValue,
  MultiEnumFactory,
  scalaSetToJsSet,
  jsSetToScalaSet,
} from '@irs/js-factgraph-scala';
import { useFactControl } from '../../../hooks/useFactControl.js';
import { ComplexFormControl } from '../../FormControl/index.js';
import Translation from '../../Translation/index.js';
import DFAlert from '../../Alert/DFAlert.js';

const convertNullableMultiEnumFact = (fact: MultiEnumValue | undefined) => {
  if (fact === undefined) {
    return new Set<string>();
  }
  return scalaSetToJsSet(fact.getValue());
};

const MultiEnum = forwardRef<HTMLInputElement, MultiEnumProps>(
  ({
    path,
    collectionId,
    concretePath,
    onValidData,
    labelledBy = `legend`,
    required = true,
    showFeedback = true,
    isValid,
    i18nKeySuffixContext,
  }) => {
    const [fact, setFact, clearFact] = useFact<MultiEnumValue>(concretePath);
    const [selectedValues, setSelectedValues] = useState<Set<string>>(convertNullableMultiEnumFact(fact));
    const { optionsPath, values: optionsValues } = useEnumOptions(path, collectionId);

    const setValidity = (isValid: boolean) => {
      onValidData(concretePath, isValid);
    };

    const sanitize = (value: Set<string>) => ({ value, isEmpty: !value || value.size === 0 });
    const { onChange } = useFactControl({
      setValidity,
      setFact,
      clearFact,
      sanitize,
      isFactRequired: required,
      onError(error) {
        // It should not actually be possible to reach this point
        throw new Error(`Unexpected error when parsing multi-enum`, { cause: error });
      },
      factParser: (rawValue: Set<string>) => MultiEnumFactory(jsSetToScalaSet(rawValue), optionsPath),
    });

    const showError = showFeedback && !isValid;

    const handleValueChange = (value: string) => {
      const updatedValues = new Set(selectedValues);
      updatedValues.has(value) ? updatedValues.delete(value) : updatedValues.add(value);
      setSelectedValues(updatedValues);
      onChange(updatedValues);
    };

    if (!optionsValues || optionsValues.length === 0) {
      return (
        <DFAlert
          type='error'
          i18nKey='enums.errorMessages.IncompleteData'
          headingLevel='h3'
          collectionId={collectionId}
        />
      );
    }

    const commonOptionValues = optionsValues.map((value) => {
      const translationKey = `fields.${optionsPath}.${value}`;
      const maybeCustomTranslationKey = i18nKeySuffixContext
        ? `fields.${path}.${optionsPath}.${i18nKeySuffixContext}.${value}`
        : `fields.${path}.${optionsPath}.${value}`;
      return {
        translationKey,
        maybeCustomTranslationKey,
        value,
      };
    });

    return (
      <ComplexFormControl
        path={path}
        concretePath={concretePath}
        labelledBy={labelledBy}
        showError={showError}
        errorMessage={<Translation i18nKey={`enums.messages.requiredField`} collectionId={collectionId} />}
        required={required}
      >
        {commonOptionValues.map(({ value, translationKey, maybeCustomTranslationKey }) => (
          <Checkbox
            key={`${path}/${value}`}
            id={`${path}/${value}`}
            label={<Translation i18nKey={[maybeCustomTranslationKey, translationKey]} collectionId={collectionId} />}
            name={path}
            value={value}
            checked={selectedValues.has(value)}
            onChange={(event: any) => handleValueChange(event.target.value)}
          />
        ))}
      </ComplexFormControl>
    );
  }
);

MultiEnum.displayName = `MultiEnum`;

export default MultiEnum;

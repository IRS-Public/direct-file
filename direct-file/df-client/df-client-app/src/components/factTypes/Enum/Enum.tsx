import { forwardRef, useState } from 'react';
import { Radio, Select } from '@trussworks/react-uswds';
import { EnumFactory, Enum as EnumValue } from '@irs/js-factgraph-scala';

import { EnumFactProps } from '../../../types/core.js';
import useFact from '../../../hooks/useFact.js';
import { useTranslation } from 'react-i18next';
import { useFactControl } from '../../../hooks/useFactControl.js';
import { useEnumOptions } from '../../../hooks/useEnumOptions.js';
import Translation from '../../Translation/index.js';
import { ComplexFormControl, buildFormControlId } from '../../FormControl/index.js';
import DFAlert from '../../Alert/DFAlert.js';

const Enum = forwardRef<HTMLInputElement, EnumFactProps>(
  (
    {
      path,
      onValidData,
      showFeedback = false,
      concretePath,
      collectionId,
      isValid,
      labelledBy,
      renderAs,
      required = true,
      i18nKeySuffixContext,
      readOnly,
      autoComplete,
    },
    ref
  ) => {
    const [fact, setFact, clearFact] = useFact<EnumValue>(concretePath);
    const [selectedValue, setSelectedValue] = useState(fact?.getValue() ?? ``);

    const { optionsPath, values } = useEnumOptions(path, collectionId);

    const setValidity = (isValid: boolean) => {
      onValidData(concretePath, isValid);
    };

    const { t } = useTranslation();

    const { onChange } = useFactControl({
      setValidity,
      setFact,
      clearFact,
      isFactRequired: required,
      sanitize: (rawValue: string) => {
        return { value: rawValue, isEmpty: rawValue === `` };
      },
      onError(error) {
        // It should not actually be possible to reach this point
        throw new Error(`Unexpected error when parsing enum`, { cause: error });
      },
      factParser: (rawValue: string) => EnumFactory(rawValue, optionsPath),
    });

    const handleValueChange = (value: string) => {
      setSelectedValue(value);
      onChange(value);
    };

    const showError = showFeedback && !isValid;

    if (!values || values.length === 0) {
      return (
        <DFAlert
          type='error'
          i18nKey='enums.errorMessages.IncompleteData'
          headingLevel='h3'
          collectionId={collectionId}
        />
      );
    }

    const commonOptionValues = values.map((value) => {
      const translationKey = `fields.${optionsPath}.${value}`;
      const maybeCustomTranslationKey = i18nKeySuffixContext
        ? `fields.${path}.${optionsPath}.${i18nKeySuffixContext}.${value}`
        : `fields.${path}.${optionsPath}.${value}`;
      const fullPath = `${concretePath}/${value}`;
      return {
        translationKey,
        maybeCustomTranslationKey,
        fullPath,
        value,
      };
    });

    let content;

    const shouldRenderAsSelect = renderAs ? renderAs === `select` : values.length > 7;

    if (shouldRenderAsSelect) {
      const controlId = buildFormControlId(concretePath);
      const errorId = showError ? `${controlId}__error-msg` : undefined;
      content = (
        <Select
          id={path}
          name={path}
          validationStatus={showError ? `error` : undefined}
          onChange={(event: any) => handleValueChange(event.target.value)}
          value={selectedValue}
          aria-describedby={errorId}
          required={required}
          disabled={readOnly}
          autoComplete={autoComplete}
        >
          <option value='' disabled={required}>
            {t(`select.select`)}
          </option>
          {commonOptionValues.map(({ value, translationKey, maybeCustomTranslationKey }) => (
            <option key={value} value={value}>
              {<Translation i18nKey={[maybeCustomTranslationKey, translationKey]} collectionId={collectionId} />}
            </option>
          ))}
        </Select>
      );
    } else {
      content = commonOptionValues.map(({ fullPath, value, translationKey, maybeCustomTranslationKey }) => (
        <Radio
          id={fullPath}
          inputRef={ref}
          radioGroup={path}
          name={path}
          label={<Translation i18nKey={[maybeCustomTranslationKey, translationKey]} collectionId={collectionId} />}
          value={value}
          onChange={(event: any) => handleValueChange(event.target.value)}
          defaultChecked={value === fact?.getValue()}
          key={fullPath}
          required
          disabled={readOnly}
          autoComplete={autoComplete}
        />
      ));
    }

    return (
      <ComplexFormControl
        path={path}
        concretePath={concretePath}
        showError={showError}
        errorMessage={<Translation i18nKey={`enums.messages.requiredField`} collectionId={collectionId} />}
        labelledBy={labelledBy ?? `heading`}
        shouldRenderAsSelect={shouldRenderAsSelect}
        required={required}
      >
        {content}
      </ComplexFormControl>
    );
  }
);

Enum.displayName = `Enum`;

export default Enum;

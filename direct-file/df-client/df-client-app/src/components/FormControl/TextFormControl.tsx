import { Dispatch, SetStateAction, useId } from 'react';
import { ConcretePath, JSeither } from '@irs/js-factgraph-scala';
import { FormGroup, InputGroup, InputPrefix, TextInput, InputSuffix } from '@trussworks/react-uswds';
import type { TextInputProps } from './DFTextInput.js';
import { useFactControl } from '../../hooks/useFactControl.js';
import { buildControlErrorId, buildFormControlId, buildHintId, buildHintKey, sanitizeString } from './helpers.js';
import Translation from '../Translation/index.js';
import type { FactLimit } from '../../factgraph/factLimitHelpers.js';
import { useTranslation } from 'react-i18next';
import { I18nKey } from '../Translation/Translation.js';
import { Path } from '../../fact-dictionary/Path.js';
import { DFTextInputMask } from './DFTextInputMask.js';
import { FormFieldWrapperWithConfigurableLabel } from './FormFieldWrapperWithConfigurableLabel.js';
import { FormFieldLabel } from './FormFieldLabel.js';

export type LabelConfig =
  | {
      type: 'config';
      i18nKey: I18nKey;
    }
  | {
      type: 'override';
      element: JSX.Element;
    }
  | undefined;

type SimpleTextFormControlProps = {
  path: Path;
  concretePath: ConcretePath;
  hintKey?: I18nKey;
  errorMessage?: string | JSX.Element;
  mask?: string;
  inputPrefix?: string;
  collectionId: string | null;
  /** Optional override for what to render for the control label */
  labelConfig?: LabelConfig;
  controlIdOverride?: string;
  inputSuffix?: string;
} & Omit<TextInputProps, 'id' | 'name' | 'aria-invalid' | 'validationStatus'>;

/**
 * Provide a wrapper around @trussworks/react-uswds's text input.
 *
 * This component allows some options, like whether to use an input mask
 * to control what a user can enter (see react-uswds documentation) or
 * a privacy mask to hide the contents of fields.
 */
export function SimpleTextFormControl({
  path,
  concretePath,
  hintKey,
  errorMessage,
  mask,
  inputPrefix,
  collectionId,
  required = true,
  readOnly = false,
  labelConfig,
  controlIdOverride,
  inputSuffix,
  ...inputProps
}: SimpleTextFormControlProps) {
  if (mask && (inputPrefix || inputSuffix)) {
    // TODO: Make this a typing error at compile time instead of a runtime error
    throw new TypeError(`Cannot use an input prefix and an input mask at the same time.  Both were provided.`);
  }

  const { i18n } = useTranslation();

  const controlId = (controlIdOverride as ReturnType<typeof buildFormControlId>) ?? buildFormControlId(concretePath);
  const showError = !!errorMessage;

  const hintKeyExists = i18n.exists((hintKey as string) || buildHintKey(path));
  const labelId = useId();
  const labelOverrideKey = labelConfig?.type === `config` ? labelConfig.i18nKey : undefined;

  let label;
  if (labelConfig?.type === `override`) {
    label = labelConfig.element;
  } else {
    const labelKey = labelOverrideKey ?? `fields.${path}.name`;
    label = (
      <FormFieldLabel
        labelKey={labelKey}
        labelId={labelId}
        collectionId={collectionId}
        controlId={controlId}
        showError={showError}
        readonly={readOnly}
        required={required}
      />
    );
  }

  const ids = [];
  if (hintKeyExists) {
    ids.push(buildHintId(controlId));
  }
  if (showError) {
    ids.push(buildControlErrorId(controlId));
  }

  const coreProps: TextInputProps = {
    id: controlId,
    // FactSelect may render multiple text controls with the same path and label
    name: labelOverrideKey ? `field-${controlId}` : path,
    'aria-invalid': showError,
    'aria-describedby': ids.length > 0 ? ids.join(` `) : undefined,
    validationStatus: showError ? `error` : undefined,
    required,
    readOnly,
    ...inputProps,
  };

  return (
    <FormGroup error={showError}>
      <FormFieldWrapperWithConfigurableLabel
        hintId={buildHintId(controlId)}
        path={path}
        hintKey={hintKey}
        controlId={controlId}
        errorMessage={errorMessage}
        showError={showError}
        collectionId={collectionId}
        required={required}
        readonly={readOnly}
        label={label}
      >
        {mask ? (
          <DFTextInputMask mask={mask} {...coreProps} />
        ) : (
          <>
            <InputGroup>
              {inputPrefix && <InputPrefix>{inputPrefix}</InputPrefix>}
              <TextInput {...coreProps} />
              {inputSuffix && <InputSuffix>{inputSuffix}</InputSuffix>}
            </InputGroup>
          </>
        )}
      </FormFieldWrapperWithConfigurableLabel>
    </FormGroup>
  );
}

/**
 * Provide a wrapper around SimpleTextFormControl.
 *
 * This sets the error message, if any, and the onchange handler.
 */
export function TextFormControl<FactValue, FactError>({
  setValidity,
  setFact,
  clearFact,
  onError,
  setInputValue,
  required = true,
  sanitize,
  factParser,
  errorMessage: externalErrorMessage,
  ...formControlProps
}: {
  setValidity: (isValid: boolean) => void;
  setFact: (value: FactValue) => void;
  clearFact: () => void;
  onError: (error: FactError) => void;
  setInputValue?: Dispatch<SetStateAction<string>>;
  sanitize?: (value: string) => { value: string; isEmpty: boolean };
  required?: boolean;
  factParser: (rawValue: string, maxLimit?: FactLimit) => JSeither<FactError, FactValue>;
} & Omit<SimpleTextFormControlProps, 'onError' | 'onChange'>) {
  sanitize = sanitize ? sanitize : sanitizeString;
  const { onChange, rawValue } = useFactControl({
    setValidity,
    setFact,
    clearFact,
    isFactRequired: required,
    setInputValue,
    sanitize,
    onError,
    factParser,
  });

  const errorMessage =
    externalErrorMessage &&
    (!rawValue || sanitize(rawValue).isEmpty ? (
      <Translation i18nKey={`enums.messages.requiredField`} collectionId={null} />
    ) : (
      externalErrorMessage
    ));
  return (
    <SimpleTextFormControl
      errorMessage={errorMessage}
      required={required}
      onChange={(event: any) => onChange(event.target.value)}
      {...formControlProps}
    />
  );
}

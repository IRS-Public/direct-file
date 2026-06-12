import React, { forwardRef, useEffect, useState } from 'react';
import classnames from 'classnames';
import type { TextInputProps } from './DFTextInput.js';
import { DFTextInput } from './DFTextInput.js';

export type AllProps = TextInputProps & {
  mask: string;
  charset?: string;
};

/**
 *
 * The astute observer will note that the output of `strippedWithCursorIndex` is always
 * passed to maskedWithCursorPosition. Each is looping through inputs. Why not combine them?
 *
 * These functions are already extremly complicated to read because they are doing multiple
 * things (pigeons in pigeon holes, keeping track of cursor positions). As I'm writing this,
 * I hardly understand the functions anymore but I do totally understand what they're trying
 * to do:
 *  strippedWithCursorIndex  -> returns a value with the mask stripped (i.e. the raw value) along
 *                              with where in the raw value the cursor was.
 *
 *  maskedWithCursorPosition -> takes a stripped value and applies a mask to it. Returns a cursor
 *                              position based on where the cursor should be "bumped" to given the
 *                              mask.
 */

// Exported for testing
export function strippedWithCursorIndex(valueWithMask: string, cursorPosition: number | null) {
  let stripped = ``;
  let outputCursorPosition = null;
  for (let m = 0; m < valueWithMask.length; m++) {
    if (m === cursorPosition) {
      outputCursorPosition = stripped.length;
    }
    const char = valueWithMask[m];
    if (char.match(/\W/g)) {
      continue;
    } else {
      stripped += char;
    }
  }

  return {
    stripped,
    cursorPosition: outputCursorPosition !== null ? outputCursorPosition : stripped.length,
  };
}

// Exported for testing
export function maskedWithCursorPosition(strippedValue: string, mask: string, strippedCursorPosition: number) {
  let masked = ``;
  let outputCursorPosition = null;
  for (let m = 0, s = 0; m < mask.length; m++) {
    const stripChar = strippedValue[s];
    if (!stripChar) {
      break;
    }
    const maskChar = mask[m];
    if (maskChar === `-`) {
      masked += `-`;
      continue;
    }
    if (s === strippedCursorPosition) {
      outputCursorPosition = masked.length;
    }

    masked += stripChar;
    s++;
  }

  return {
    masked,
    cursorPosition: outputCursorPosition !== null ? outputCursorPosition : masked.length,
  };
}

function normalized(valueWithMask: string, mask: string) {
  const { stripped, cursorPosition } = strippedWithCursorIndex(valueWithMask, null);
  return maskedWithCursorPosition(stripped, mask, cursorPosition).masked;
}

export const DFTextInputMask = forwardRef<HTMLInputElement, AllProps>(
  (
    { id, className, mask, value: externalValue, defaultValue, onChange, ...inputProps }: AllProps,
    ref
  ): React.ReactElement => {
    const classes = classnames(
      {
        'usa-masked': mask,
      },
      className
    );

    const [value, setValue] = useState(
      // Ensure that this component preserves the expected behavior when a user sets the defaultValue
      normalized((externalValue ?? defaultValue ?? ``) as string, mask)
    );

    useEffect(() => {
      // Make sure this component behaves correctly when used as a controlled component
      setValue(normalized((externalValue ?? defaultValue ?? ``) as string, mask));
    }, [externalValue, defaultValue, mask]);

    const [maskValue, setMaskValue] = useState(mask.substring(value.length));
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      const { stripped, cursorPosition } = strippedWithCursorIndex(e.target.value, e.target.selectionEnd);
      const { masked, cursorPosition: finalCursorPosition } = maskedWithCursorPosition(stripped, mask, cursorPosition);

      setMaskValue(mask.substring(masked.length));
      setValue(masked);

      // Ensure the new value is available to upstream onChange listeners
      e.target.value = masked;
      onChange?.(e);
      e.target.setSelectionRange(finalCursorPosition, finalCursorPosition);
    };
    return (
      <span className='usa-input-mask'>
        <span className='usa-input-mask--content' aria-hidden data-testid={`${id}Mask`}>
          <i>{value}</i>
          {maskValue}
        </span>
        <DFTextInput
          inputRef={ref}
          data-testid='textInput'
          className={classes}
          id={id}
          maxLength={mask.length}
          onChange={handleChange}
          value={value}
          {...inputProps}
        />
      </span>
    );
  }
);

DFTextInputMask.displayName = `DFTextInputMask`;

export default DFTextInputMask;

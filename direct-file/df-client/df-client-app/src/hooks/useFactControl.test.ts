import { JSeither } from '@irs/js-factgraph-scala';
import { useFactControl, UseFactControlParameters } from './useFactControl.js';
import { EitherL, EitherR } from '@irs/js-factgraph-scala/src/typings/utils/JSEither.js';
import { Dispatch, SetStateAction } from 'react';
import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';

type TestError = string;
type TestRawValue = { isValid: true } | { isValid: false; error: TestError };
type TestFactValue = object;

function wrapEither(either: EitherL<TestError> | EitherR<TestFactValue>): JSeither<TestError, TestFactValue> {
  return {
    ...either,
    mapLeftRight(onInvalid: (error: TestError) => void, onValid: (value: TestFactValue) => void) {
      if (this.isLeft) onInvalid(this.left);
      else if (this.isRight) onValid(this.right);
    },
  } as JSeither<TestError, TestFactValue>;
}

function makeLeft(error: TestError): JSeither<TestError, TestFactValue> {
  return wrapEither({ isLeft: true, left: error });
}

function makeRight(result: TestFactValue): JSeither<TestError, TestFactValue> {
  return wrapEither({ isRight: true, right: result });
}

const getIsFactRequired = vi.fn(() => false);
const getSanitize = vi.fn(
  (): ((rawValue: TestRawValue) => { value: TestRawValue; isEmpty: boolean }) | undefined => undefined
);
const getSetInputValue = vi.fn((): Dispatch<SetStateAction<TestRawValue>> | undefined => undefined);

const parameters = {
  setValidity: vi.fn(),
  setFact: vi.fn(),
  clearFact: vi.fn(),
  onError: vi.fn(),
  factParser: vi.fn(
    (rawValue): JSeither<TestError, TestFactValue> =>
      rawValue.isValid ? makeRight({ rawValue }) : makeLeft(rawValue.error)
  ),
  get isFactRequired() {
    return getIsFactRequired();
  },
  get sanitize() {
    return getSanitize();
  },
  get setInputValue() {
    return getSetInputValue();
  },
} satisfies UseFactControlParameters<TestFactValue, TestError, TestRawValue>;

describe(useFactControl.name, () => {
  it(`intializes correctly`, () => {
    const {
      result: {
        current: { onChange, rawValue },
      },
    } = renderHook(() => useFactControl(parameters));

    expect(rawValue).toBeUndefined();
    expect(typeof onChange).toBe(`function`);
  });

  describe(`when onChange is called with a blank value`, () => {
    describe.each([
      { description: `a required fact`, required: true, expectedValidity: false },
      { description: `an optional fact`, required: false, expectedValidity: true },
    ])(`for $description`, ({ required, expectedValidity }) => {
      it(`correctly sets the validity and updates fact states`, () => {
        getIsFactRequired.mockReturnValue(required);
        getSanitize.mockReturnValue((value) => ({ value, isEmpty: true }));

        const {
          result: {
            current: { onChange },
          },
        } = renderHook(() => useFactControl(parameters));

        onChange({} as TestRawValue);

        // Call these
        expect(parameters.setValidity).toBeCalledWith(expectedValidity);
        expect(parameters.clearFact).toBeCalled();

        // Don't call these
        expect(parameters.setFact).not.toBeCalled();
        expect(parameters.onError).not.toBeCalled();
        expect(parameters.factParser).not.toBeCalled();
      });
    });
  });

  describe.each([
    {
      description: `an invalid value`,
      rawValue: { isValid: false, error: `fake error` } satisfies TestRawValue,
      expectedValidity: false,
    },
    { description: `a valid value`, rawValue: { isValid: true } satisfies TestRawValue, expectedValidity: true },
  ])(`when onChange is called with $description`, ({ rawValue, expectedValidity }) => {
    it(`correctly sets the validity and updates fact states`, () => {
      getIsFactRequired.mockReturnValue(true);

      const {
        result: {
          current: { onChange },
        },
      } = renderHook(() => useFactControl(parameters));

      onChange(rawValue);

      // Call these
      expect(parameters.setValidity).toBeCalledWith(expectedValidity);
      expect(parameters.factParser).toBeCalledWith(rawValue);

      if (expectedValidity) {
        // Also call these
        expect(parameters.setFact).toBeCalled();

        // Don't call these
        expect(parameters.onError).not.toBeCalled();
      } else {
        // Also call these
        expect(parameters.onError).toBeCalled();

        // Don't call these
        expect(parameters.setFact).not.toBeCalled();
      }

      // Don't call these
      expect(parameters.clearFact).not.toBeCalled();
    });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });
});

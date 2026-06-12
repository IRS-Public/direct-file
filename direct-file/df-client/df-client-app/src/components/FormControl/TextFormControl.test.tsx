import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { TextFormControl } from './TextFormControl.js';
import { ConcretePath, JSEitherL, JSEitherR, JSeither } from '@irs/js-factgraph-scala';
import { Path } from '../../fact-dictionary/Path.js';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    t: vi.fn((i18nKey) => i18nKey),
  };
});
vi.mock(`react-i18next`, () => ({
  useTranslation: () => {
    return {
      t: mocks.t,
      i18n: {
        exists: (key: string) => !!mocks.t(key),
      },
    };
  },
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{mocks.t(i18nKey)}</>,
}));

function resultBuilder<V, E>({ value, error }: { value?: V; error?: E }): JSeither<E, V> {
  type ValueHandler = (_: V) => void;
  type ErrorHandler = (_: E) => void;
  return (value
    ? ({
        isRight: true,
        right: value,
        mapLeftRight(_: ErrorHandler, onValid: ValueHandler) {
          onValid(value as V);
        },
      } as JSEitherR<V>)
    : ({
        isLeft: true,
        left: error,
        mapLeftRight(onInvalid: ErrorHandler, _: ValueHandler) {
          onInvalid(error as E);
        },
      } as JSEitherL<E>)) as unknown as JSeither<E, V>;
}

const sharedProps = {
  path: `/fake/path` as Path,
  concretePath: `/fake/concrete-path` as unknown as ConcretePath,
  setValidity: vi.fn(),
  setFact: vi.fn(),
  clearFact: vi.fn(),
  required: true,
  onError: vi.fn(),
  factParser: vi.fn(),
  collectionId: null,
  type: `text`,
} as React.ComponentProps<typeof TextFormControl>;

describe(`TextFormControl`, () => {
  it(`renders without errrors`, () => {
    const translatedLabel = `TRANSLATED LABEL`;
    mocks.t.mockImplementation(() => translatedLabel);
    render(<TextFormControl {...sharedProps} />);
  });

  it(`propagates valid change events`, () => {
    const factParser = vi.fn((value): JSeither<unknown, unknown> => {
      return resultBuilder({ value });
    });

    render(<TextFormControl {...sharedProps} factParser={factParser} />);

    const value = `123`;
    const input = screen.getByRole(`textbox`);
    fireEvent.change(input, { target: { value } });

    expect(factParser).toBeCalledWith(value);
  });

  it(`propagates invalid change events`, () => {
    const error = new Error(`I am an error`);
    const factParser = vi.fn((_): JSeither<unknown, unknown> => {
      return resultBuilder({ error });
    });

    render(<TextFormControl {...sharedProps} factParser={factParser} />);

    const value = `123`;
    const input = screen.getByRole(`textbox`);
    fireEvent.change(input, { target: { value } });

    expect(sharedProps.onError).toBeCalledWith(error);
  });

  it(`displays required message if invalid and blank`, () => {
    const errorMessage = `Something went wrong`;

    const { getByText, queryByText } = render(<TextFormControl {...sharedProps} errorMessage={errorMessage} />);

    const providedError = queryByText(errorMessage);
    expect(providedError).not.toBeInTheDocument();

    const requiredError = getByText(mocks.t(`enums.messages.requiredField`));
    expect(requiredError).toBeInTheDocument();
  });

  it(`doesn't error if optional and blank`, () => {
    const factParser = vi.fn((value): JSeither<unknown, unknown> => {
      return resultBuilder({ value });
    });

    const errorMessage = `Something went wrong`;

    const { queryByText } = render(<TextFormControl {...sharedProps} required={false} factParser={factParser} />);

    // Set and clear a field
    const value = `abc`;
    const input = screen.getByRole(`textbox`);
    fireEvent.change(input, { target: { value } });
    userEvent.clear(input);

    // Expect no errors, and clearFact to be called
    expect(factParser).toBeCalledWith(value);
    expect(sharedProps.clearFact).toBeCalled();

    const providedError = queryByText(errorMessage);
    expect(providedError).not.toBeInTheDocument();

    const requiredError = queryByText(mocks.t(`enums.messages.requiredField`));
    expect(requiredError).not.toBeInTheDocument();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});

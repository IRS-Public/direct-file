import { i18n, renderWithTranslationProvider as render } from '../../test/test-utils.js';
import { vi } from 'vitest';

import CertifyCheckbox from './CertifyCheckbox.js';

const testNs = {
  fields: {
    bar: {
      name: `test name`,
      errorMessages: {
        RequiredField: `test error message - required field `,
      },
    },
  },
};
i18n.addResourceBundle(`en`, `test`, testNs, true, true);
const translationNs = {
  fields: {
    bar: {
      name: `test name`,
      label: `test label`,
      errorMessages: {
        RequiredField: `test error message - required field `,
      },
    },
  },
};
i18n.addResourceBundle(`en`, `translation`, translationNs, true, true);

describe(`CertifyCheckbox component`, () => {
  test(`renders without errors`, () => {
    const { getByRole } = render(
      <CertifyCheckbox showFeedback={false} collectionId='foo' i18nKey={`bar`} gotoNextScreen={vi.fn()} />
    );

    expect(getByRole(`checkbox`)).toBeInTheDocument();
  });

  test(`renders with error message`, () => {
    const { getByRole, getByTestId } = render(
      <CertifyCheckbox showFeedback={true} collectionId='foo' i18nKey={`bar`} gotoNextScreen={vi.fn()} />
    );

    const errorMessage = getByTestId(`errorMessage`);
    expect(errorMessage).toBeInTheDocument();
    const checkbox = getByRole(`checkbox`);
    expect(checkbox).toBeInTheDocument();
  });
});

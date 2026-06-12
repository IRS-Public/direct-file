import { PropsWithoutRef, ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import IntroContent from './IntroContent.js';
import { initI18n } from '../../i18n.js';
import { vi } from 'vitest';

vi.mock(`../../hooks/useTranslationContextFromFacts`, () => ({
  default: () => {
    return () => {
      const context = {
        '/yumThing': `Icecream`,
      };
      return context;
    };
  },
}));

const i18next = await initI18n();
i18next.addResourceBundle(`test`, `translation`, {
  info: {
    '/info/path/to/testAllowedTags': {
      body: [
        {
          h1: `Summer is a great time for sweet things.`,
        },
        {
          p: `this is a paragraph`,
        },
        {
          ol: [
            {
              li: [
                {
                  p: `A yummy thing is {{/yumThing}}`,
                },
              ],
            },
          ],
        },
        {
          h2: `Winter is a great time for spice`,
        },
        {
          ul: {
            li: { p: `this is great` },
          },
        },
      ],
    },
  },
});

// eslint-disable-next-line import/no-named-as-default-member
i18next.changeLanguage(`test`);

const sharedProps = {
  gotoNextScreen: () => {},
} as ComponentProps<typeof IntroContent>;

describe(`IntroContent`, () => {
  function renderIntroContent(overrides: Partial<PropsWithoutRef<typeof IntroContent>> = {}) {
    return render(<IntroContent {...{ ...sharedProps, ...overrides }} />);
  }
  it(`renders only allowed tags`, () => {
    // IntroContent is hardcoded to allow only p, ul and li.
    // Therefore, we expect headings to not render.
    const i18nKey = `/info/path/to/testAllowedTags`;

    renderIntroContent({ i18nKey });

    const pElement = screen.getByText(/this is a paragraph/);
    expect(pElement).toBeInTheDocument();

    const hElements = screen.queryByRole(`heading`);
    expect(hElements).toBeNull();

    const ulElements = screen.getAllByRole(`list`);
    expect(ulElements).toHaveLength(2);

    const liElements = screen.getAllByRole(`listitem`);
    expect(liElements).toHaveLength(2);
  });
});

import { render, screen } from '@testing-library/react';

import { initI18n } from '../../i18n.js';
import ContentDisplay from './ContentDisplay.js';
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
    '/info/path/to/testGeneration': {
      body: [
        {
          p: `Summer is a great time for sweet things.`,
        },
        {
          ol: [
            {
              li: [
                {
                  p: `A yummy thing is {{/yumThing}}`,
                },
                {
                  p: `It's made from cream and sugar.`,
                },
              ],
            },
            {
              li: [
                {
                  p: `Another could be lemonade`,
                },
                {
                  p: `It's made from lemons and sugar`,
                },
              ],
            },
          ],
        },
        {
          p: `That was a great list`,
        },
      ],
    },
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
    '/info/path/to/testTaglessStrings': {
      body: [
        {
          h1: `Summer is a great time for sweet things.`,
        },
        `this is a paragraph`,
        `this is a second paragraph`,
        {
          ol: [
            {
              li: `A yummy thing is {{/yumThing}}`,
            },
          ],
        },
        {
          h2: `Winter is a great time for spice`,
        },
        {
          ul: {
            li: [`this is great`, `this is even better`],
          },
        },
      ],
    },
  },
});

i18next.changeLanguage(`test`);

describe(`ContentDisplay`, () => {
  function renderContentDisplay(overrides: React.ComponentProps<typeof ContentDisplay>) {
    return render(<ContentDisplay {...overrides} />);
  }
  it(`renders `, () => {
    const i18nKey = `/info/path/to/testGeneration`;

    renderContentDisplay({ i18nKey });

    const pElement = screen.getByText(/Summer is a great time/);
    expect(pElement).toBeInTheDocument();

    const ulElement = screen.getByRole(`list`);
    expect(ulElement).toBeInTheDocument();

    const liElement = screen.getAllByRole(`listitem`);
    expect(liElement[0]).toBeInTheDocument();

    expect(liElement[0].innerText).toContain(`Icecream`);
    expect(liElement[0].innerText).toContain(`cream and sugar`);
  });

  it(`does not render disallowed tags`, () => {
    const i18nKey = `/info/path/to/testAllowedTags`;
    const allowedTags = [`p`];

    renderContentDisplay({ i18nKey, allowedTags });

    const pElement = screen.getByText(/this is a paragraph/);
    expect(pElement).toBeInTheDocument();

    const ulElements = screen.queryByRole(`list`);
    expect(ulElements).toBeNull();

    const liElements = screen.queryByRole(`listitem`);
    expect(liElements).toBeNull();
  });
  it(`renders allowed tags`, () => {
    const i18nKey = `/info/path/to/testAllowedTags`;
    const allowedTags = [`p`, `ol`, `ul`, `li`, `h1`, `h2`];

    renderContentDisplay({ i18nKey, allowedTags });

    const pElement = screen.getByText(/this is a paragraph/);
    expect(pElement).toBeInTheDocument();

    const hElements = screen.getAllByRole(`heading`);
    expect(hElements).toHaveLength(2);

    const ulElements = screen.getAllByRole(`list`);
    expect(ulElements).toHaveLength(2);

    const liElements = screen.getAllByRole(`listitem`);
    expect(liElements).toHaveLength(2);
  });
  it(`renders tagless strings`, () => {
    const i18nKey = `/info/path/to/testTaglessStrings`;
    const allowedTags = [`p`, `ol`, `ul`, `li`, `h1`, `h2`];

    renderContentDisplay({ i18nKey, allowedTags });

    const pElement = screen.getByText(/this is a paragraph/);
    expect(pElement).toBeInTheDocument();

    const hElements = screen.getAllByRole(`heading`);
    expect(hElements).toHaveLength(2);

    const ulElements = screen.getAllByRole(`list`);
    expect(ulElements).toHaveLength(2);

    const liElements = screen.getAllByRole(`listitem`);
    expect(liElements).toHaveLength(2);

    expect(liElements[0]).toBeInTheDocument();
    expect(liElements[0].innerText).toContain(`Icecream`);
  });
  it(`renders with custom tags`, () => {
    const i18nKey = `/info/path/to/testGeneration`;
    const additionalComponents = { p: <p className='test-class' /> };

    renderContentDisplay({ i18nKey, additionalComponents });
    const pElement = screen.getByText(/Summer is a great time/);
    expect(pElement).toHaveClass(`test-class`);
  });
});

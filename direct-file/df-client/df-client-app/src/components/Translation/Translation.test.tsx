import { render, screen } from '@testing-library/react';

import Translation from './Translation.js';
import { initI18n } from '../../i18n.js';
import { vi } from 'vitest';

vi.mock(`../../hooks/useTranslationContextFromFacts`, () => ({
  default: () => {
    return () => {
      const context = {
        '/maritalStatus': `Single With Cats`,
        '/yumThing': `Icecream`,
        '/yumThing2': `Cotton Candy`,
        '/icecreamDefined': `Delicious`,
        '/yumLink': `https://gelato.example.com`,
      };
      return context;
    };
  },
}));

// We are not mocking i18next here so that we can properly
// test interactions between our Translation component and Trans,
// especially proper resolving of all allowed tags.
const i18next = await initI18n();
i18next.addResourceBundle(`test`, `translation`, {
  info: {
    '/info/path/to/testSimple': {
      body: `Que bueno!`,
    },
    '/info/path/to/testFact': {
      body: `Your marital status is {{/maritalStatus}}`,
    },
    '/info/path/to/testSimpleFormat': {
      body: `<strong>Tiramisu</strong> is <italic>the best dessert</italic>.`,
    },
    '/info/path/to/testListItem': {
      body: `A list of yummy things <ul><li>{{/yumThing}}</li></ul>`,
    },
    '/info/path/to/testOrderedListItem': {
      body: `Another list <ol><li>{{/yumThing2}}</li></ol>`,
    },
    '/info/path/to/testLink': {
      helpText: {
        helpLink: {
          text: `Best <Link1>icecream</Link1>`,
          urls: {
            Link1: `https://gelato.example.com`,
          },
        },
        body: `Yay Icecream!`,
      },
    },
  },
});
// eslint-disable-next-line import/no-named-as-default-member
i18next.changeLanguage(`test`);

// Trans doesn't return what you think it will - maybe the
// Context needs to be set
describe(`Translation`, () => {
  it(`renders `, () => {
    const path = `/info/path/to/testSimple`;
    const i18nKey = `info.${path}.body`;
    render(<Translation i18nKey={i18nKey} collectionId={null} />);

    const enTranslation = screen.getByText(/Que bueno!/);
    expect(enTranslation).toBeInTheDocument();
  });

  it(`renders with a fact`, () => {
    const path = `/info/path/to/testFact`;
    const i18nKey = `info.${path}.body`;
    render(<Translation i18nKey={i18nKey} collectionId={null} />);

    const enTranslation = screen.getByText(/Your marital status is Single With Cats/);
    expect(enTranslation).toBeInTheDocument();
  });

  it(`renders formatting`, () => {
    const path = `/info/path/to/testSimpleFormat`;
    const i18nKey = `info.${path}.body`;
    render(
      <div title='testDiv'>
        <Translation i18nKey={i18nKey} collectionId={null} />
      </div>
    );

    const wrapDiv = screen.getByTitle(`testDiv`);
    expect(wrapDiv).toBeInTheDocument();
    expect(wrapDiv).toContainHTML(`<strong>Tiramisu</strong>`);
    expect(wrapDiv).toContainHTML(`<i>the best dessert</i>`);
  });

  it(`renders list items`, () => {
    const path = `/info/path/to/testListItem`;
    const i18nKey = `info.${path}.body`;
    render(<Translation i18nKey={i18nKey} collectionId={null} />);

    const ulElement = screen.getByRole(`list`);
    expect(ulElement).toBeInTheDocument();
    const liElement = screen.getByRole(`listitem`);
    expect(liElement).toBeInTheDocument();
    expect(liElement.innerText).toBe(`Icecream`);
  });

  it(`renders ordered list items`, () => {
    const path = `/info/path/to/testOrderedListItem`;
    const i18nKey = `info.${path}.body`;
    render(<Translation i18nKey={i18nKey} collectionId={null} />);
    const ulElement = screen.getByRole(`list`);
    expect(ulElement).toBeInTheDocument();
    const liElement = screen.getByRole(`listitem`);
    expect(liElement).toBeInTheDocument();
    expect(liElement.innerText).toBe(`Cotton Candy`);
  });

  it(`renders links`, () => {
    const path = `/info/path/to/testLink`;
    const i18nKey = `info.${path}.helpText.helpLink`;
    render(<Translation i18nKey={i18nKey} collectionId={null} />);
    const termElement = screen.getByRole(`link`);
    expect(termElement).toBeInTheDocument();
    expect(termElement.innerText).toBe(`icecream`);
    expect(termElement).toHaveAttribute(`href`, `https://gelato.example.com`);
  });
});

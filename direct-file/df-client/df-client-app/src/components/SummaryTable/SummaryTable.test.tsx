import { screen, render } from '@testing-library/react';
import { initI18n } from '../../i18n.js';
import mockEnYaml from '../../locales/en.yaml';
import { SummaryTable } from './SummaryTable.js';
import { getByTextWithTags } from '../../utils/test-utils.js';
import { vi } from 'vitest';

const i18next = await initI18n();
i18next.addResourceBundle(`test`, `translation`, mockEnYaml);
i18next.changeLanguage(`test`);

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

const key = `/info/your-taxes/amount/tax-amount-explanation-adjustments`;
const items = [
  {
    itemKey: `header`,
  },
  {
    itemKey: `adjustmentsSubheader`,
  },
  {
    itemKey: `hsaDeductions`,
  },
  {
    itemKey: `educatorAdjustments`,
  },
  {
    itemKey: `studentLoanDeduction`,
  },
  {
    itemKey: `agi`,
  },
  {
    itemKey: `standardDeduction`,
  },
  {
    itemKey: `taxableIncome`,
  },
];

describe(`Summary Table`, () => {
  beforeEach(() => {
    render(<SummaryTable collectionId={null} i18nKey={key} items={items} />);
  });
  it(`renders a populated table`, () => {
    expect(screen.getByText(`Educator expense deduction`)).toBeInTheDocument();
  });

  it(`contains the expected table text`, () => {
    expect(screen.getByText(mockEnYaml.info[key].sections.explainer)).toBeInTheDocument();
  });

  // "What are adjustments?" modal
  it(`renders the "Adjustments" modal with the correct header`, () => {
    expect(screen.getByRole(`heading`, { name: /What are adjustments?/i })).toBeInTheDocument();
  });

  it(`contains the expected text in the "Adjustments" modal`, () => {
    const content = mockEnYaml.info[key].sections.adjustmentsSubheader.helpText.modals.LinkModal1.body[0].p;
    const window = new Window();
    window.document.body.innerHTML = content;
    const updatedContent = window.document.body.innerText;
    expect(getByTextWithTags(updatedContent)).toBeInTheDocument();
  });

  // "What is the Standard Deduction?" modal
  it(`renders the "Standard Deduction" modal with the correct header`, () => {
    expect(screen.getByRole(`heading`, { name: /What is the Standard Deduction?/i })).toBeInTheDocument();
  });

  it(`contains the expected text in the "Standard Deduction" modal`, () => {
    expect(
      screen.getByText(mockEnYaml.info[key].sections.standardDeduction.th.helpText.modals.LinkModal1.body[0].p)
    ).toBeInTheDocument();
  });
});

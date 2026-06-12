import AggregateSummaryAlert, { AggregateSummaryAlertProps } from './AggregateSummaryAlert.js';
import { render, screen } from '@testing-library/react';
import { MutableRefObject } from 'react';
import { vi } from 'vitest';

const { mockT, mockI18n } = vi.hoisted(() => {
  return {
    mockT: (key: string) => key,
    mockI18n: { language: `en`, exists: vi.fn((_key: string) => true) },
  };
});
vi.mock(`react-i18next`, async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: mockT,
      i18n: mockI18n,
    }),
    Trans: ({ i18nKey }: { i18nKey: string }) => mockT(i18nKey),
  };
});

describe(AggregateSummaryAlert.name, () => {
  const defaultProps: AggregateSummaryAlertProps = {
    summaryErrorSections: [],
    summaryWarningSections: [],
    refs: { current: new Map<string, MutableRefObject<HTMLAnchorElement>>() },
    headingLevel: `h2`,
    collectionName: ``,
  };

  const renderAggregateSummaryAlert = (props: AggregateSummaryAlertProps) => {
    render(<AggregateSummaryAlert {...props} />);

    const alert = screen.queryByTestId(`aggregate-summary-alert`);
    const heading = screen.getByRole(`heading`);
    const jumpLinks = screen.getByRole(`list`);

    return {
      alert,
      heading,
      jumpLinks,
    };
  };

  it(`renders as warning type if there are only warnings`, () => {
    const { alert, heading, jumpLinks } = renderAggregateSummaryAlert({
      ...defaultProps,
      summaryWarningSections: [{ i18nKey: `errors.summaryWarnings.someKey`, path: `path/to/screen/with/warning` }],
    });

    expect(alert).toHaveClass(`usa-alert--warning`);
    expect(heading).toHaveTextContent(`aggregateSummaryAlert.warning.heading`);
    expect(jumpLinks.children).toHaveLength(1);
  });

  it(`renders with error type if there are only errors`, () => {
    const { alert, heading, jumpLinks } = renderAggregateSummaryAlert({
      ...defaultProps,
      summaryErrorSections: [
        { i18nKey: `errors.summaryErrors.someKey`, path: `path/to/screen/with/error`, isIncomplete: false },
      ],
    });

    expect(alert).toHaveClass(`usa-alert--error`);
    expect(heading).toHaveTextContent(`aggregateSummaryAlert.error.heading`);
    expect(jumpLinks.children).toHaveLength(1);
  });

  it(`renders as error type if there is even one error`, () => {
    const { alert, heading, jumpLinks } = renderAggregateSummaryAlert({
      ...defaultProps,
      summaryErrorSections: [
        { i18nKey: `errors.summaryErrors.someKey`, path: `path/to/screen/with/error`, isIncomplete: false },
      ],
      summaryWarningSections: [{ i18nKey: `errors.summaryWarnings.someKey`, path: `path/to/screen/with/warning` }],
    });

    expect(alert).toHaveClass(`usa-alert--error`);
    expect(heading).toHaveTextContent(`aggregateSummaryAlert.error.heading`);
    expect(jumpLinks.children).toHaveLength(2);
  });

  it(`renders with incomplete type if there is only one incomplete`, () => {
    const { alert, heading, jumpLinks } = renderAggregateSummaryAlert({
      ...defaultProps,
      summaryErrorSections: [
        { i18nKey: `errors.summaryErrors.someKey`, path: `path/to/screen/with/error`, isIncomplete: true },
      ],
    });

    expect(alert).toHaveClass(`usa-alert--error`);
    expect(heading).toHaveTextContent(`aggregateSummaryAlert.incomplete.heading`);
    expect(jumpLinks.children).toHaveLength(1);
  });

  it(`renders with incomplete type if there are only incompletes`, () => {
    const { alert, heading, jumpLinks } = renderAggregateSummaryAlert({
      ...defaultProps,
      summaryErrorSections: [
        { i18nKey: `errors.summaryErrors.someKey`, path: `path/to/screen/with/error`, isIncomplete: true },
        { i18nKey: `errors.summaryErrors.someOtherKey`, path: `path/to/screen/with/error`, isIncomplete: true },
      ],
    });

    expect(alert).toHaveClass(`usa-alert--error`);
    expect(heading).toHaveTextContent(`aggregateSummaryAlert.incomplete.heading`);
    expect(jumpLinks.children).toHaveLength(1);
  });

  it(`renders with error type if there are both incompletes and errors`, () => {
    const { alert, heading, jumpLinks } = renderAggregateSummaryAlert({
      ...defaultProps,
      summaryErrorSections: [
        { i18nKey: `errors.summaryErrors.someKey`, path: `path/to/screen/with/error`, isIncomplete: true },
        { i18nKey: `errors.summaryErrors.someOtherKey`, path: `path/to/screen/with/error`, isIncomplete: false },
      ],
    });

    expect(alert).toHaveClass(`usa-alert--error`);
    expect(heading).toHaveTextContent(`aggregateSummaryAlert.error.heading`);
    expect(jumpLinks.children).toHaveLength(1);
  });

  it(`renders as error type if there are errors, warnings, and incompletes`, () => {
    const { alert, heading, jumpLinks } = renderAggregateSummaryAlert({
      ...defaultProps,
      summaryErrorSections: [
        { i18nKey: `errors.summaryErrors.someKey`, path: `path/to/screen/with/error`, isIncomplete: false },
        { i18nKey: `errors.summaryErrors.someOtherKey`, path: `path/to/screen/with/error`, isIncomplete: true },
      ],
      summaryWarningSections: [{ i18nKey: `errors.summaryWarnings.someKey`, path: `path/to/screen/with/warning` }],
    });

    expect(alert).toHaveClass(`usa-alert--error`);
    expect(heading).toHaveTextContent(`aggregateSummaryAlert.error.heading`);
    expect(jumpLinks.children).toHaveLength(2);
  });

  it(`renders as incomplete type if there are warnings and incompletes, but no other errors`, () => {
    const { alert, heading, jumpLinks } = renderAggregateSummaryAlert({
      ...defaultProps,
      summaryErrorSections: [
        { i18nKey: `errors.summaryErrors.someKey`, path: `path/to/screen/with/error`, isIncomplete: true },
      ],
      summaryWarningSections: [{ i18nKey: `errors.summaryWarnings.someKey`, path: `path/to/screen/with/warning` }],
    });

    expect(alert).toHaveClass(`usa-alert--error`);
    expect(heading).toHaveTextContent(`aggregateSummaryAlert.incomplete.heading`);
    expect(jumpLinks.children).toHaveLength(2);
  });

  it(`renders only one jump link for sections with multiple alerts`, () => {
    const sectionPath = `path/to/screen/with/alerts`;
    const { alert, heading, jumpLinks } = renderAggregateSummaryAlert({
      ...defaultProps,
      summaryErrorSections: [
        { i18nKey: `errors.summaryErrors.someKey`, path: sectionPath, isIncomplete: false },
        { i18nKey: `errors.summaryErrors.someOtherKey`, path: sectionPath, isIncomplete: false },
      ],
      summaryWarningSections: [
        { i18nKey: `errors.summaryWarnings.someKey`, path: sectionPath },
        { i18nKey: `errors.summaryWarnings.someOtherKey`, path: sectionPath },
      ],
    });

    expect(alert).toHaveClass(`usa-alert--error`);
    expect(heading).toHaveTextContent(`aggregateSummaryAlert.error.heading`);
    expect(jumpLinks.children).toHaveLength(1);
  });
});

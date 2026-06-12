import MefAlert, { MefAlertProps } from './MefAlert.js';
import { render, screen, within } from '@testing-library/react';
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

describe(MefAlert.name, () => {
  const defaultProps: MefAlertProps = {
    mefErrorCode: `IND-181-01`,
    i18nKey: `some-screen-key`,
    type: `warning`,
    collectionId: null,
  };

  beforeEach(() => {
    mockI18n.exists.mockRestore();
  });
  const renderMefAlert = (props: MefAlertProps) => {
    render(<MefAlert {...props} />);

    const alert = screen.getByTestId(`alert`);
    const alertHeading = within(alert).queryByRole(`heading`);

    return {
      alert,
      alertHeading,
    };
  };

  it(`renders without error`, () => {
    const { alert } = renderMefAlert(defaultProps);

    expect(alert).toHaveClass(`usa-alert usa-alert--${defaultProps.type}`);
  });

  it(`renders a default heading when headingKey is not specified`, () => {
    const { alertHeading } = renderMefAlert(defaultProps);

    expect(alertHeading).toBeInTheDocument();
    expect(alertHeading).toHaveTextContent(`mefAlerts.generic.heading.${defaultProps.type}`);
  });

  it(`renders a custom heading when headingKey is specified`, () => {
    const headingI18nKey = `my.custom.heading.key`;
    const { alertHeading } = renderMefAlert({ ...defaultProps, headingI18nKey });

    expect(alertHeading).toBeInTheDocument();
    expect(alertHeading).toHaveTextContent(headingI18nKey);
  });

  it(`doesn't render a heading if being rendered in a custom renderLocation`, () => {
    const { alertHeading } = renderMefAlert({ ...defaultProps, renderLocation: `data-view` });

    expect(alertHeading).not.toBeInTheDocument();
  });

  it(`doesn't render a heading if no heading key exists`, () => {
    mockI18n.exists.mockImplementation((_key: string) => _key !== `mefAlerts.generic.heading.warning`);
    const { alertHeading } = renderMefAlert(defaultProps);

    expect(alertHeading).not.toBeInTheDocument();
  });

  it(`renders default text content for data-views`, () => {
    mockI18n.exists.mockImplementation((_key: string) => !(_key === `mefAlerts.IND-181-01.some-screen-key.data-view`));
    const { alert, alertHeading } = renderMefAlert({ ...defaultProps, renderLocation: `data-view` });

    expect(alertHeading).not.toBeInTheDocument();
    expect(alert).toHaveTextContent(`mefAlerts.generic.data-view.${defaultProps.type}`);
  });

  it(`renders custom text content for data-views if exists`, () => {
    const { alert, alertHeading } = renderMefAlert({ ...defaultProps, renderLocation: `data-view` });

    expect(alertHeading).not.toBeInTheDocument();
    expect(alert).toHaveTextContent(`mefAlerts.${defaultProps.mefErrorCode}.${defaultProps.i18nKey}.data-view`);
  });
});

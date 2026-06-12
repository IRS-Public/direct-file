import SystemAlertAggregator from './SystemAlertAggregator.js';
import {
  getEmptySystemAlertsMap,
  SystemAlertContext,
  SystemAlertContextType,
  SystemAlertKey,
} from '../../context/SystemAlertContext/SystemAlertContext.js';
import { render, screen } from '@testing-library/react';
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

describe(SystemAlertAggregator.name, () => {
  const renderSystemAlertAggregator = (options?: { systemAlertContext: Partial<SystemAlertContextType> }) => {
    render(
      <SystemAlertContext.Provider
        value={{
          systemAlerts: getEmptySystemAlertsMap(),
          setSystemAlert: vi.fn(),
          deleteSystemAlert: vi.fn(),
          ...options?.systemAlertContext,
        }}
      >
        <SystemAlertAggregator />
      </SystemAlertContext.Provider>
    );

    const systemAlerts = screen.queryAllByTestId(`system-alert`);

    return {
      systemAlerts,
    };
  };

  it(`renders nothing without any system alerts in the context`, () => {
    const { systemAlerts } = renderSystemAlertAggregator();

    expect(systemAlerts.length).toEqual(0);
  });

  it(`renders a system alert if present in the context`, () => {
    const systemAlertConfigs = getEmptySystemAlertsMap();
    systemAlertConfigs[SystemAlertKey.SUBMIT] = { alertConfig: { type: `error`, i18nKey: `someKey` }, timestamp: 0 };

    const { systemAlerts } = renderSystemAlertAggregator({
      systemAlertContext: {
        systemAlerts: systemAlertConfigs,
      },
    });

    expect(systemAlerts.length).toEqual(1);

    const systemError = systemAlerts[0];

    expect(systemError).toHaveClass(`usa-alert--error`);
  });

  it(`renders multiple system alerts if present in the context`, () => {
    const systemAlertConfigs = getEmptySystemAlertsMap();
    systemAlertConfigs[`ONE` as SystemAlertKey] = {
      alertConfig: { type: `success`, i18nKey: `oneFish` },
      timestamp: 0,
    };
    systemAlertConfigs[`TWO` as SystemAlertKey] = {
      alertConfig: { type: `warning`, i18nKey: `twoFish` },
      timestamp: 0,
    };
    systemAlertConfigs[`RED` as SystemAlertKey] = {
      alertConfig: { type: `error`, i18nKey: `redFish` },
      timestamp: 0,
    };
    systemAlertConfigs[`BLUE` as SystemAlertKey] = {
      alertConfig: { type: `info`, i18nKey: `blueFish` },
      timestamp: 0,
    };

    const { systemAlerts } = renderSystemAlertAggregator({
      systemAlertContext: {
        systemAlerts: systemAlertConfigs,
      },
    });

    expect(systemAlerts.length).toEqual(4);

    // This test will fail if/when system alerts get rendered by type order. It only passes today because of the current
    // implementation using Map which preserves insertion order for iteration.
    // We only implement system errors today, but might implement the other types in the future
    // When ordering is done intelligently, verify the render order of these alerts via compareDocumentPosition:
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition#return_value
    const systemSuccess = systemAlerts[0];
    const systemWarning = systemAlerts[1];
    const systemError = systemAlerts[2];
    const systemInfo = systemAlerts[3];

    expect(systemSuccess).toHaveClass(`usa-alert--success`);
    expect(systemWarning).toHaveClass(`usa-alert--warning`);
    expect(systemError).toHaveClass(`usa-alert--error`);
    expect(systemInfo).toHaveClass(`usa-alert--info`);
  });
});

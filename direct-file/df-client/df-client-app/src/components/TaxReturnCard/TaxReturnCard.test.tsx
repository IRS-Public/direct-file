import { fireEvent, render, screen } from '@testing-library/react';

import { BrowserRouter } from 'react-router-dom';
import { NetworkConnectionContext } from '../../context/networkConnectionContext.js';
import { mockUseTranslation } from '../../test/mocks/mockFunctions.js';
import * as useApiHook from '../../hooks/useApiHook.js';
import { CreateTaxReturnCard } from './CreateTaxReturnCard.js';
import en from '../../locales/en.yaml';
import { store } from '../../redux/store.js';
import { Provider } from 'react-redux';
import { vi } from 'vitest';

const { mockIsFlowEnabled } = vi.hoisted(() => {
  return {
    mockIsFlowEnabled: vi.fn(() => true),
  };
});

vi.mock(`react-i18next`, () => ({
  useTranslation: mockUseTranslation,
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
  Trans: ({ children }: never) => children,
}));

vi.mock(`../../constants/pageConstants.js`, async (importOriginal) => {
  const original = await importOriginal<typeof import('../../constants/pageConstants.js')>();
  return {
    ...original,
    isFlowEnabled: mockIsFlowEnabled,
  };
});

const renderCreateTaxReturnCard = (network: { online: boolean; prevOnlineStatus: boolean }) => {
  return render(
    <NetworkConnectionContext.Provider value={network}>
      <BrowserRouter>
        <Provider store={store}>
          <CreateTaxReturnCard setShouldProgressOnSuccessfulTaxReturnCreate={() => {}} />
        </Provider>
      </BrowserRouter>
    </NetworkConnectionContext.Provider>
  );
};

describe(`Tax Return Card`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(`Constructs return headers`, async () => {
    const network = { online: true, prevOnlineStatus: false };

    vi.spyOn(useApiHook, `save`);

    // mocking navigator object
    const NavigatorMock = {
      language: `browserLanguage`,
      platform: `platform`,
    };
    vi.stubGlobal(`navigator`, NavigatorMock);

    renderCreateTaxReturnCard(network);
    const button = screen.getByRole(`button`);
    fireEvent.click(button);
    await new Promise((r) => setTimeout(r));
    expect(useApiHook.save).toHaveBeenCalledTimes(1);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: typescript doesn't like me accessing mocked method call arguments like this
    const saveFunctionArguments = useApiHook.save.mock.calls[0];
    const requestBody = saveFunctionArguments[1].body;
  });

  it(`Blocks new users from entering flow when flow is disabled for a given environment`, async () => {
    mockIsFlowEnabled.mockImplementation(() => false);
    renderCreateTaxReturnCard({ online: true, prevOnlineStatus: false });
    expect(screen.getByRole(`link`, { name: en.taxReturnCard.otherWaysToFile })).toBeInTheDocument();
  });
});

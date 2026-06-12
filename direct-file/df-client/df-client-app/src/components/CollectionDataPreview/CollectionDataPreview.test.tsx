import { fireEvent, render, screen } from '@testing-library/react';

import { mockUseTranslation } from '../../test/mocks/mockFunctions.js';
import CollectionDataPreview from './CollectionDataPreview.js';
import { Path } from '../../flow/Path.js';
import { Provider } from 'react-redux';
import { store } from '../../redux/store.js';
import marge from '../../../../../backend/src/main/resources/dataimportservice/mocks/marge.json'
import { processPopulateResult } from '../../redux/slices/data-import/processPopulateResult.js';
import { DataImportRootResponseSchema } from '../../redux/slices/data-import/schema/DataImportServiceResponse.js';
import { FactGraphContextProvider } from '../../factgraph/FactGraphContext.js';
import mockEnYaml from '../../locales/en.yaml';
import { getEmptySystemAlertsMap, SystemAlertContext } from '../../context/SystemAlertContext/SystemAlertContext.js';
import * as useApiHook from '../../hooks/useApiHook.js';
import { vi } from 'vitest';

vi.mock(`react-i18next`, () => ({
  useTranslation: mockUseTranslation,
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
  Trans: ({ i18nKey }: { i18nKey: string | string[] }) => mockUseTranslation().t(i18nKey),
}));

vi.mock(`react-router-dom`);

const formW2sCollectionContext = Path.concretePath(`/formW2s`, null);

const DEFAULT_PROPS = {
  collectionContext: formW2sCollectionContext,
  nextRouteOverride: `/to/next/route`,
  gotoNextScreen: vi.fn(),
};

vi.mock(`react-redux`, async (importActual) => {
  const actual = (await importActual()) as object;
  return {
    ...actual,
    useSelector: {
      withTypes: vi.fn(),
    },
  };
});

const rootParse = DataImportRootResponseSchema.parse(marge);
const populateResult = processPopulateResult(rootParse, `DATA_IMPORT_ABOUT_YOU_BASIC_PLUS_IP_PIN_PLUS_W2`);

vi.mock(`../../redux/hooks.js`, async (importActual) => {
  const actual = (await importActual()) as object;
  return {
    ...actual,
    useAppSelector: () => {
      return {
        data: {
          status: `complete`,
          profile: populateResult,
        },
      };
    },
  };
});

const renderCollectionDataPreview = () => {
  return render(
    <Provider store={store}>
      <SystemAlertContext.Provider
        value={{
          systemAlerts: getEmptySystemAlertsMap(),
          setSystemAlert: vi.fn(),
          deleteSystemAlert: vi.fn(),
        }}
      >
        <FactGraphContextProvider>
          <CollectionDataPreview {...DEFAULT_PROPS} />
        </FactGraphContextProvider>
      </SystemAlertContext.Provider>
    </Provider>
  );
};

describe(`CollectionDataPreview`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const w2s = populateResult.data.w2s;
  if (w2s.state === `success`) {
    const firstW2 = w2s.payload[0];

    test(`renders the component`, () => {
      renderCollectionDataPreview();
      if (firstW2.employersAddress !== null) {
        expect(screen.getByText(firstW2.employersAddress.nameLine)).toBeInTheDocument();
      }
      expect(
        screen.getByText(mockEnYaml.datapreviews[formW2sCollectionContext].collectionListing.label1)
      ).toBeInTheDocument();
      expect(
        screen.getByText(mockEnYaml.datapreviews[formW2sCollectionContext].collectionListing.label2)
      ).toBeInTheDocument();
      expect(
        screen.getByText(mockEnYaml.datapreviews[formW2sCollectionContext].collectionListing.label3)
      ).toBeInTheDocument();
      expect(
        screen.getByRole(`button`, { name: mockEnYaml.datapreviews[`/formW2s`].button.importSingular })
      ).toBeInTheDocument();
      expect(
        screen.getByRole(`button`, { name: mockEnYaml.datapreviews[`/formW2s`].button.importSingular })
      ).toBeDisabled();
      expect(
        screen.getByRole(`button`, { name: mockEnYaml.datapreviews[`/formW2s`].button.doNotImport })
      ).toBeInTheDocument();
    });

    test(`only calls save once on submit`, async () => {
      renderCollectionDataPreview();
      if (firstW2.employersAddress !== null) {
        const importButton = screen.getByRole(`button`, {
          name: mockEnYaml.datapreviews[`/formW2s`].button.importSingular,
        });
        const w2Checkbox = screen.getByRole(`checkbox`, { name: firstW2.employersAddress.nameLine });
        vi.spyOn(useApiHook, `save`);

        expect(importButton).toBeDisabled();
        expect(w2Checkbox).toBeInTheDocument();

        fireEvent.click(w2Checkbox);

        expect(importButton).toBeEnabled();
        await fireEvent.click(importButton);
        await new Promise((r) => setTimeout(r));

        expect(useApiHook.save).toHaveBeenCalledTimes(1);
      }
    });
  }
});

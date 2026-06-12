import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { createFlowConfig } from '../../flow/flowConfig.js';
import flowNodes from '../../flow/flow.js';
import en from '../../locales/en.yaml';
import { FactConfig, contentConfigIsFactConfig } from '../../flow/ContentDeclarations.js';
import { FactGraphContextProvider } from '../../factgraph/FactGraphContext.js';
import { unwrapScalaOptional } from '@irs/js-factgraph-scala';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { baseFilerData, marriedFilerData, primaryFilerId } from '../../test/testData.js';
import { SubSubCategory } from './SubSubCategory.js';
import { initI18n } from '../../i18n.js';
import { setupStore } from '../../redux/store.js';
import {
  createBooleanWrapper,
  createDayWrapper,
  createEnumWrapper,
  createStringWrapper,
  createTinWrapper,
} from '../../test/persistenceWrappers.js';
import { setupFactGraph } from '../../test/setupFactGraph.js';
import { vi } from 'vitest';

// Test data for rendering subsubcategories
const w2Id = `0b1e355e-3d19-415d-8470-fbafd9f58361`;
const interestReportId = `0b1e355e-3d19-415d-8470-fbafd9f58361`;
const dependentId = `4fa3a5a7-a9d1-43a9-a0fb-277596e70d48`;
const apfForm1099Id = `4fa3a5a7-a9d1-43a9-a0fb-277596e70d42`;
const retirementForm1099Id = `4fa3a5a7-a9d1-43a9-a0fb-277596e70d75`;
const hsaForm1099Id = `4fa3a5a7-a9d1-43a9-a0fb-382384e94d23`;
const baseDependentData = {
  '/familyAndHousehold': { $type: `gov.irs.factgraph.persisters.CollectionWrapper`, item: { items: [dependentId] } },
  [`/familyAndHousehold/#${dependentId}/firstName`]: createStringWrapper(`John`),
  [`/familyAndHousehold/#${dependentId}/middleInitial`]: createStringWrapper(`Q`),
  [`/familyAndHousehold/#${dependentId}/lastName`]: createStringWrapper(`Dependent`),
  [`/familyAndHousehold/#${dependentId}/childRelationship`]: createEnumWrapper(
    `biologicalChild`,
    `/childRelationshipOptions`
  ),
  [`/familyAndHousehold/#${dependentId}/tpClaims`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${dependentId}/permanentTotalDisability`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${dependentId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${dependentId}/deceased`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${dependentId}/grossIncomeTest`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${dependentId}/ssnEmploymentValidity`]: createEnumWrapper(
    `neither`,
    `/familyAndHouseholdSsnEmploymentValidityOptions`
  ),
  [`/familyAndHousehold/#${dependentId}/writableQrSupportTest`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${dependentId}/dateOfBirth`]: createDayWrapper(`2005-01-18`),
  [`/familyAndHousehold/#${dependentId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${dependentId}/relationshipCategory`]: createEnumWrapper(
    `childOrDescendants`,
    `/relationshipCategoryOptions`
  ),
  [`/familyAndHousehold/#${dependentId}/tin`]: createTinWrapper({ area: `232`, group: `00`, serial: `2323` }),
  [`/familyAndHousehold/#${dependentId}/fullTimeStudent`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${dependentId}/monthsLivedWithTPInUS`]: createEnumWrapper(
    `twelve`,
    `/monthsLivedWithTPInUSOptions`
  ),
  [`/familyAndHousehold/#${dependentId}/residencyDuration`]: createEnumWrapper(`allYear`, `/residencyDurationOptions`),
  [`/familyAndHousehold/#${dependentId}/married`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${dependentId}/hasIpPin`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${dependentId}/ownSupport`]: createBooleanWrapper(false),
};
const baseIncomeData = {
  '/formW2s': { $type: `gov.irs.factgraph.persisters.CollectionWrapper`, item: { items: [w2Id] } },
  [`/formW2s/#${w2Id}/filer`]: {
    item: {
      id: `${primaryFilerId}`,
    },
    $type: `gov.irs.factgraph.persisters.CollectionItemWrapper`,
  },
  [`/filers/#${primaryFilerId}/tin`]: createTinWrapper({ area: `555`, group: `55`, serial: `5555` }),
  [`/filingStatus`]: createEnumWrapper(`marriedFilingJointly`, `/filingStatusOptions`),
  '/interestReports': {
    $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
    item: { items: [`${interestReportId}`] },
  },
};
const baseApfData = {
  '/form1099Miscs': { $type: `gov.irs.factgraph.persisters.CollectionWrapper`, item: { items: [apfForm1099Id] } },
  [`/form1099Miscs/#${apfForm1099Id}/filer/firstName`]: createStringWrapper(`John`),
};
const baseRetirementData = {
  '/form1099Rs': { $type: `gov.irs.factgraph.persisters.CollectionWrapper`, item: { items: [retirementForm1099Id] } },
  [`/form1099Rs/#${retirementForm1099Id}/filer/firstName`]: createStringWrapper(`John`),
};

const baseHsaDistributionData = {
  '/hsaDistributions': { $type: `gov.irs.factgraph.persisters.CollectionWrapper`, item: { items: [hsaForm1099Id] } },
  [`/hsaDistributions/#${hsaForm1099Id}/filer/firstName`]: createStringWrapper(`John`),
};
const formId = `1a1e355e-3d19-415d-8470-fbafd9f58361`;
const reportId = `0b1e355e-3d19-415d-8470-fbafd9f58361`;

vi.mock(`../../hooks/useTranslationContextFromFacts`, () => ({
  default: () => {
    return () => {
      const context = {
        // Manually add some derived facts in subsubcategories.
        '/taxYear': 2023,
        '/lastTaxYear': 2022,
        '/standardDeduction': 1,
        '/taxableIncome': 3,
        // For collections and aliases, we need to add it manually to the mock.
        [`/familyAndHousehold/*/firstName`]: `John`,
        '/secondaryFiler/firstName': `Frida`,
        [`/socialSecurityReports/*/formType`]: `SSA-1099`,
        // This hook handles enums, so we need to manually add them here.
        '/incomeInScopedState': `California`,
        '/filerResidenceAndIncomeState': `California`,
      };
      return context;
    };
  },
}));

// We are not mocking i18next here so that we can properly
// test interactions between our Translation component and Trans,
// especially proper resolving of all allowed tags.
const i18next = await initI18n();
i18next.addResourceBundle(`en`, `translation`, en);
i18next.changeLanguage(`en`);

describe(`SubSubCategory`, () => {
  const flow = createFlowConfig(flowNodes);
  const { factGraph } = setupFactGraph();
  describe(`Finds translation configs`, () => {
    for (const [route, subcategory] of flow.subcategoriesByRoute.entries()) {
      if (subcategory.hasDataView) {
        const allSubSubCategories = [
          ...subcategory.subSubcategories,
          ...subcategory.loops.flatMap((l) => l.subSubcategories),
        ];
        it(`Subcategory ${route} has a translation for every subsubcategory name`, () => {
          // Subsubcategories with pure assertion data views do not need subcategory name translations.
          for (const ssc of allSubSubCategories.filter((ssc) => !ssc.screens.some((s) => s.actAsDataView))) {
            expect(en.subsubcategories[ssc.subcategoryRoute][ssc.routeSuffix]).toBeDefined();
          }
        });
        // Subsubcategories hidden on data views do not need fact translations.
        for (const ssc of allSubSubCategories.filter((ssc) => !ssc.hidden)) {
          const COMPOSITE_FACTS = `/bankAccount`;
          it(`Subsubcategory ${ssc.fullRoute} has a translation for every readable fact`, () => {
            const paths = ssc.screens
              .flatMap((s) => s.content)
              .filter(
                (content): content is FactConfig =>
                  contentConfigIsFactConfig(content) &&
                  // eslint-disable-next-line eqeqeq
                  content.props.displayOnlyOn != `edit` &&
                  !content.props.path.includes(COMPOSITE_FACTS)
              )
              .map((fc) => fc.props.path);
            for (const path of paths) {
              expect(
                en.dataviews[ssc.subcategoryRoute][path],
                `${path} should be defined for ${ssc.subcategoryRoute}`
              ).toBeDefined();
            }
          });
          it(`Subsubcategory ${ssc.fullRoute} has a translation for every enum option path`, () => {
            const enumPaths = ssc.screens
              .flatMap((s) => s.content)
              .filter(
                (content): content is FactConfig =>
                  contentConfigIsFactConfig(content) &&
                  // eslint-disable-next-line eqeqeq
                  content.props.displayOnlyOn != `edit` &&
                  content.componentName === `Enum`
              )
              .map((fc) => fc.props.path);
            for (const path of enumPaths) {
              const optionsPath = unwrapScalaOptional(factGraph.getDictionary().getOptionsPathForEnum(path)) as string;
              expect(
                en.dataviews[ssc.subcategoryRoute][`enums`][optionsPath],
                `${optionsPath} should be defined`
              ).toBeDefined();
            }
          });
        }
      }
    }
  });

  describe(`Renders all facts properly`, () => {
    for (const [, subcategory] of flow.subcategoriesByRoute.entries()) {
      if (subcategory.hasDataView) {
        const allSubSubCategories = [
          ...subcategory.subSubcategories,
          ...subcategory.loops.flatMap((l) => l.subSubcategories),
        ];

        const collectionIdMap = {
          [`/flow/you-and-your-family/about-you`]: primaryFilerId,
          [`/flow/you-and-your-family/spouse`]: primaryFilerId,
          [`/flow/you-and-your-family/dependents`]: dependentId,
          [`/flow/income/jobs`]: w2Id,
          [`/flow/income/interest`]: interestReportId,
          [`/flow/income/unemployment`]: formId,
          [`/flow/income/retirement`]: retirementForm1099Id,
          [`/flow/income/alaska-pfd`]: apfForm1099Id,
          [`/flow/income/hsa`]: hsaForm1099Id,
          [`/flow/income/social-security`]: reportId,
        };
        for (const ssc of allSubSubCategories) {
          it(`Subsubcategory ${ssc.fullRoute} renders without errors`, () => {
            const refs = { current: new Map() };

            const collectionId = collectionIdMap[subcategory.route as keyof typeof collectionIdMap];
            const testForMeFAlert = ssc.routeSuffix === `your-digital-signature`;
            render(
              <Provider store={setupStore()}>
                <BrowserRouter>
                  <HelmetProvider context={{}}>
                    <FactGraphContextProvider
                      existingFacts={{
                        ...baseFilerData,
                        ...marriedFilerData,
                        [`/spouseIncomeFormsInScopedState`]: createEnumWrapper(
                          `onlySame`,
                          `/primaryFilerW2And1099IntStateOptions`
                        ),
                        ...baseDependentData,
                        ...baseIncomeData,
                        ...baseRetirementData,
                        ...baseApfData,
                        ...baseHsaDistributionData,
                        // Interest income
                        '/form1099Gs': {
                          $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
                          item: { items: [`${formId}`] },
                        },
                        [`/form1099Gs/#${formId}/has1099`]: createBooleanWrapper(true),
                        // Social Security
                        '/socialSecurityReports': {
                          $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
                          item: { items: [`${reportId}`] },
                        },
                        [`/socialSecurityReports/#${reportId}/formType`]: createEnumWrapper(
                          `RRB-1099`,
                          `/socialSecurityIncomeFormTypeOptions`
                        ),
                        [`/filedLastYear`]: createBooleanWrapper(true),
                        [`/selfSelectPinLastYear`]: createStringWrapper(`33333`),
                        [`/signReturnIdentity`]: createEnumWrapper(`lastYearPin`, `/signReturnIdentityOptions`),
                      }}
                    >
                      <SubSubCategory
                        mefAlertConfigs={
                          testForMeFAlert
                            ? {
                                warnings: [
                                  {
                                    type: `warning`,
                                    mefErrorCode: `IND-031-04`,
                                    route: `/flow/complete/sign-and-submit/sign-return-identity`,
                                    subcategoryRoute: `/flow/complete/sign-and-submit`,
                                    subSubcategoryRoute: `/flow/complete/sign-and-submit/your-digital-signature`,
                                    i18nKey: `identity`,
                                    isActive: true,
                                    collectionId: null,
                                  },
                                ],
                                errors: [],
                              }
                            : undefined
                        }
                        ssc={ssc}
                        collectionId={collectionId}
                        refs={refs}
                        isAfterNextIncompleteScreen={false}
                        sectionIsComplete={false}
                        includesNextIncompleteScreen={false}
                      />
                    </FactGraphContextProvider>
                  </HelmetProvider>
                </BrowserRouter>
              </Provider>
            );

            if (testForMeFAlert) {
              const dataText = screen.getByText(
                en.fields[`/signReturnIdentity`][`/signReturnIdentityOptions`].lastYearPin
              );
              expect(dataText).toBeInTheDocument();
              const alert = screen.getByTestId(`alert`);
              expect(alert).toBeInTheDocument();
              expect(dataText.closest(`li`)).toContain(alert);
              // Ignore the internal link in the copy
              const alertText = en.mefAlerts.generic[`data-view`].warning.alertText.body.p.split(`<`)[0];
              expect(alert.textContent).toContain(alertText);
            }
          });
        }
      }
    }
  });

  describe(`When the subsubcategory has incomplete data`, () => {
    it(`only render the incomplete question`, () => {
      const refs = { current: new Map() };
      const subcategory = flow.subcategoriesByRoute.get(`/flow/you-and-your-family/about-you`);
      const ssc = subcategory?.subSubcategories.find((ssc) => ssc);
      const incompleteFilerData = {
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/firstName`]: undefined,
        [`/filers/#${primaryFilerId}/dateOfBirth`]: undefined,
        [`/filers/#${primaryFilerId}/occupation`]: undefined,
      };
      const nextIncompleteScreen = flow.screensByRoute.get(`/flow/you-and-your-family/about-you/about-you-basic-info`);
      render(
        <Provider store={setupStore()}>
          <BrowserRouter>
            <HelmetProvider context={{}}>
              <FactGraphContextProvider forceNewInstance existingFacts={incompleteFilerData}>
                <SubSubCategory
                  mefAlertConfigs={undefined}
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  ssc={ssc!}
                  collectionId={primaryFilerId}
                  refs={refs}
                  isAfterNextIncompleteScreen={false}
                  sectionIsComplete={false}
                  includesNextIncompleteScreen={true}
                  nextIncompleteScreen={nextIncompleteScreen}
                />
              </FactGraphContextProvider>
            </HelmetProvider>
          </BrowserRouter>
        </Provider>
      );

      const name = screen.getByText(en.fields[`/filers/*/fullName`].name);
      expect(name).toBeInTheDocument();
      const list = screen.getByRole(`list`);
      expect(list.childNodes).toHaveLength(1);
    });
  });
});

import { it, describe, expect } from 'vitest';
import { baseFilerData, primaryFilerId, makeChildData, makeW2Data, mfjFilerData, spouseId } from '../testData.js';
import {
  createBooleanWrapper,
  createCollectionWrapper,
  createDollarWrapper,
  createCollectionItemWrapper,
} from '../persistenceWrappers.js';
import { Path } from '../../flow/Path.js';
import { createFlowConfig } from '../../flow/flowConfig.js';
import flowNodes from '../../flow/flow.js';
import makeGivenFacts from './functionalFlowUtils.js';
import { CollectionItemReferenceFactory } from '@irs/js-factgraph-scala';
import { setupFactGraph } from '../setupFactGraph.js';
import { vi } from 'vitest';

const flow = createFlowConfig(flowNodes);
const givenFacts = makeGivenFacts(flow);

describe(`The CDCC credit`, () => {
  beforeAll(() => {
    vi.setSystemTime(new Date(`2024-02-15`));
  });

  const dob = {
    under13: `2012-01-01`,
    adult: `1987-01-01`,
  };
  const childDependentId = `4fa3a5a7-a9d1-43a9-a0fb-277596e70d48`;
  const childData = makeChildData(childDependentId, dob.under13);
  const childDependentId2 = `d4dbed7a-a800-4db8-8e49-ad7eb38c798b`;
  const childData2 = makeChildData(childDependentId2, dob.under13);

  const careProviderId = `d5b0fe7a-d16a-4be4-b53a-6480fd9946f9`;
  const w2Id = `61a30f68-bfc6-4c11-ab49-f18c3fb4aa20`;
  const w2Id2 = `4a939366-ee7c-4717-9794-5019a93b29dc`;

  const filerWithChild = {
    ...baseFilerData,
    [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
    // has a child dependent
    '/familyAndHousehold': createCollectionWrapper([childDependentId]),
    ...childData,
    // has dependent care expenses
    '/writableCdccHasQualifyingExpenses': createBooleanWrapper(true),
    '/writableCdccTotalQualifiedDependentCareExpenses': createDollarWrapper(`12000`),
    '/writablePrimaryFilerDependentCarePlanMaximum': createDollarWrapper(`2500`),
    // has a care provider
    '/cdccCareProviders': createCollectionWrapper([careProviderId]),
    [`/cdccCareProviders/#${careProviderId}/writableIsOrganization`]: createBooleanWrapper(true),
    [`/cdccCareProviders/#${careProviderId}/isEmployerFurnished`]: createBooleanWrapper(true),
  };

  const filerWithChildOneW2DepCareBenefits = {
    ...filerWithChild,
    // has a w2 with dependent care benefits
    ...makeW2Data(30000, w2Id),
    [`/formW2s/#${w2Id}/writableDependentCareBenefits`]: createDollarWrapper(`1000`),
    [`/formW2s/#${w2Id}/filer`]: createCollectionItemWrapper(primaryFilerId),
    '/formW2s': createCollectionWrapper([w2Id]),
  };

  const filerWithChildTwoW2sDepCareBenefits = {
    ...filerWithChildOneW2DepCareBenefits,
    // has a second w2
    [`/formW2s/#${w2Id2}/filer`]: createCollectionItemWrapper(primaryFilerId),
    '/formW2s': createCollectionWrapper([w2Id, w2Id2]),
  };

  describe(`Provider non-employer flow`, () => {
    const screens = {
      checklist: `/checklist`,
      dataView: `/data-view/flow/credits-and-deductions/deductions`,
      cdccProviderEmployer: `/flow/income/dependent-care/provider-employer`,
      cdccProviderName: `/flow/income/dependent-care/provider-name`,
      cdccProviderAddress: `/flow/income/dependent-care/provider-address`,
      cdccProviderTaxExempt: `/flow/income/dependent-care/provider-tax-exempt`,
      cdccProviderTinEinCheck: `/flow/income/dependent-care/tin-ein-check`,
      cdccProviderTinEinMissingReason: `/flow/income/dependent-care/tin-missing-reason`,
      cdccProviderEin: `/flow/income/dependent-care/provider-ein`,
      cdccProviderTin: `/flow/income/dependent-care/provider-tin`,
      cdccProviderExpenses: `/flow/income/dependent-care/provider-qp-expenses`,
      cdccProviderTinEinDueDiligence: `/flow/income/dependent-care/provider-due-diligence`,
    };
    it(`shows the name, address, and tax exempt screen`, ({ task }) => {
      const filerWithChildW2DepCareBenefitsNotEmployerProvided = {
        ...filerWithChildOneW2DepCareBenefits,
        [Path.concretePath(`/cdccCareProviders/*/isEmployerFurnished`, careProviderId)]: createBooleanWrapper(false),
      };
      const { factGraph } = setupFactGraph(filerWithChildW2DepCareBenefitsNotEmployerProvided);
      expect(factGraph.get(Path.concretePath(`/hasReportedPrimaryFilerDependentCareBenefits`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/cdccQualifiedForBenefit`, null)).get).toBe(true);

      expect(givenFacts(factGraph).atPath(screens.cdccProviderEmployer, careProviderId, task)).toRouteNextTo(
        screens.cdccProviderName
      );

      expect(givenFacts(factGraph).atPath(screens.cdccProviderName, careProviderId, task)).toRouteNextTo(
        screens.cdccProviderAddress
      );

      expect(givenFacts(factGraph).atPath(screens.cdccProviderAddress, careProviderId, task)).toRouteNextTo(
        screens.cdccProviderTaxExempt
      );
    });
    describe(`taxExempt provider`, () => {
      it(`shows the expense screen`, ({ task }) => {
        const filerWithChildW2DepCareBenefitsNotEmployerProvided = {
          ...filerWithChildOneW2DepCareBenefits,
          [Path.concretePath(`/cdccCareProviders/*/isEmployerFurnished`, careProviderId)]: createBooleanWrapper(false),
          [Path.concretePath(`/cdccCareProviders/*/writableIsTaxExempt`, careProviderId)]: createBooleanWrapper(true),
        };
        const { factGraph } = setupFactGraph(filerWithChildW2DepCareBenefitsNotEmployerProvided);
        expect(factGraph.get(Path.concretePath(`/hasReportedPrimaryFilerDependentCareBenefits`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/cdccQualifiedForBenefit`, null)).get).toBe(true);

        expect(givenFacts(factGraph).atPath(screens.cdccProviderTaxExempt, careProviderId, task)).toRouteNextTo(
          screens.cdccProviderExpenses
        );
      });
    });
    describe(`not tax-exempt provider`, () => {
      it(`shows the tin/ein screens when filer has them`, ({ task }) => {
        const filerWithChildW2DepCareBenefitsNotEmployerProvided = {
          ...filerWithChildOneW2DepCareBenefits,
          [Path.concretePath(`/cdccCareProviders/*/isEmployerFurnished`, careProviderId)]: createBooleanWrapper(false),
          [Path.concretePath(`/cdccCareProviders/*/writableIsTaxExempt`, careProviderId)]: createBooleanWrapper(false),
        };
        const { factGraph } = setupFactGraph(filerWithChildW2DepCareBenefitsNotEmployerProvided);
        expect(factGraph.get(Path.concretePath(`/hasReportedPrimaryFilerDependentCareBenefits`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/cdccQualifiedForBenefit`, null)).get).toBe(true);

        expect(givenFacts(factGraph).atPath(screens.cdccProviderTaxExempt, careProviderId, task)).toRouteNextTo(
          screens.cdccProviderTinEinCheck
        );

        factGraph.set(Path.concretePath(`/cdccCareProviders/*/hasTinOrEin`, careProviderId), true);
        factGraph.save();

        // as an organization
        expect(givenFacts(factGraph).atPath(screens.cdccProviderTinEinCheck, careProviderId, task)).toRouteNextTo(
          screens.cdccProviderEin
        );

        expect(givenFacts(factGraph).atPath(screens.cdccProviderEin, careProviderId, task)).toRouteNextTo(
          screens.cdccProviderExpenses
        );

        // if not an organization
        factGraph.set(Path.concretePath(`/cdccCareProviders/*/writableIsOrganization`, careProviderId), false);
        factGraph.save();

        expect(givenFacts(factGraph).atPath(screens.cdccProviderTinEinCheck, careProviderId, task)).toRouteNextTo(
          screens.cdccProviderTin
        );
      });

      it(`shows the missing tin screen when missing`, ({ task }) => {
        const filerWithChildW2DepCareBenefitsNotEmployerProvided = {
          ...filerWithChildOneW2DepCareBenefits,
          [Path.concretePath(`/cdccCareProviders/*/isEmployerFurnished`, careProviderId)]: createBooleanWrapper(false),
          [Path.concretePath(`/cdccCareProviders/*/writableIsTaxExempt`, careProviderId)]: createBooleanWrapper(false),
        };
        const { factGraph } = setupFactGraph(filerWithChildW2DepCareBenefitsNotEmployerProvided);

        factGraph.set(Path.concretePath(`/cdccCareProviders/*/hasTinOrEin`, careProviderId), false);
        factGraph.save();

        expect(givenFacts(factGraph).atPath(screens.cdccProviderTinEinCheck, careProviderId, task)).toRouteNextTo(
          screens.cdccProviderTinEinMissingReason
        );

        expect(
          givenFacts(factGraph).atPath(screens.cdccProviderTinEinMissingReason, careProviderId, task)
        ).toRouteNextTo(screens.cdccProviderTinEinDueDiligence);

        expect(
          givenFacts(factGraph).atPath(screens.cdccProviderTinEinDueDiligence, careProviderId, task)
        ).toRouteNextTo(screens.cdccProviderExpenses);
      });
    });
  });

  describe(`Provider employer flow`, () => {
    const screens = {
      checklist: `/checklist`,
      dataView: `/data-view/flow/credits-and-deductions/deductions`,
      cdccProviderEmployer: `/flow/income/dependent-care/provider-employer`,
      cdccProviderEmployerCheckSingle: `/flow/income/dependent-care/provider-employer-check-single`,
      cdccProviderEmployerCheckMultiple: `/flow/income/dependent-care/provider-employer-check-multiple`,
      cdccProviderQpExpenses: `/flow/income/dependent-care/provider-qp-expenses`,
      cdccProviderEmployerAddNew: `/flow/income/dependent-care/provider-employer-add-new`,
      cdccProviderName: `/flow/income/dependent-care/provider-name`,
      cdccProviderEmployerSelection: `/flow/income/dependent-care/provider-employer-selection`,
    };

    /** PROVIDER EMPLOYER SINGLE W2 */
    describe(`to a filer with employer furnished care provider and one w2`, () => {
      it(`does not show the expenses screen if we have the w2`, ({ task }) => {
        const { factGraph } = setupFactGraph(filerWithChildOneW2DepCareBenefits);
        // Filer with dependent and 1 w2 who reported dependent care benefits
        expect(factGraph.get(Path.concretePath(`/filersHaveExactlyOneW2`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/cdccCountOfQualifyingPersons`, null)).get).toEqual(1);
        expect(factGraph.get(Path.concretePath(`/hasReportedPrimaryFilerDependentCareBenefits`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/cdccQualifiedForBenefit`, null)).get).toBe(true);

        expect(givenFacts(factGraph).atPath(screens.cdccProviderEmployer, careProviderId, task)).toRouteNextTo(
          screens.cdccProviderEmployerCheckSingle
        );
        // If we have the w2 for that employer
        factGraph.set(Path.concretePath(`/cdccCareProviders/*/hasW2Employer`, careProviderId), true);
        factGraph.save();
        // Does not show the expenses screen
        expect(
          givenFacts(factGraph).atPath(screens.cdccProviderEmployerCheckSingle, careProviderId, task)
        ).not.toRouteNextTo(screens.cdccProviderQpExpenses);
      });

      it(`shows the go to jobs screen if we don't have the w2`, ({ task }) => {
        const { factGraph } = setupFactGraph(filerWithChildOneW2DepCareBenefits);
        // Filer with dependent and 1 w2 who reported dependent care benefits
        expect(factGraph.get(Path.concretePath(`/filersHaveExactlyOneW2`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/cdccCountOfQualifyingPersons`, null)).get).toEqual(1);
        expect(factGraph.get(Path.concretePath(`/hasReportedPrimaryFilerDependentCareBenefits`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/cdccQualifiedForBenefit`, null)).get).toBe(true);

        expect(givenFacts(factGraph).atPath(screens.cdccProviderEmployer, careProviderId, task)).toRouteNextTo(
          screens.cdccProviderEmployerCheckSingle
        );
        // But we don't have the w2 for that employer
        factGraph.set(Path.concretePath(`/cdccCareProviders/*/hasW2Employer`, careProviderId), false);
        factGraph.save();
        // Shows go to jobs screen
        expect(
          givenFacts(factGraph).atPath(screens.cdccProviderEmployerCheckSingle, careProviderId, task)
        ).toRouteNextTo(screens.cdccProviderEmployerAddNew);
      });

      it(`shows the provider name screen if we don't have the w2 but have carryover`, ({ task }) => {
        const filerWithCarryover = {
          ...filerWithChildOneW2DepCareBenefits,
          [`/hasCdccCarryoverAmountFromPriorTaxYear`]: createBooleanWrapper(true),
          [`/writableCdccCarryoverAmountFromPriorTaxYear`]: createDollarWrapper(`500`),
          [Path.concretePath(`/cdccCareProviders/*/isEmployerFurnished`, careProviderId)]: createBooleanWrapper(true),
        };
        const { factGraph } = setupFactGraph(filerWithCarryover);
        // Filer with dependent and 1 w2 who reported carryover
        expect(factGraph.get(Path.concretePath(`/filersHaveExactlyOneW2`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/cdccCountOfQualifyingPersons`, null)).get).toEqual(1);
        expect(factGraph.get(Path.concretePath(`/cdccQualifiedForBenefit`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/hasReportedPrimaryFilerDependentCareBenefits`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/hasCdccCarryoverAmountFromPriorTaxYear`, null)).get).toBe(true);

        expect(givenFacts(factGraph).atPath(screens.cdccProviderEmployer, careProviderId, task)).toRouteNextTo(
          screens.cdccProviderEmployerCheckSingle
        );
        // But we don't have the w2 for that employer
        factGraph.set(Path.concretePath(`/cdccCareProviders/*/hasW2Employer`, careProviderId), false);
        factGraph.save();
        // Shows provider name screen
        expect(
          givenFacts(factGraph).atPath(screens.cdccProviderEmployerCheckSingle, careProviderId, task)
        ).toRouteNextTo(screens.cdccProviderName);
      });
    });

    /** PROVIDER EMPLOYER MULTIPLE W2s */
    describe(`to a filer with employer furnished care provider and multiple w2s`, () => {
      it(`does not show the expenses screen if we have the w2`, ({ task }) => {
        const { factGraph } = setupFactGraph(filerWithChildTwoW2sDepCareBenefits);
        // Filer with dependent and 2 w2 who reported dependent care benefits
        expect(factGraph.get(Path.concretePath(`/filersHaveExactlyOneW2`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/cdccCountOfQualifyingPersons`, null)).get).toEqual(1);
        expect(factGraph.get(Path.concretePath(`/hasReportedPrimaryFilerDependentCareBenefits`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/cdccQualifiedForBenefit`, null)).get).toBe(true);

        // Show multiple employer screen
        expect(givenFacts(factGraph).atPath(screens.cdccProviderEmployer, careProviderId, task)).toRouteNextTo(
          screens.cdccProviderEmployerCheckMultiple
        );
        // If we have the w2 for that employer
        factGraph.set(
          Path.concretePath(`/cdccCareProviders/*/writableEmployerWhoFurnishedCare`, careProviderId),
          CollectionItemReferenceFactory(w2Id, `/formW2s`, factGraph.sfgGraph).right
        );
        factGraph.save();
        // Does not show the expenses screen
        expect(
          givenFacts(factGraph).atPath(screens.cdccProviderEmployerCheckMultiple, careProviderId, task)
        ).not.toRouteNextTo(screens.cdccProviderQpExpenses);
      });

      it(`shows the go to jobs screen if we don't have the w2`, ({ task }) => {
        const { factGraph } = setupFactGraph(filerWithChildTwoW2sDepCareBenefits);
        // Filer with dependent and multiple w2 who reported dependent care benefits
        expect(factGraph.get(Path.concretePath(`/filersHaveExactlyOneW2`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/cdccCountOfQualifyingPersons`, null)).get).toEqual(1);
        expect(factGraph.get(Path.concretePath(`/hasReportedPrimaryFilerDependentCareBenefits`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/cdccQualifiedForBenefit`, null)).get).toBe(true);

        expect(givenFacts(factGraph).atPath(screens.cdccProviderEmployer, careProviderId, task)).toRouteNextTo(
          screens.cdccProviderEmployerCheckMultiple
        );
        // But we don't have the w2 for that employer and no ty-1 benefits
        factGraph.set(Path.concretePath(`/cdccCareProviders/*/hasW2Employer`, careProviderId), false);
        factGraph.save();
        // Shows go to jobs screen
        expect(
          givenFacts(factGraph).atPath(screens.cdccProviderEmployerCheckSingle, careProviderId, task)
        ).toRouteNextTo(screens.cdccProviderEmployerAddNew);
      });

      it(`shows the provider name screen if we don't have the w2 but have carryover`, ({ task }) => {
        const filerWithCarryover = {
          ...filerWithChildTwoW2sDepCareBenefits,
          [`/hasCdccCarryoverAmountFromPriorTaxYear`]: createBooleanWrapper(true),
          [`/writableCdccCarryoverAmountFromPriorTaxYear`]: createDollarWrapper(`500`),
        };
        const { factGraph } = setupFactGraph(filerWithCarryover);
        // Filer with dependent and multiple w2 who reported ty-1 benefits (carryover)
        expect(factGraph.get(Path.concretePath(`/filersHaveExactlyOneW2`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/cdccCountOfQualifyingPersons`, null)).get).toEqual(1);
        expect(factGraph.get(Path.concretePath(`/cdccQualifiedForBenefit`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/hasReportedPrimaryFilerDependentCareBenefits`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/hasCdccCarryoverAmountFromPriorTaxYear`, null)).get).toBe(true);

        expect(givenFacts(factGraph).atPath(screens.cdccProviderEmployer, careProviderId, task)).toRouteNextTo(
          screens.cdccProviderEmployerCheckMultiple
        );
        // But we don't have the w2 for that employer
        factGraph.set(Path.concretePath(`/cdccCareProviders/*/hasW2Employer`, careProviderId), false);
        factGraph.save();
        // Shows provider name screen
        expect(
          givenFacts(factGraph).atPath(screens.cdccProviderEmployerCheckSingle, careProviderId, task)
        ).toRouteNextTo(screens.cdccProviderName);
      });
    });
  });

  /** QUALIFYING EXPENSES PER QP FLOW */
  describe(`Qualifying expenses per qp flow`, () => {
    const screens = {
      checklist: `/checklist`,
      dataView: `/data-view/flow/credits-and-deductions/deductions`,
      cdccGating: `/flow/credits-and-deductions/credits/cdcc-gating`,
      cdccWorksheetACheck1: `/flow/credits-and-deductions/credits/worksheet-a-check-1`,
      cdccIdentifyQp: `/flow/credits-and-deductions/credits/cdcc-identify-qp`,
      cdccQualifiedExpensesQp: `/flow/credits-and-deductions/credits/cdcc-qualified-expenses-qp`,
      cdccQualifiedExpensesQfiler: `/flow/credits-and-deductions/credits/cdcc-qualified-expenses-qfiler`,
      cdccQpTransitionAQp: `/flow/credits-and-deductions/credits/cdcc-qp-transition-a-qp`,
      cdccQpTransitionAQfiler: `/flow/credits-and-deductions/credits/cdcc-qp-transition-a-qfiler`,
      cdccQualified: `/flow/credits-and-deductions/credits/cdcc-qualified`,
      cdccNotQualified: `/flow/credits-and-deductions/credits/cdcc-not-qualified`,
    };

    const getCollectionUrl = (screen: string, collectionName: string, uuid: string) => {
      return `${screen}?%2F${collectionName}=${uuid}`;
    };

    // QUALIFYING EXPENSES PER QP - 2 QPs
    describe(`to a filer with two non-filer qp`, () => {
      const filerWithQualifyingExpenses = {
        ...{
          ...filerWithChild,
          // has a w2 with NO dependent care benefits
          ...makeW2Data(30000, w2Id),
          [`/formW2s/#${w2Id}/filer`]: createCollectionItemWrapper(primaryFilerId),
          '/formW2s': createCollectionWrapper([w2Id]),
        },
        ...childData2,
        [`/familyAndHousehold`]: createCollectionWrapper([childDependentId, childDependentId2]),
        [`/writableCdccHasQualifyingExpenses`]: createBooleanWrapper(true),
        [`/cdccHasCreditForPriorYearExpenses`]: createBooleanWrapper(false),
      };

      it(`to see qp-expenses screen for first qp`, ({ task }) => {
        const { factGraph } = setupFactGraph(filerWithQualifyingExpenses);
        // Filer with 2 qps and qualifying expenses and one w2
        expect(factGraph.get(Path.concretePath(`/filersHaveExactlyOneW2`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/cdccCountOfQualifyingPersons`, null)).get).toEqual(2);
        expect(factGraph.get(Path.concretePath(`/cdccMaybeHasQualifyingExpenses`, null)).get).toBe(true);

        expect(givenFacts(factGraph).atPath(screens.cdccWorksheetACheck1, null, task)).toRouteNextTo(
          screens.cdccIdentifyQp
        );

        expect(givenFacts(factGraph).atPath(screens.cdccIdentifyQp, null, task)).toRouteNextTo(
          getCollectionUrl(screens.cdccQualifiedExpensesQp, `cdccQualifyingPeople`, childDependentId)
        );
      });

      const filerWithExpenseForFirstQp = {
        ...filerWithQualifyingExpenses,
        // has expenses for first qp
        [Path.concretePath(`/familyAndHousehold/*/cdccHasDependentCareExpenses`, childDependentId)]:
          createBooleanWrapper(true),
        [Path.concretePath(`/familyAndHousehold/*/cdccHadExpensesPaidToQualifyingProvider`, childDependentId)]:
          createBooleanWrapper(true),
        [Path.concretePath(`/familyAndHousehold/*/writableCdccQualifyingExpenseAmount`, childDependentId)]:
          createDollarWrapper(`500`),
      };

      it(`to loop back to see qp-expenses screen for second qp`, ({ task }) => {
        const { factGraph } = setupFactGraph(filerWithExpenseForFirstQp);
        expect(givenFacts(factGraph).atPath(screens.cdccQpTransitionAQp, childDependentId, task)).toRouteNextTo(
          getCollectionUrl(screens.cdccQualifiedExpensesQp, `cdccQualifyingPeople`, childDependentId2)
        );
      });

      const filerWithExpenseForSecondQp = {
        ...filerWithExpenseForFirstQp,
        // has expenses for second qp
        [Path.concretePath(`/familyAndHousehold/*/cdccHasDependentCareExpenses`, childDependentId2)]:
          createBooleanWrapper(true),
        [Path.concretePath(`/familyAndHousehold/*/cdccHadExpensesPaidToQualifyingProvider`, childDependentId2)]:
          createBooleanWrapper(true),
        [Path.concretePath(`/familyAndHousehold/*/writableCdccQualifyingExpenseAmount`, childDependentId2)]:
          createDollarWrapper(`500`),
      };

      it(`after second qp, to exit to cdcc-qualified screen`, ({ task }) => {
        const { factGraph } = setupFactGraph(filerWithExpenseForSecondQp);

        // Filer with dependent and 1 w2 who reported dependent care benefits
        expect(factGraph.get(Path.concretePath(`/filersHaveExactlyOneW2`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/cdccCountOfQualifyingPersons`, null)).get).toEqual(2);
        expect(factGraph.get(Path.concretePath(`/cdccQualified`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/cdccPotentialCdccIsZeroOrLessDueToExclusionBenefits`, null)).get).toBe(
          false
        );

        expect(givenFacts(factGraph).atPath(screens.cdccQpTransitionAQp, childDependentId2, task)).toRouteNextTo(
          screens.cdccQualified
        );
      });
    });

    const filerWithQFiler = {
      // mfj
      ...mfjFilerData,
      // 2 earned incomes
      ...makeW2Data(30000, w2Id),
      [Path.concretePath(`/formW2s/*/filer`, w2Id)]: createCollectionItemWrapper(primaryFilerId),
      ...makeW2Data(30000, w2Id2),
      [Path.concretePath(`/formW2s/*/filer`, w2Id2)]: createCollectionItemWrapper(spouseId),
      '/formW2s': createCollectionWrapper([w2Id, w2Id2]),
      // no other dependents
      // 1 filer qualifying person
      [Path.concretePath(`/filers/*/isDisabled`, spouseId)]: createBooleanWrapper(true),
      [Path.concretePath(`/filers/*/canBeClaimed`, spouseId)]: createBooleanWrapper(false),
      [Path.concretePath(`/filers/*/isUsCitizenFullYear`, spouseId)]: createBooleanWrapper(true),
      [Path.concretePath(`/filers/*/canBeClaimed`, primaryFilerId)]: createBooleanWrapper(false),
      [Path.concretePath(`/livedTogetherAllYearWithSpouse`, null)]: createBooleanWrapper(true),
      [Path.concretePath(`/writableCdccHasQualifyingExpenses`, null)]: createBooleanWrapper(true),
      [Path.concretePath(`/cdccHasCreditForPriorYearExpenses`, null)]: createBooleanWrapper(false),
    };

    // QUALIFYING EXPENSES PER QP - 1 QUALIFYING FILER
    describe(`to a filer with a qualifying filer`, () => {
      it(`to see qp-expenses screen for filer`, ({ task }) => {
        const { factGraph } = setupFactGraph(filerWithQFiler);
        // Filer with one spouse qualifying person
        expect(factGraph.get(Path.concretePath(`/cdccCountOfQualifyingPersons`, null)).get).toEqual(1);

        expect(givenFacts(factGraph).atPath(screens.cdccWorksheetACheck1, null, task)).toRouteNextTo(
          screens.cdccIdentifyQp
        );
        // Route first to the qualifying filer
        expect(givenFacts(factGraph).atPath(screens.cdccIdentifyQp, null, task)).toRouteNextTo(
          getCollectionUrl(screens.cdccQualifiedExpensesQfiler, `cdccQualifyingFilers`, spouseId)
        );
      });
      const filerWithExpensesForQfiler = {
        ...filerWithQFiler,
        // has expenses for qualifying filer
        [Path.concretePath(`/filers/*/cdccHasDependentCareExpenses`, spouseId)]: createBooleanWrapper(true),
        [Path.concretePath(`/filers/*/cdccHadExpensesPaidToQualifyingProvider`, spouseId)]: createBooleanWrapper(true),
        [Path.concretePath(`/filers/*/writableCdccQualifyingExpenseAmount`, spouseId)]: createDollarWrapper(`500`),
      };
      it(`after qfiler, to exit to cdcc-qualified screen`, ({ task }) => {
        const { factGraph } = setupFactGraph(filerWithExpensesForQfiler);
        expect(factGraph.get(Path.concretePath(`/cdccQualified`, null)).get).toBe(true);
        expect(givenFacts(factGraph).atPath(screens.cdccQpTransitionAQfiler, spouseId, task)).toRouteNextTo(
          screens.cdccQualified
        );
      });
    });

    const filerWithChildAndQFiler = {
      // mfj
      ...baseFilerData,
      ...mfjFilerData,
      // 2 earned incomes
      ...makeW2Data(30000, w2Id, primaryFilerId),
      ...makeW2Data(30000, w2Id2, spouseId),
      '/formW2s': createCollectionWrapper([w2Id, w2Id2]),
      // 1 dependent qualifying person
      ...childData,
      '/familyAndHousehold': createCollectionWrapper([childDependentId]),
      // 1 filer qualifying person
      [Path.concretePath(`/filers/*/isDisabled`, spouseId)]: createBooleanWrapper(true),
      [Path.concretePath(`/filers/*/canBeClaimed`, spouseId)]: createBooleanWrapper(false),
      [Path.concretePath(`/filers/*/isUsCitizenFullYear`, spouseId)]: createBooleanWrapper(true),
      [Path.concretePath(`/filers/*/canBeClaimed`, primaryFilerId)]: createBooleanWrapper(false),
      [Path.concretePath(`/livedTogetherAllYearWithSpouse`, null)]: createBooleanWrapper(true),
      [Path.concretePath(`/writableCdccHasQualifyingExpenses`, null)]: createBooleanWrapper(true),
      [Path.concretePath(`/cdccHasCreditForPriorYearExpenses`, null)]: createBooleanWrapper(false),
    };

    // QUALIFYING EXPENSES PER QP - 1 CHILD, 1 QUALIFYING FILER
    describe(`to a filer with a qualifying child and qualifying filer`, () => {
      it(`to see qp-expenses screen for first qp`, ({ task }) => {
        const { factGraph } = setupFactGraph(filerWithChildAndQFiler);

        // Filer with one spouse qualifying person and one dependent qualifying person
        expect(factGraph.get(Path.concretePath(`/cdccCountOfQualifyingPersons`, null)).get).toEqual(2);

        expect(givenFacts(factGraph).atPath(screens.cdccWorksheetACheck1, null, task)).toRouteNextTo(
          screens.cdccIdentifyQp
        );
        // Route first to child dependent
        expect(givenFacts(factGraph).atPath(screens.cdccIdentifyQp, null, task)).toRouteNextTo(
          getCollectionUrl(screens.cdccQualifiedExpensesQp, `cdccQualifyingPeople`, childDependentId)
        );
      });

      const filerWithExpensesForQp = {
        ...filerWithChildAndQFiler,
        // has expenses for first qp
        [Path.concretePath(`/familyAndHousehold/*/cdccHasDependentCareExpenses`, childDependentId)]:
          createBooleanWrapper(true),
        [Path.concretePath(`/familyAndHousehold/*/cdccHadExpensesPaidToQualifyingProvider`, childDependentId)]:
          createBooleanWrapper(true),
        [Path.concretePath(`/familyAndHousehold/*/writableCdccQualifyingExpenseAmount`, childDependentId)]:
          createDollarWrapper(`500`),
      };

      it(`after first qp,to transition to qp-expenses screen for the qfiler`, ({ task }) => {
        const { factGraph } = setupFactGraph(filerWithExpensesForQp);

        expect(givenFacts(factGraph).atPath(screens.cdccQpTransitionAQp, childDependentId, task)).toRouteNextTo(
          getCollectionUrl(screens.cdccQualifiedExpensesQfiler, `cdccQualifyingFilers`, spouseId)
        );
      });

      const filerWithExpensesForBoth = {
        ...filerWithExpensesForQp,
        // has expenses for qualifying filer
        [Path.concretePath(`/filers/*/cdccHasDependentCareExpenses`, spouseId)]: createBooleanWrapper(true),
        [Path.concretePath(`/filers/*/cdccHadExpensesPaidToQualifyingProvider`, spouseId)]: createBooleanWrapper(true),
        [Path.concretePath(`/filers/*/writableCdccQualifyingExpenseAmount`, spouseId)]: createDollarWrapper(`500`),
      };
      it(`after second filer, to exit to cdcc-qualified screen`, ({ task }) => {
        const { factGraph } = setupFactGraph(filerWithExpensesForBoth);
        expect(factGraph.get(Path.concretePath(`/cdccQualified`, null)).get).toBe(true);

        expect(givenFacts(factGraph).atPath(screens.cdccQpTransitionAQfiler, spouseId, task)).toRouteNextTo(
          screens.cdccQualified
        );
      });
    });
  });

  describe(`Screen after CDCC flow for a filer who qualifies for Saver's Credit`, () => {
    const filerWithQualifyingExpenses = {
      ...filerWithChild,
      [`/formW2s`]: createCollectionWrapper([w2Id]),
      [`/formW2s/#${w2Id}/filer`]: createCollectionItemWrapper(primaryFilerId),
      [`/formW2s/#${w2Id}/401kDeferrals`]: createDollarWrapper(`1500`),
      [`/writableCdccHasQualifyingExpenses`]: createBooleanWrapper(true),
      [`/cdccHasCreditForPriorYearExpenses`]: createBooleanWrapper(false),
      [Path.concretePath(`/familyAndHousehold/*/cdccHasDependentCareExpenses`, childDependentId)]:
        createBooleanWrapper(true),
      [Path.concretePath(`/familyAndHousehold/*/cdccHadExpensesPaidToQualifyingProvider`, childDependentId)]:
        createBooleanWrapper(true),
      [Path.concretePath(`/familyAndHousehold/*/writableCdccQualifyingExpenseAmount`, childDependentId)]:
        createDollarWrapper(`500`),
    };

    describe(`When the taxpayer still has tax liability`, () => {
      const filerWithLargeTaxBill = {
        ...filerWithQualifyingExpenses,
        ...makeW2Data(30000, w2Id),
      };
      const { factGraph } = setupFactGraph(filerWithLargeTaxBill);

      expect(factGraph.get(Path.concretePath(`/qualifiedForSaverCreditWoTaxLiability`, null)).get).toBe(true);
      expect(parseFloat(factGraph.get(Path.concretePath(`/totalTentativeTax`, null)).get.toString())).toBeGreaterThan(
        0
      );
      expect(parseFloat(factGraph.get(Path.concretePath(`/totalTentativeTax`, null)).get.toString())).toBeGreaterThan(
        parseFloat(factGraph.get(Path.concretePath(`/cdccTotalCredit`, null)).get.toString())
      );

      it(`Goes to the intro to the Saver's Credit flow`, ({ task }) => {
        expect(
          givenFacts(factGraph).atPath(`/flow/credits-and-deductions/credits/cdcc-nondep-qp-confirmation`, null, task)
        ).toRouteNextTo(`/flow/credits-and-deductions/credits/savers-credit-breather`);
      });
    });

    describe(`When CDCC zeroes out tax liability`, () => {
      const filerWithSmallTaxBill = {
        ...filerWithQualifyingExpenses,
        ...makeW2Data(17500, w2Id),
      };
      const { factGraph } = setupFactGraph(filerWithSmallTaxBill);

      expect(factGraph.get(Path.concretePath(`/qualifiedForSaverCreditWoTaxLiability`, null)).get).toBe(true);
      expect(parseFloat(factGraph.get(Path.concretePath(`/totalTentativeTax`, null)).get.toString())).toBeGreaterThan(
        0
      );
      expect(
        parseFloat(factGraph.get(Path.concretePath(`/totalTentativeTax`, null)).get.toString())
      ).toBeLessThanOrEqual(parseFloat(factGraph.get(Path.concretePath(`/cdccTotalCredit`, null)).get.toString()));

      it(`Goes to a note that we won't check for additional Schedule 3 credits`, ({ task }) => {
        expect(
          givenFacts(factGraph).atPath(`/flow/credits-and-deductions/credits/cdcc-nondep-qp-confirmation`, null, task)
        ).toRouteNextTo(`/flow/credits-and-deductions/credits/nr-credit-limit-reached`);
      });
    });
  });
});

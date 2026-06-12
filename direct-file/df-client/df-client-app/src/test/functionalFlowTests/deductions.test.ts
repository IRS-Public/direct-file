import { it, describe, expect } from 'vitest';
import flowNodes from '../../flow/flow.js';
import { createFlowConfig } from '../../flow/flowConfig.js';
import { createBooleanWrapper, createDollarWrapper, createEnumWrapper } from '../persistenceWrappers.js';
import {
  baseFilerData,
  primaryFilerId,
  spouseId,
  singleFilerWithHsaDeductions,
  mfjBothWithQualifiedHsaDeductions,
  mfjPrimaryOnlyWithQualifiedHsaDeductions,
  mfjSecondaryOnlyWithQualifiedHsaDeductions,
} from '../testData.js';
import makeGivenFacts from './functionalFlowUtils.js';
import { setupFactGraph } from '../setupFactGraph.js';
import { vi } from 'vitest';

const flow = createFlowConfig(flowNodes);
const givenFacts = makeGivenFacts(flow);

const w2Id = `0b1e355e-3d19-415d-8470-fbafd9f58361`;
const baseIncomeData = {
  '/formW2s': {
    $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
    item: { items: [`${w2Id}`] },
  },
  [`/formW2s/#${w2Id}/writableCombatPay`]: createDollarWrapper(`0.00`),
  [`/formW2s/#${w2Id}/writableDependentCareBenefits`]: createDollarWrapper(`0.00`),
  [`/formW2s/#${w2Id}/writableFederalWithholding`]: createDollarWrapper(`0.00`),
};

const made160kIncomeData = {
  ...baseIncomeData,
  [`/formW2s/#${w2Id}/writableWages`]: createDollarWrapper(`160000.00`),
};

const made200kIncomeData = {
  ...baseIncomeData,
  [`/formW2s/#${w2Id}/writableWages`]: createDollarWrapper(`200000.00`),
};

const made210kIncomeData = {
  ...baseIncomeData,
  [`/formW2s/#${w2Id}/writableWages`]: createDollarWrapper(`210000.00`),
};

const made260kIncomeData = {
  ...baseIncomeData,
  [`/formW2s/#${w2Id}/writableWages`]: createDollarWrapper(`260000.00`),
};

const singleFilerData = {
  ...baseFilerData,
  [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
  [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`),
};

const mfjFilerData = {
  ...baseFilerData,
  [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
  [`/filers/#${spouseId}/canBeClaimed`]: createBooleanWrapper(false),
  [`/filingStatus`]: createEnumWrapper(`marriedFilingJointly`, `/filingStatusOptions`),
};

const twoFilers = {
  '/filers': {
    $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
    item: { items: [primaryFilerId, spouseId] },
  },
};

describe(`Flow tests`, () => {
  describe(`for single filers`, () => {
    it(`routes you to the hsa qualified deductions screen when you had HSA deductions`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...singleFilerWithHsaDeductions,
      });

      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/deductions-intro`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/hsa-deduction-intro-qualified`);
    });
    it(`routes you to the hsa NO qualified deductions screen when you did not have HSA deductions`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...singleFilerData,
        [`/someFilerHadNonW2HsaActivity`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/deductions-intro`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/hsa-deduction-intro-not-qualified`);
    });
  });
  describe(`for MFJ filers`, () => {
    it(`routes you to the hsa qualified deductions screen when you and your spouse had HSA deductions`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...mfjBothWithQualifiedHsaDeductions,
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/deductions-intro`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/hsa-deduction-intro-qualified`);
    });
    it(`routes you to the hsa qualified deductions screen when you had HSA deductions`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...mfjPrimaryOnlyWithQualifiedHsaDeductions,
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/deductions-intro`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/hsa-deduction-intro-qualified`);
    });
    it(`routes you to the hsa qualified deductions screen when your spouse had HSA deductions`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...mfjSecondaryOnlyWithQualifiedHsaDeductions,
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/deductions-intro`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/hsa-deduction-intro-qualified`);
    });
    it(`routes you to the hsa NO qualified deductions screen when neither you or your spouse had HSA deductions`, ({
      task,
    }) => {
      const { factGraph } = setupFactGraph({
        ...mfjFilerData,
        [`/someFilerHadNonW2HsaActivity`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/deductions-intro`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/hsa-deduction-intro-not-qualified`);
    });
  });
  it(`moves you to standard deductions for MFJ dependents fromHSA deduction not qualified screen`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...baseFilerData,
      ...twoFilers,
      [`/filingStatus`]: createEnumWrapper(`marriedFilingJointly`, `/filingStatusOptions`),
      [`/filers/#${spouseId}/canBeClaimed`]: createBooleanWrapper(true),
      [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
      [`/maritalStatus`]: createEnumWrapper(`married`, `/maritalStatusOptions`),
      [`/MFJRequiredToFile`]: createBooleanWrapper(false),
      [`/MFJDependentsFilingForCredits`]: createBooleanWrapper(false),
    });
    expect(
      givenFacts(factGraph).atPath(
        `/flow/credits-and-deductions/deductions/hsa-deduction-intro-not-qualified`,
        null,
        task
      )
    ).toRouteNextTo(`/flow/credits-and-deductions/deductions/standard-deduction-intro`);
  });

  it(`moves you to eligible educator from HSA deduction not qualified screen`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...baseFilerData,
    });
    expect(
      givenFacts(factGraph).atPath(
        `/flow/credits-and-deductions/deductions/hsa-deduction-intro-not-qualified`,
        null,
        task
      )
    ).toRouteNextTo(`/flow/credits-and-deductions/deductions/eligible-educator`);
  });

  it(`moves you to secondary educator expenses from eligible educator`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...mfjFilerData,
      [`/wasK12Educators`]: createEnumWrapper(`bothDid`, `/k12EducatorOptions`),
    });
    expect(
      givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/eligible-educator`, null, task)
    ).toRouteNextTo(`/flow/credits-and-deductions/deductions/secondary-educator-expenses`);
  });

  it(`moves you to primary educator expenses from secondary educator expenses`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...mfjFilerData,
      [`/wasK12Educators`]: createEnumWrapper(`bothDid`, `/k12EducatorOptions`),
    });
    expect(
      givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/secondary-educator-expenses`, null, task)
    ).toRouteNextTo(`/flow/credits-and-deductions/deductions/primary-educator-expenses`);
  });

  it(`moves you to educator expenses summary from primary educator expenses`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...mfjFilerData,
      [`/wasK12Educators`]: createEnumWrapper(`bothDid`, `/k12EducatorOptions`),
    });
    expect(
      givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/primary-educator-expenses`, null, task)
    ).toRouteNextTo(`/flow/credits-and-deductions/deductions/educator-expenses-summary`);
  });

  it(`moves you to paid student loan interest from eligible educator screen`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...singleFilerData,
      [`/wasK12Educators`]: createEnumWrapper(`neither`, `/k12EducatorOptions`),
    });
    expect(
      givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/eligible-educator`, null, task)
    ).toRouteNextTo(`/flow/credits-and-deductions/deductions/paid-student-loan-interest`);
  });

  describe(`moves you to not qualified screen from eligible educator screen`, () => {
    it(`because of filing status`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/wasK12Educators`]: createEnumWrapper(`neither`, `/k12EducatorOptions`),
        [`/filingStatus`]: createEnumWrapper(`marriedFilingSeparately`, `/filingStatusOptions`),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/eligible-educator`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loan-interest-not-qualified`);
    });
    it(`because of income for non MFJ filing status`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/wasK12Educators`]: createEnumWrapper(`neither`, `/k12EducatorOptions`),
        [`/filingStatus`]: createEnumWrapper(`marriedFilingSeparately`, `/filingStatusOptions`),
        ...made160kIncomeData,
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/eligible-educator`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loan-interest-not-qualified`);
    });
    it(`because of income for MFJ filing status`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...mfjFilerData,
        [`/wasK12Educators`]: createEnumWrapper(`neither`, `/k12EducatorOptions`),
        ...made200kIncomeData,
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/eligible-educator`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loan-interest-not-qualified`);
    });
  });

  describe(`student loan deduction flows`, () => {
    it(`moves you to paid student loan interest from educator expense summary screen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...singleFilerData,
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/educator-expenses-summary`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/paid-student-loan-interest`);
    });
    describe(`moves you to not qualified screen from educator expense summary screen`, () => {
      it(`because of filing status`, ({ task }) => {
        const { factGraph } = setupFactGraph({
          ...baseFilerData,
          [`/filingStatus`]: createEnumWrapper(`marriedFilingSeparately`, `/filingStatusOptions`),
        });
        expect(
          givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/educator-expenses-summary`, null, task)
        ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loan-interest-not-qualified`);
      });
      it(`because of income for non MFJ filing status`, ({ task }) => {
        const { factGraph } = setupFactGraph({
          ...baseFilerData,
          [`/filingStatus`]: createEnumWrapper(`marriedFilingSeparately`, `/filingStatusOptions`),
          ...made160kIncomeData,
        });
        expect(
          givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/educator-expenses-summary`, null, task)
        ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loan-interest-not-qualified`);
      });
      it(`because of income for MFJ filing status`, ({ task }) => {
        const { factGraph } = setupFactGraph({
          ...mfjFilerData,
          ...made200kIncomeData,
        });
        expect(
          givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/educator-expenses-summary`, null, task)
        ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loan-interest-not-qualified`);
      });
      it(`because of dependency status`, ({ task }) => {
        const { factGraph } = setupFactGraph({
          ...baseFilerData,
          [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
          [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(true),
          [`/filers/#${primaryFilerId}/willBeClaimed`]: createBooleanWrapper(true),
        });
        expect(
          givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/educator-expenses-summary`, null, task)
        ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loan-interest-not-qualified`);
      });
    });

    it(`non MFJ moves you to the loans qualify screen from the paid student loan interest screen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...singleFilerData,
        [`/hadStudentLoanInterestPayments`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/paid-student-loan-interest`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loans-qualify`);
    });
    it(`MFJ moves you to the loans qualify screen from the paid student loan interest screen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...mfjFilerData,
        [`/hadStudentLoanInterestPayments`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/paid-student-loan-interest`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loans-qualify`);
    });
    it(`moves you to the standard deduction screen from the paid student loan interest screen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/hadStudentLoanInterestPayments`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/paid-student-loan-interest`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/standard-deduction-intro`);
    });

    it(`non MFJ moves you to the loans qualify screen from the paid student loan interest screen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...singleFilerData,
        [`/hadStudentLoanInterestPayments`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/paid-student-loan-interest`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loans-qualify`);
    });

    it(`MFJ moves you to the loans qualify screen from the paid student loan interest screen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...mfjFilerData,
        [`/hadStudentLoanInterestPayments`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/paid-student-loan-interest`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loans-qualify`);
    });

    it(`moves you to the interest amount screen from the loans qualify screen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...singleFilerData,
        [`/hadStudentLoanInterestPayments`]: createBooleanWrapper(true),
        [`/studentLoansQualify`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/student-loans-qualify`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loan-interest-amount`);
    });
    it(`moves you to not qualified screen from the loans qualify screen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...singleFilerData,
        [`/hadStudentLoanInterestPayments`]: createBooleanWrapper(true),
        [`/studentLoansQualify`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/student-loans-qualify`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loan-interest-not-qualified`);
    });

    it(`moves you to the student loan interest summary screen from the interest amount screen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...singleFilerData,
        [`/hadStudentLoanInterestPayments`]: createBooleanWrapper(true),
        [`/studentLoansQualify`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/student-loan-interest-amount`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/student-loan-interest-summary`);
    });
  });

  it(`moves you to standard deduction from the student loan summary`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...baseFilerData,
    });
    expect(
      givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/student-loan-interest-summary`, null, task)
    ).toRouteNextTo(`/flow/credits-and-deductions/deductions/standard-deduction-intro`);
  });

  it(`moves you to taxable income summary from the standard deduction screen`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...baseFilerData,
    });
    expect(
      givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/standard-deduction-intro`, null, task)
    ).toRouteNextTo(`/flow/credits-and-deductions/deductions/taxable-income-summary`);
  });

  describe(`knockout flows`, () => {
    const interestReportId = `e3500950-f30e-4d55-aed9-7269119de031`;
    const baseFilerWithInterestIncome = {
      ...baseFilerData,
      '/interestReports': {
        $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
        item: { items: [`${interestReportId}`] },
      },
      [`/interestReports/#${interestReportId}/has1099`]: createBooleanWrapper(true),
      [`/interestReports/#${interestReportId}/writable1099Amount`]: createDollarWrapper(`600`),
      '/socialSecurityReports': { $type: `gov.irs.factgraph.persisters.CollectionWrapper`, item: { items: [] } },
      '/form1099Gs': { $type: `gov.irs.factgraph.persisters.CollectionWrapper`, item: { items: [] } },
      [`/flowHasSeenDeductions`]: createBooleanWrapper(true),
      [`/wasK12Educators`]: createEnumWrapper(`neither`, `/k12EducatorOptions`),
      [`/hadStudentLoanInterestPayments`]: createBooleanWrapper(false),
    };

    it(`MFS - moves you to the knockout screen after taxable income summary if you exceed MFS limit`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerWithInterestIncome,
        ...made160kIncomeData,
        [`/filingStatus`]: createEnumWrapper(`marriedFilingSeparately`, `/filingStatusOptions`),
        // Special condition for MFS needed to make livedApartAllYear complete
        // livedApartAllYear -> socialSecurityBenefitsWkshtLine16 -> taxableSocialSecurityBenefits -> totalIncome -> agi
        [`/livedTogetherAllYearWithSpouse`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/taxable-income-summary`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/net-investment-mfs-ko`);
    });
    it(`MFS - moves you to taxable income summary if you exceed MFS limit and haven't seen entire flow`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerWithInterestIncome,
        ...made160kIncomeData,
        [`/filingStatus`]: createEnumWrapper(`marriedFilingSeparately`, `/filingStatusOptions`),
        // Special condition for MFS needed to make livedApartAllYear complete
        // livedApartAllYear -> socialSecurityBenefitsWkshtLine16 -> taxableSocialSecurityBenefits -> totalIncome -> agi
        [`/livedTogetherAllYearWithSpouse`]: createBooleanWrapper(true),
        [`/flowHasSeenDeductions`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/standard-deduction-intro`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/taxable-income-summary`);
    });

    it(`MFJ - moves you to the knockout screen after taxable income summary if you exceed MFJ/QSS limit`, ({
      task,
    }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerWithInterestIncome,
        [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
        [`/filers/#${spouseId}/canBeClaimed`]: createBooleanWrapper(false),
        ...made260kIncomeData,
        [`/filingStatus`]: createEnumWrapper(`marriedFilingJointly`, `/filingStatusOptions`),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/taxable-income-summary`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/net-investment-mfj-qss-ko`);
    });
    it(`QSS - moves you to the knockout screen after taxable income summary if you exceed MFJ/QSS limit`, ({
      task,
    }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerWithInterestIncome,
        ...made260kIncomeData,
        [`/filingStatus`]: createEnumWrapper(`qualifiedSurvivingSpouse`, `/filingStatusOptions`),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/taxable-income-summary`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/net-investment-mfj-qss-ko`);
    });
    it(`MFJ - moves you to taxable income summary if you exceed MFJ/QSS limit and haven't seen entire flow`, ({
      task,
    }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerWithInterestIncome,
        [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
        [`/filers/#${spouseId}/canBeClaimed`]: createBooleanWrapper(false),
        ...made260kIncomeData,
        [`/filingStatus`]: createEnumWrapper(`marriedFilingJointly`, `/filingStatusOptions`),
        [`/flowHasSeenDeductions`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/standard-deduction-intro`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/taxable-income-summary`);
    });
    it(`QSS - moves you to taxable income summary if you exceed MFJ/QSS limit and haven't seen entire flow`, ({
      task,
    }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerWithInterestIncome,
        ...made260kIncomeData,
        [`/filingStatus`]: createEnumWrapper(`qualifiedSurvivingSpouse`, `/filingStatusOptions`),
        [`/flowHasSeenDeductions`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/standard-deduction-intro`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/taxable-income-summary`);
    });

    it(`Single - moves you to the knockout screen after taxable income summary if you exceed Single/HoH limit`, ({
      task,
    }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerWithInterestIncome,
        ...made210kIncomeData,
        [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/taxable-income-summary`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/net-investment-single-hoh-ko`);
    });
    it(`HoH - moves you to the knockout screen after taxable income summary if you exceed Single/HoH limit`, ({
      task,
    }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerWithInterestIncome,
        ...made210kIncomeData,
        [`/filingStatus`]: createEnumWrapper(`headOfHousehold`, `/filingStatusOptions`),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/taxable-income-summary`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/net-investment-single-hoh-ko`);
    });
    // eslint-disable-next-line max-len
    it(`Single - moves you to taxable income summary if you exceed Single/HoH limit and haven't seen entire flow`, ({
      task,
    }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerWithInterestIncome,
        ...made210kIncomeData,
        [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`),
        [`/flowHasSeenDeductions`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/standard-deduction-intro`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/taxable-income-summary`);
    });
    it(`HoH - moves you to taxable income summary if you exceed Single/HoH limit and haven't seen entire flow`, ({
      task,
    }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerWithInterestIncome,
        ...made210kIncomeData,
        [`/filingStatus`]: createEnumWrapper(`headOfHousehold`, `/filingStatusOptions`),
        [`/flowHasSeenDeductions`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/standard-deduction-intro`, null, task)
      ).toRouteNextTo(`/flow/credits-and-deductions/deductions/taxable-income-summary`);
    });
  });

  it(`moves you to checklist from the taxable income summary screen`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...baseFilerData,
    });
    expect(
      givenFacts(factGraph).atPath(`/flow/credits-and-deductions/deductions/taxable-income-summary`, null, task)
    ).toRouteNextTo(`/data-view/flow/credits-and-deductions/deductions`);
  });
});

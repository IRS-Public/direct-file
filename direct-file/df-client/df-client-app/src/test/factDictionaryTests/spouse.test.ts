import { it, describe, expect } from 'vitest';
import { Path } from '../../flow/Path.js';
import { createBooleanWrapper, createEnumWrapper } from '../persistenceWrappers.js';
import { baseFilerData, primaryFilerId, spouseId } from '../testData.js';
import { setupFactGraph } from '../setupFactGraph.js';

const twoFilers = {
  '/filers': {
    $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
    item: { items: [primaryFilerId, spouseId] },
  },
};

describe(`MFJ dependents`, () => {
  it(`MFJ dependent because of spouse`, ({ task }) => {
    task.meta.testedFactPaths = [`/isMFJDependent`];

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
    expect(factGraph.get(Path.concretePath(`/isMFJDependent`, null)).get).toBe(true);
  });

  it(`MFJ dependent because of primary filer must file`, ({ task }) => {
    task.meta.testedFactPaths = [`/isMFJDependent`];

    const { factGraph } = setupFactGraph({
      ...baseFilerData,
      ...twoFilers,
      [`/filingStatus`]: createEnumWrapper(`marriedFilingJointly`, `/filingStatusOptions`),
      [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
      [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(true),
      [`/filers/#${spouseId}/canBeClaimed`]: createBooleanWrapper(false),
      [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
      [`/maritalStatus`]: createEnumWrapper(`married`, `/maritalStatusOptions`),
      [`/MFJRequiredToFile`]: createBooleanWrapper(false),
      [`/MFJDependentsFilingForCredits`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/isMFJDependent`, null)).get).toBe(true);
  });

  it(`MFJ dependent because of primary filer even when they are not required to file`, ({ task }) => {
    task.meta.testedFactPaths = [`/isMFJDependent`];

    const { factGraph } = setupFactGraph({
      ...baseFilerData,
      ...twoFilers,
      [`/filingStatus`]: createEnumWrapper(`marriedFilingJointly`, `/filingStatusOptions`),
      [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
      [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(false),
      [`/filers/#${primaryFilerId}/potentialClaimerDidFile`]: createBooleanWrapper(true),
      [`/primaryFilerPotentialClaimerFiledOnlyForRefund`]: createBooleanWrapper(false),
      [`/filers/#${spouseId}/canBeClaimed`]: createBooleanWrapper(false),
      [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
      [`/maritalStatus`]: createEnumWrapper(`married`, `/maritalStatusOptions`),
      [`/MFJRequiredToFile`]: createBooleanWrapper(false),
      [`/MFJDependentsFilingForCredits`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/isMFJDependent`, null)).get).toBe(true);
  });
});

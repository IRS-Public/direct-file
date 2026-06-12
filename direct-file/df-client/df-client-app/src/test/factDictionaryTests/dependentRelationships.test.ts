import { ConcretePath, ScalaList, scalaListToJsArray } from '@irs/js-factgraph-scala';
import { Path } from '../../flow/Path.js';
import { createEnumWrapper, createCollectionWrapper } from '../persistenceWrappers.js';
import { describe, it, expect } from 'vitest';
import { setupFactGraphDeprecated } from '../setupFactGraph.js';
const childId = `4fa3a5a7-a9d1-43a9-a0fb-277596e70d48`;

describe(`Relationship tests`, () => {
  const relationshipScenarios = [
    {
      relationshipCategory: `childOrDescendants`,
      relationship: `stepChild`,
      relationshipOptionName: `stepChild`,
      qc: true,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: true,
      xmlName: `STEPCHILD`,
    },
    {
      relationshipCategory: `childOrDescendants`,
      relationship: `adoptedChild`,
      relationshipOptionName: `adoptedChild`,
      qc: true,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: true,
      xmlName: `DAUGHTER`,
    },
    {
      relationshipCategory: `childOrDescendants`,
      relationship: `biologicalChild`,
      relationshipOptionName: `biologicalChild`,
      qc: true,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: true,
      xmlName: `DAUGHTER`,
    },
    {
      relationshipCategory: `childOrDescendants`,
      relationship: `fosterChild`,
      relationshipOptionName: `fosterChild`,
      qc: true,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: true,
      xmlName: `FOSTER CHILD`,
    },
    {
      relationshipCategory: `childOrDescendants`,
      relationship: `grandChildOrOtherDescendantOfChild`,
      relationshipOptionName: `grandChildOrOtherDescendantOfChild`,
      qc: true,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `GRANDCHILD`,
    },
    {
      relationshipCategory: `siblingOrDescendants`,
      relationship: `sibling`,
      relationshipOptionName: `sibling`,
      qc: true,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `SISTER`,
    },
    {
      relationshipCategory: `siblingOrDescendants`,
      relationship: `childOfSibling`,
      relationshipOptionName: `childOfSibling`,
      qc: true,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `NEPHEW`,
    },
    {
      relationshipCategory: `siblingOrDescendants`,
      relationship: `otherDescendantOfSibling`,
      relationshipOptionName: `otherDescendantOfSibling`,
      qc: true,
      // this is correct -- pub 501 specifies only a sibling's son or daughter. Nothing further.
      qrWithoutMemberOfHousehold: false,
      marriedHohQp: false,
      xmlName: `NEPHEW`,
    },
    {
      relationshipCategory: `siblingOrDescendants`,
      relationship: `halfSibling`,
      relationshipOptionName: `halfSibling`,
      qc: true,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `HALF SISTER`,
    },
    {
      relationshipCategory: `siblingOrDescendants`,
      relationship: `childOfHalfSibling`,
      relationshipOptionName: `childOfHalfSibling`,
      qc: true,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `NEPHEW`,
    },
    {
      relationshipCategory: `siblingOrDescendants`,
      relationship: `otherDescendantOfHalfSibling`,
      relationshipOptionName: `otherDescendantOfHalfSibling`,
      qc: true,
      qrWithoutMemberOfHousehold: false, // this is correct -- pub 501 specifies only a half-sibling's son or daughter.
      marriedHohQp: false,
      xmlName: `NEPHEW`,
    },
    {
      relationshipCategory: `siblingOrDescendants`,
      relationship: `stepSibling`,
      relationshipOptionName: `stepSibling`,
      qc: true,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `STEPBROTHER`,
    },
    {
      relationshipCategory: `siblingOrDescendants`,
      relationship: `childOfStepSibling`,
      relationshipOptionName: `childOfStepSibling`,
      qc: true,
      // this is correct -- pub 501 specifies only children of half + full siblings, no stepsiblings.
      qrWithoutMemberOfHousehold: false,
      marriedHohQp: false,
      xmlName: `NEPHEW`,
    },
    {
      relationshipCategory: `siblingOrDescendants`,
      relationship: `otherDescendantOfStepSibling`,
      relationshipOptionName: `otherDescendantOfStepSibling`,
      qc: true,
      // this is correct -- pub 501 specifies only children of half + full siblings, no stepsiblings.
      qrWithoutMemberOfHousehold: false,
      marriedHohQp: false,
      xmlName: `NEPHEW`,
    },
    {
      relationshipCategory: `parentOrAncestors`,
      relationship: `parent`,
      relationshipOptionName: `parent`,
      qc: false,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `PARENT`,
    },
    {
      relationshipCategory: `parentOrAncestors`,
      relationship: `stepParent`,
      relationshipOptionName: `stepParent`,
      qc: false,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `PARENT`,
    },
    {
      relationshipCategory: `parentOrAncestors`,
      relationship: `fosterParent`,
      relationshipOptionName: `fosterParent`,
      qc: false,
      qrWithoutMemberOfHousehold: false,
      marriedHohQp: false,
      xmlName: `OTHER`,
    },
    {
      relationshipCategory: `parentOrAncestors`,
      relationship: `grandParent`,
      relationshipOptionName: `grandParent`,
      qc: false,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `GRANDPARENT`,
    },
    {
      relationshipCategory: `parentOrAncestors`,
      relationship: `otherAncestorOfParent`,
      relationshipOptionName: `otherAncestorOfParent`,
      qc: false,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `GRANDPARENT`,
    },
    {
      relationshipCategory: `parentOrAncestors`,
      relationship: `siblingOfParent`,
      relationshipOptionName: `siblingOfParent`,
      qc: false,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `UNCLE`,
    },
    {
      relationshipCategory: `inlaws`,
      relationship: `childInLaw`,
      relationshipOptionName: `childInLaw`,
      qc: false,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `DAUGHTER`,
    },
    {
      relationshipCategory: `inlaws`,
      relationship: `parentInLaw`,
      relationshipOptionName: `parentInLaw`,
      qc: false,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `PARENT`,
    },
    {
      relationshipCategory: `inlaws`,
      relationship: `siblingInLaw`,
      relationshipOptionName: `siblingInLaw`,
      qc: false,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `SISTER`,
    },
    {
      relationshipCategory: `inlaws`,
      relationship: `siblingsSpouse`,
      relationshipOptionName: `siblingsSpouse`,
      qc: false,
      qrWithoutMemberOfHousehold: true,
      marriedHohQp: false,
      xmlName: `SISTER`,
    },
    {
      relationshipCategory: `notRelated`,
      relationshipOptionName: `noneOfTheAbove`,
      relationship: `notneeded`,
      qc: false,
      qrWithoutMemberOfHousehold: false,
      marriedHohQp: false,
      xmlName: `NONE`,
    },
  ];

  it(`Test comprehensiveness`, () => {
    const { factGraph } = setupFactGraphDeprecated({});
    const relationshipOptions: string[] = scalaListToJsArray(
      factGraph.get(`/relationshipOptions` as ConcretePath).get as ScalaList<string>
    );
    const testedRelationshipOptions = relationshipScenarios.map((r) => r.relationshipOptionName).sort();
    expect(relationshipOptions.sort()).toEqual(testedRelationshipOptions);
  });
  it(`QC relationship tests`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/qcRelationshipTest`];
    relationshipScenarios.forEach((sc) => {
      const { factGraph } = setupFactGraphDeprecated({
        '/familyAndHousehold': createCollectionWrapper([childId]),
        [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
          sc.relationshipCategory,
          `/relationshipCategoryOptions`
        ),
        ...(sc.relationshipCategory === `childOrDescendants` && {
          [`/familyAndHousehold/#${childId}/childRelationship`]: createEnumWrapper(
            sc.relationship,
            `/childRelationshipOptions`
          ),
        }),
        ...(sc.relationshipCategory === `siblingOrDescendants` && {
          [`/familyAndHousehold/#${childId}/siblingRelationship`]: createEnumWrapper(
            sc.relationship,
            `/siblingRelationshipOptions`
          ),
        }),
        ...(sc.relationshipCategory === `parentOrAncestors` && {
          [`/familyAndHousehold/#${childId}/parentalRelationship`]: createEnumWrapper(
            sc.relationship,
            `/parentalRelationshipOptions`
          ),
        }),
        ...(sc.relationshipCategory === `inlaws` && {
          [`/familyAndHousehold/#${childId}/inlawRelationship`]: createEnumWrapper(
            sc.relationship,
            `/inlawRelationshipOptions`
          ),
        }),
      });
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/qcRelationshipTest`, childId)).get,
        `Test for ${sc.relationshipOptionName}`
      ).toBe(sc.qc);
    });
  });

  it(`QR relationship tests`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/qrRelationshipTest`];
    relationshipScenarios.forEach((sc) => {
      const { factGraph } = setupFactGraphDeprecated({
        '/familyAndHousehold': createCollectionWrapper([childId]),
        [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
          sc.relationshipCategory,
          `/relationshipCategoryOptions`
        ),
        ...(sc.relationshipCategory === `childOrDescendants` && {
          [`/familyAndHousehold/#${childId}/childRelationship`]: createEnumWrapper(
            sc.relationship,
            `/childRelationshipOptions`
          ),
        }),
        ...(sc.relationshipCategory === `siblingOrDescendants` && {
          [`/familyAndHousehold/#${childId}/siblingRelationship`]: createEnumWrapper(
            sc.relationship,
            `/siblingRelationshipOptions`
          ),
        }),
        ...(sc.relationshipCategory === `parentOrAncestors` && {
          [`/familyAndHousehold/#${childId}/parentalRelationship`]: createEnumWrapper(
            sc.relationship,
            `/parentalRelationshipOptions`
          ),
        }),
        ...(sc.relationshipCategory === `inlaws` && {
          [`/familyAndHousehold/#${childId}/inlawRelationship`]: createEnumWrapper(
            sc.relationship,
            `/inlawRelationshipOptions`
          ),
        }),
      });
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/qrRelationshipTest`, childId)).get,
        `Test for ${sc.relationshipOptionName}`
      ).toBe(sc.qrWithoutMemberOfHousehold);
    });
  });

  it(`Married but HoH relationship tests`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/marriedHohRelationshipTest`];
    relationshipScenarios.forEach((sc) => {
      const { factGraph } = setupFactGraphDeprecated({
        '/familyAndHousehold': createCollectionWrapper([childId]),
        [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
          sc.relationshipCategory,
          `/relationshipCategoryOptions`
        ),
        ...(sc.relationshipCategory === `childOrDescendants` && {
          [`/familyAndHousehold/#${childId}/childRelationship`]: createEnumWrapper(
            sc.relationship,
            `/childRelationshipOptions`
          ),
        }),
        ...(sc.relationshipCategory === `siblingOrDescendants` && {
          [`/familyAndHousehold/#${childId}/siblingRelationship`]: createEnumWrapper(
            sc.relationship,
            `/siblingRelationshipOptions`
          ),
        }),
        ...(sc.relationshipCategory === `parentOrAncestors` && {
          [`/familyAndHousehold/#${childId}/parentalRelationship`]: createEnumWrapper(
            sc.relationship,
            `/parentalRelationshipOptions`
          ),
        }),
        ...(sc.relationshipCategory === `inlaws` && {
          [`/familyAndHousehold/#${childId}/inlawRelationship`]: createEnumWrapper(
            sc.relationship,
            `/inlawRelationshipOptions`
          ),
        }),
      });
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/marriedHohRelationshipTest`, childId)).get,
        `Test for ${sc.relationshipOptionName}`
      ).toBe(sc.marriedHohQp);
    });
  });

  it(`Relationship flattening`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/relationship`, `familyAndHousehold/*/xmlRelationship`];
    relationshipScenarios.forEach((sc) => {
      const { factGraph } = setupFactGraphDeprecated({
        '/familyAndHousehold': createCollectionWrapper([childId]),
        [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
          sc.relationshipCategory,
          `/relationshipCategoryOptions`
        ),
        ...(sc.relationshipCategory === `childOrDescendants` && {
          [`/familyAndHousehold/#${childId}/childRelationship`]: createEnumWrapper(
            sc.relationship,
            `/childRelationshipOptions`
          ),
        }),
        ...(sc.relationshipCategory === `siblingOrDescendants` && {
          [`/familyAndHousehold/#${childId}/siblingRelationship`]: createEnumWrapper(
            sc.relationship,
            `/siblingRelationshipOptions`
          ),
        }),
        ...(sc.relationshipCategory === `parentOrAncestors` && {
          [`/familyAndHousehold/#${childId}/parentalRelationship`]: createEnumWrapper(
            sc.relationship,
            `/parentalRelationshipOptions`
          ),
        }),
        ...(sc.relationshipCategory === `inlaws` && {
          [`/familyAndHousehold/#${childId}/inlawRelationship`]: createEnumWrapper(
            sc.relationship,
            `/inlawRelationshipOptions`
          ),
        }),
      });
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/relationship`, childId)).get.getValue(),
        `Test for ${sc.relationshipOptionName}`
      ).toBe(sc.relationshipOptionName);
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/xmlRelationship`, childId)).get,
        `Test for ${sc.relationshipOptionName}`
      ).toBe(sc.xmlName);
    });
  });
});

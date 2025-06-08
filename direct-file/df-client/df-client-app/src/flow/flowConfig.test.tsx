import { beforeEach, it, describe, expect } from 'vitest';
import { FakeFactGraph } from '../misc/factgraphTestHelpers.js';
import {
  Flow,
  Gate,
  Category,
  Subcategory,
  Screen,
  CollectionLoop,
  SubSubcategory,
  Assertion,
} from './flowDeclarations.js';
import {
  Address,
  SetFactAction,
  Heading,
  InfoDisplay,
  GenericString,
  SaveAndOrContinueButton,
  SubmitButton,
} from './ContentDeclarations.js';
import { FlowConfig, createFlowConfig } from './flowConfig.js';

const flow = (
  <Flow>
    <Category route='cat1'>
      <Subcategory
        route='sub1'
        completeIf={{ operator: `isComplete`, condition: `/filers/*/lastName` }}
        displayOnlyIf={{ operator: `isFalse`, condition: `/receivedDigitalAssets` }}
      >
        <SubSubcategory route='subsub1'>
          <Assertion type='info' i18nKey='/foo' condition={`/isMarried`} editRoute={`/foo`} />
          <Screen route='one'>
            <Heading i18nKey='/foo' />
            <InfoDisplay i18nKey='/info/your-and-your-family/you/intro' />
            <SaveAndOrContinueButton />
          </Screen>
          <CollectionLoop loopName='loop' collection='/filers'>
            <Screen route='two'>
              <Heading i18nKey='/foo' />
              <GenericString path='/filers/*/firstName' />
              <GenericString path='/filers/*/middleInitial' />
              <GenericString path='/filers/*/lastName' />
              <SaveAndOrContinueButton />
            </Screen>
          </CollectionLoop>
        </SubSubcategory>
      </Subcategory>
      <Subcategory route='sub2' completeIf={{ operator: `isComplete`, condition: `/email` }}>
        <SubSubcategory route='subsub2'>
          <Screen route='one'>
            <Heading i18nKey='/foo' />
            <GenericString path='/email' />
            <SaveAndOrContinueButton />
          </Screen>
          <Gate condition='/isMarried'>
            <Screen route='two'>
              <Heading i18nKey='/foo' />
              <GenericString path='/email' />
              <SaveAndOrContinueButton />
            </Screen>
            <Gate condition='/isWidowed'>
              <Screen route='three'>
                <Heading i18nKey='/foo' />
                <GenericString path='/email' />
                <SaveAndOrContinueButton />
              </Screen>
              <Screen route='four' condition='/receivedDigitalAssets'>
                <Heading i18nKey='/foo' />
                <GenericString path='/email' />
                <SaveAndOrContinueButton />
              </Screen>
              <Screen route='five'>
                <Heading i18nKey='/foo' />
                <GenericString path='/email' />
                <SaveAndOrContinueButton />
              </Screen>
              <Screen route='six'>
                <Heading i18nKey='/foo' />
                <GenericString path='/email' />
                <SaveAndOrContinueButton />
              </Screen>
              <Screen route='seven'>
                <Heading i18nKey='/foo' />
                <GenericString path='/email' />
                <SaveAndOrContinueButton />
              </Screen>
            </Gate>
            <Screen route='eight'>
              <Heading i18nKey='/foo' />
              <GenericString path='/email' />
              <SaveAndOrContinueButton />
            </Screen>
          </Gate>
          <Screen route='nine'>
            <Heading i18nKey='/foo' />
            <GenericString path='/email' />
            <SaveAndOrContinueButton />
          </Screen>
        </SubSubcategory>
      </Subcategory>
    </Category>
    <Category route='cat2'>
      <Subcategory route='sub2' completeIf={{ operator: `isComplete`, condition: `/address` }}>
        <SubSubcategory route='subsub2'>
          <Gate condition='/flowIsKnockedOut'>
            <Gate condition='/isMarried'>
              <Screen route='one' condition='/filers/*/isBlind'>
                <Heading i18nKey='/foo' />
                <Address path='/address' />
                <SaveAndOrContinueButton />
              </Screen>
            </Gate>
          </Gate>
        </SubSubcategory>
      </Subcategory>
      <Subcategory route='sub3' completeIf={{ operator: `isComplete`, condition: `/filers/*/firstName` }}>
        <SubSubcategory route='subsub3'>
          <CollectionLoop collection='/filers' loopName='/filers'>
            <Screen route='one' condition='/filers/*/age65OrOlder'>
              <Heading i18nKey='/foo' />
              <GenericString path='/email' />
              <SetFactAction path='/filers/*/firstName' source='/filers/*/lastName' />
              <SaveAndOrContinueButton />
            </Screen>
          </CollectionLoop>
        </SubSubcategory>
      </Subcategory>
      {/* This subcategory tests loop overrides! */}
      <Subcategory
        route='sub4'
        completeIf={{ operator: `isComplete`, condition: `/filers/*/firstName` }}
        collectionContext='/filers'
        skipDataView={true}
      >
        <SubSubcategory route='one'>
          <Screen route='one' condition='/filers/*/age65OrOlder'>
            <Heading i18nKey='/foo' />
            <GenericString path='/email' />
            <SetFactAction path='/filers/*/firstName' source='/filers/*/lastName' />
            <SaveAndOrContinueButton />
          </Screen>
        </SubSubcategory>
        <CollectionLoop
          collection='/familyAndHousehold'
          loopName='/familyAndHousehold'
          iconName='Person'
          collectionItemCompletedCondition='/familyAndHousehold/*/isCompleted'
          donePath='/familyAndHouseholdIsDone'
          dataViewSections={[
            { i18nKey: `/claimed`, condition: `/familyAndHousehold/*/isClaimedDependent` },
            {
              i18nKey: `/unclaimed`,
              condition: { operator: `isFalse`, condition: `/familyAndHousehold/*/isClaimedDependent` },
            },
          ]}
          knockoutRoute='/flow/income/social-security/social-security-summary-negative-ko'
        >
          <SubSubcategory route='two'>
            <Screen route='two' condition='/filers/*/age65OrOlder'>
              <Heading i18nKey='/foo' />
              <GenericString path='/familyAndHousehold/*/firstName' />
              <SubmitButton />
            </Screen>
          </SubSubcategory>
        </CollectionLoop>
      </Subcategory>
    </Category>
  </Flow>
);

describe(`FlowConfig`, () => {
  interface LocalTestContext {
    flowConfig: FlowConfig;
  }

  beforeEach<LocalTestContext>(async (context) => {
    context.flowConfig = createFlowConfig(flow);
  });

  it<LocalTestContext>(`flattens the overall structure into a list of screens`, ({ flowConfig }) => {
    expect(flowConfig.screens.length).toBe(15);
  });

  it<LocalTestContext>(`getAllScreens creates nested URLs based on flow, category, and subcategory`, ({
    flowConfig,
  }) => {
    const allRoutes = flowConfig.screens.map((screenInfo) => screenInfo.screenRoute);
    const expectedRoutes = [
      `/flow/cat1/sub1/one`,
      `/flow/cat1/sub1/two`,
      `/flow/cat1/sub2/one`,
      `/flow/cat1/sub2/two`,
      `/flow/cat1/sub2/three`,
      `/flow/cat1/sub2/four`,
      `/flow/cat1/sub2/five`,
      `/flow/cat1/sub2/six`,
      `/flow/cat1/sub2/seven`,
      `/flow/cat1/sub2/eight`,
      `/flow/cat1/sub2/nine`,
      `/flow/cat2/sub2/one`,
      `/flow/cat2/sub3/one`,
      `/flow/cat2/sub4/one`,
      `/flow/cat2/sub4/two`,
    ];
    expect(allRoutes).toStrictEqual(expectedRoutes);
    expect(Array.from(flowConfig.screensByRoute.keys())).toStrictEqual(expectedRoutes);
  });

  it<LocalTestContext>(`Links the category and subcategory route with each screen`, ({ flowConfig }) => {
    for (const screen of flowConfig.screens) {
      switch (screen.screenRoute) {
        case `/flow/cat1/sub1/one`:
          expect(screen.categoryRoute).toBe(`/flow/cat1`);
          expect(screen.subcategoryRoute).toBe(`/flow/cat1/sub1`);
          break;
        case `/flow/cat1/sub1/two`:
          expect(screen.categoryRoute).toBe(`/flow/cat1`);
          expect(screen.subcategoryRoute).toBe(`/flow/cat1/sub1`);
          break;
        case `/flow/cat2/sub2/one`:
          expect(screen.categoryRoute).toBe(`/flow/cat2`);
          expect(screen.subcategoryRoute).toBe(`/flow/cat2/sub2`);
          break;
        case `/flow/cat2/sub3/one`:
          expect(screen.categoryRoute).toBe(`/flow/cat2`);
          expect(screen.subcategoryRoute).toBe(`/flow/cat2/sub3`);
          break;
      }
    }
  });

  it<LocalTestContext>(`grabs conditions for screens that have them`, ({ flowConfig }) => {
    const nestedConditionScreen = flowConfig.screensByRoute.get(`/flow/cat2/sub2/one`);
    const standaloneConditionScreen = flowConfig.screensByRoute.get(`/flow/cat2/sub3/one`);
    const noConditionScreen = flowConfig.screensByRoute.get(`/flow/cat1/sub1/one`);
    expect(nestedConditionScreen?.conditions).toStrictEqual([`/flowIsKnockedOut`, `/isMarried`, `/filers/*/isBlind`]);
    expect(standaloneConditionScreen?.conditions).toStrictEqual([`/filers/*/age65OrOlder`]);
    expect(noConditionScreen?.conditions).toStrictEqual([]);
  });

  it<LocalTestContext>(`includes collection context and collection loop info with each screen`, ({ flowConfig }) => {
    for (const screen of flowConfig.screens) {
      switch (screen.screenRoute) {
        case `/flow/cat1/sub1/one`:
          expect(screen.collectionLoop).toBeUndefined();
          expect(screen.collectionContext).toBeUndefined();
          break;
        case `/flow/cat1/sub1/two`:
          expect(screen.collectionLoop?.loopName).toBe(`loop`);
          expect(screen.collectionContext).toBe(`/filers`);
          break;
        case `/flow/cat2/sub2/one`:
          expect(screen.collectionLoop).toBeUndefined();
          expect(screen.collectionContext).toBeUndefined();
          break;
        case `/flow/cat2/sub3/one`:
          expect(screen.collectionLoop?.loopName).toBe(`/filers`);
          expect(screen.collectionContext).toBe(`/filers`);
          break;
        case `/flow/cat2/sub4/one`:
          expect(screen.collectionLoop).toBeUndefined();
          expect(screen.collectionContext).toBe(`/filers`);
          break;
      }
    }
  });

  it<LocalTestContext>(`collection context can come from subcategory or be overridden by a CollectionLoop`, ({
    flowConfig,
  }) => {
    for (const screen of flowConfig.screens) {
      switch (screen.screenRoute) {
        case `/flow/cat2/sub4/one`:
          expect(screen.collectionContext).toBe(`/filers`);
          break;
        case `/flow/cat2/sub4/two`:
          expect(screen.collectionContext).toBe(`/familyAndHousehold`);
          break;
      }
    }
  });

  it<LocalTestContext>(`creates screen content nodes for each screen`, ({ flowConfig }) => {
    const screen = flowConfig.screensByRoute.get(`/flow/cat1/sub1/two`);
    expect(screen).not.toBeUndefined();
    expect(screen?.content.length).toBe(5);
    expect(screen?.content.map((contentItem) => contentItem.componentName)).toStrictEqual([
      `Heading`,
      ...new Array<string>(3).fill(`GenericString`),
      `SaveAndOrContinueButton`,
    ]);
  });

  it<LocalTestContext>(`calculates nested conditions: all true`, ({ flowConfig }) => {
    const fg = new FakeFactGraph(
      new Map([
        [`/isMarried`, true],
        [`/isWidowed`, true],
        [`/receivedDigitalAssets`, true],
      ])
    );

    expect(flowConfig.screensByRoute.get(`/flow/cat1/sub2/four`)?.isAvailable(fg, null)).toBeTruthy();
  });

  it<LocalTestContext>(`calculates nested conditions:  top false`, ({ flowConfig }) => {
    const fg = new FakeFactGraph(
      new Map([
        [`/isMarried`, false],
        [`/isWidowed`, true],
        [`/receivedDigitalAssets`, true],
      ])
    );
    expect(flowConfig.screensByRoute.get(`/flow/cat1/sub2/three`)?.isAvailable(fg, null)).toBeFalsy();
  });

  it<LocalTestContext>(` calculates nested conditions: nested false`, ({ flowConfig }) => {
    const fg = new FakeFactGraph(
      new Map([
        [`/isMarried`, true],
        [`/isWidowed`, false],
        [`/receivedDigitalAssets`, true],
      ])
    );
    expect(flowConfig.screensByRoute.get(`/flow/cat1/sub2/two`)?.isAvailable(fg, null)).toBeTruthy();
    expect(flowConfig.screensByRoute.get(`/flow/cat1/sub2/three`)?.isAvailable(fg, null)).toBeFalsy();
  });

  it<LocalTestContext>(` calculates nested conditions: inner false`, ({ flowConfig }) => {
    const fg = new FakeFactGraph(
      new Map([
        [`/isMarried`, true],
        [`/isWidowed`, true],
        [`/receivedDigitalAssets`, false],
      ])
    );
    expect(flowConfig.screensByRoute.get(`/flow/cat1/sub2/four`)?.isAvailable(fg, null)).toBeFalsy();
  });

  it<LocalTestContext>(`marks subcategories without a data views`, ({ flowConfig }) => {
    const subcat4 = flowConfig.subcategoriesByRoute.get(`/flow/cat2/sub4`);
    expect(subcat4?.hasDataView).toBe(false);
  });

  it<LocalTestContext>(`marks subcategories with a data views`, ({ flowConfig }) => {
    const subcat4 = flowConfig.subcategoriesByRoute.get(`/flow/cat2/sub3`);
    expect(subcat4?.hasDataView).toBe(true);
  });
  it<LocalTestContext>(`marks subcategories with collection contexts`, ({ flowConfig }) => {
    const subcat4 = flowConfig.subcategoriesByRoute.get(`/flow/cat2/sub4`);
    expect(subcat4?.collectionName).toBe(`/filers`);
  });

  describe(`parses categories, subcategories, data previews, and collection loops`, () => {
    it<LocalTestContext>(`Parses categories`, ({ flowConfig }) => {
      const categoryRoutes = flowConfig.categories.map((c) => c.route);
      expect(categoryRoutes.length).toBe(2);
      expect(categoryRoutes[0]).toBe(`/flow/cat1`);
      expect(categoryRoutes[1]).toBe(`/flow/cat2`);
    });

    it<LocalTestContext>(`Category contains the right subcategories`, ({ flowConfig }) => {
      const firstCategory = flowConfig.categories[0];
      expect(firstCategory.subcategories.length).toBe(2);
      expect(firstCategory.subcategories[0].route).toBe(`/flow/cat1/sub1`);
      expect(firstCategory.subcategories[1].route).toBe(`/flow/cat1/sub2`);
    });

    it<LocalTestContext>(`Subcategory contains the right screens`, ({ flowConfig }) => {
      const firstCategory = flowConfig.categories[0];
      const firstSubcategory = firstCategory.subcategories[0];
      expect(firstSubcategory.screens.length).toBe(2);
      expect(firstSubcategory.screens[0].fullRoute(null)).toBe(`/flow/cat1/sub1/one`);
      expect(firstSubcategory.screens[1].fullRoute(null)).toBe(`/flow/cat1/sub1/two`);
    });

    it<LocalTestContext>(`Subcategory contains assertions`, ({ flowConfig }) => {
      const firstCategory = flowConfig.categories[0];
      const firstSubcategory = firstCategory.subcategories[0];
      expect(firstSubcategory.assertions.length).toBe(1);
      expect(firstSubcategory.assertions[0].i18nKey).toBe(`/foo`);
      expect(firstSubcategory.assertions[0].condition).toBe(`/isMarried`);
      expect(firstSubcategory.assertions[0].editRoute).toBe(`/foo`);
    });

    it<LocalTestContext>(`Subcategory contains displayOnlyIf`, ({ flowConfig }) => {
      const firstCategory = flowConfig.categories[0];
      expect(firstCategory.subcategories[0].displayOnlyIf).toMatchObject({
        operator: `isFalse`,
        condition: `/receivedDigitalAssets`,
      });
      expect(firstCategory.subcategories[1].displayOnlyIf).toBe(undefined);
    });

    it<LocalTestContext>(`Contains collection loops`, ({ flowConfig }) => {
      const loop = flowConfig.collectionLoopsByName.get(`loop`);
      if (loop === undefined) {
        throw new Error(`Loop ${loop} should be defined`);
      }
      expect(loop.loopName).toBe(`loop`);
      expect(loop.screens.length).toBe(1);
      expect(loop.screens[0].fullRoute(null)).toBe(`/flow/cat1/sub1/two`);
    });

    it<LocalTestContext>(`Places subsubcategories into subcategory if not in a loop`, ({ flowConfig }) => {
      const subcat4 = flowConfig.subcategoriesByRoute.get(`/flow/cat2/sub4`);
      if (subcat4 === undefined) {
        throw new Error(`Subcat4 ${subcat4} should be defined`);
      }
      expect(subcat4.subSubcategories.length).toBe(1);
      expect(subcat4.subSubcategories[0].fullRoute).toBe(`/flow/cat2/sub4/one`);
      expect(subcat4.subSubcategories[0].routeSuffix).toBe(`one`);
    });

    it<LocalTestContext>(`Places subsubcategories into loop if in a loop`, ({ flowConfig }) => {
      const loop = flowConfig.collectionLoopsByName.get(`/familyAndHousehold`);
      if (loop === undefined) {
        throw new Error(`Loop ${loop} should be defined`);
      }
      expect(loop.subSubcategories.length).toBe(1);
      expect(loop.subSubcategories[0].fullRoute).toBe(`/flow/cat2/sub4/two`);
      expect(loop.subSubcategories[0].routeSuffix).toBe(`two`);
    });
    it<LocalTestContext>(`Places loops into subcategories`, ({ flowConfig }) => {
      const subcat4 = flowConfig.subcategoriesByRoute.get(`/flow/cat2/sub4`);
      if (subcat4 === undefined) {
        throw new Error(`Subcat4 ${subcat4} should be defined`);
      }
      expect(subcat4.loops.length).toBe(1);
      expect(subcat4.loops[0].loopName).toBe(`/familyAndHousehold`);
    });
    it<LocalTestContext>(`Reads an iconName from the collectionLoop if it exists`, ({ flowConfig }) => {
      const subcat4 = flowConfig.subcategoriesByRoute.get(`/flow/cat2/sub4`);
      if (subcat4 === undefined) {
        throw new Error(`Subcat4 ${subcat4} should be defined`);
      }
      expect(subcat4.loops[0].iconName).toBe(`Person`);
      expect(subcat4.loops[0].dataViewSections?.length).toBe(2);
    });

    it<LocalTestContext>(`Reads a collectionItemCompletionCondition from the collectionLoop if it exists`, ({
      flowConfig,
    }) => {
      const subcat4 = flowConfig.subcategoriesByRoute.get(`/flow/cat2/sub4`);
      if (subcat4 === undefined) {
        throw new Error(`Subcat4 ${subcat4} should be defined`);
      }
      expect(subcat4.loops[0].collectionItemCompletedCondition).toBe(`/familyAndHousehold/*/isCompleted`);
    });

    it<LocalTestContext>(`Reads a donePath from the collectionLoop if it exists`, ({ flowConfig }) => {
      const subcat4 = flowConfig.subcategoriesByRoute.get(`/flow/cat2/sub4`);
      if (subcat4 === undefined) {
        throw new Error(`Subcat4 ${subcat4} should be defined`);
      }
      expect(subcat4.loops[0].donePath).toBe(`/familyAndHouseholdIsDone`);
    });

    it<LocalTestContext>(`Reads data view sections from the collectionLoop if it exists`, ({ flowConfig }) => {
      const subcat4 = flowConfig.subcategoriesByRoute.get(`/flow/cat2/sub4`);
      if (subcat4 === undefined) {
        throw new Error(`Subcat4 ${subcat4} should be defined`);
      }
      expect(subcat4.loops[0].dataViewSections?.length).toBe(2);
      expect(subcat4.loops[0].dataViewSections?.[0].i18nKey).toBe(`/claimed`);
      expect(subcat4.loops[0].dataViewSections?.[1].i18nKey).toBe(`/unclaimed`);
    });
    it<LocalTestContext>(`Reads a knockoutRoute from the collectionLoop if it exists`, ({ flowConfig }) => {
      const subcat4 = flowConfig.subcategoriesByRoute.get(`/flow/cat2/sub4`);
      if (subcat4 === undefined) {
        throw new Error(`Subcat4 ${subcat4} should be defined`);
      }
      expect(subcat4.loops[0].knockoutRoute).toBe(`/flow/income/social-security/social-security-summary-negative-ko`);
    });
  });
});

describe(`Flow tree`, () => {
  const TreeFlow = (
    <Flow>
      <Category route='about-you'>
        <Subcategory route='filing-status' completeIf='/isFilingStatusComplete'>
          <SubSubcategory route='filing-status' hidden={true}>
            <Gate condition={{ operator: `isIncomplete`, condition: `/filingStatus` }}>
              <Screen route='fooo'>
                <Heading i18nKey='/foo' />
                <SaveAndOrContinueButton />
              </Screen>
            </Gate>
            <Gate condition={{ condition: `/filingStatus` }}>
              <Screen route='barr'>
                <Heading i18nKey='/barr' />
                <SaveAndOrContinueButton />
              </Screen>
            </Gate>
          </SubSubcategory>
        </Subcategory>
      </Category>
    </Flow>
  );
  it(`Supports two distinct adjacent gates as separate nodes`, () => {
    const flow = createFlowConfig(TreeFlow);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const subcat = flow.subcategoriesByRoute.get(`/flow/about-you/filing-status`)!;
    const tree = subcat.treeNodes;
    expect(tree.length).toBe(1);
    expect(tree[0].screens.length).toBe(2);
  });
});

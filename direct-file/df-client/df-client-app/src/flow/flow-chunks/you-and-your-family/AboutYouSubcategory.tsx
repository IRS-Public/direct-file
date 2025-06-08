/* eslint-disable max-len */
import { Gate, Screen, Subcategory, SubSubcategory } from '../../flowDeclarations.js';
import {
  Address,
  Boolean,
  ContextHeading,
  DatePicker,
  DFModal,
  DFAlert,
  Enum,
  GenericString,
  Heading,
  HelpLink,
  InfoDisplay,
  IntroContent,
  IpPin,
  LimitingString,
  MefAlert,
  PhoneNumber,
  SaveAndOrContinueButton,
  Subheading,
  TaxReturnAlert,
  Tin,
  IconDisplay,
  DFAccordion,
  KnockoutButton,
  DataPreview,
  SaveAndOrContinueAndSetFactButton,
} from '../../ContentDeclarations.js';

export const AboutYouSubcategory = (
  <Subcategory
    route='about-you'
    completeIf='/aboutYouIsComplete'
    collectionContext='/primaryFiler'
    dataItems={[
      {
        itemKey: `primaryFiler`,
      },
    ]}
  >
    <Screen route='about-you-intro'>
      <ContextHeading displayOnlyOn='edit' i18nKey='/heading/you-and-your-family/about-you' />
      <Heading i18nKey='/heading/you-and-your-family/about-you/intro' />
      <IntroContent
        batches={[`data-import-0`]}
        i18nKey='/info/you-and-your-family/you/intro-data-import'
        condition={{ condition: `data-import`, section: `about-you` }}
      />
      <IntroContent batches={[`data-import-0`]} i18nKey='/info/you-and-your-family/you/intro' />
      <SaveAndOrContinueButton />
    </Screen>
    <Gate condition={{ condition: `data-import`, section: `about-you` }}>
      <Screen route='about-you-data-import' condition={{ operator: `isFalse`, condition: `/aboutYouDataWasSaved` }}>
        <Heading
          batches={[`data-import-0`]}
          i18nKey='/heading/you-and-your-family/about-you/data-preview'
          condition={{ operator: `isFalse`, condition: `/aboutYouDataWasEdited` }}
        />
        <Heading
          batches={[`data-import-0`]}
          i18nKey='/heading/you-and-your-family/about-you/data-preview-edited'
          condition={`/aboutYouDataWasEdited`}
        />
        <InfoDisplay batches={[`data-import-0`]} i18nKey='/info/about-you-data-import' />
        <DFModal batches={[`data-import-0`]} i18nKey='/info/about-you-data-import' />
        <DataPreview
          wasSavedFactPath='/aboutYouDataWasSaved'
          subsubcategories={[`your-basic-information`, `your-contact-information`]}
        />
        <SaveAndOrContinueAndSetFactButton
          batches={[`data-import-0`]}
          i18nKey='button.yesThisIsCorrect'
          sourcePath='/flowTrue'
          destinationPath='/aboutYouDataWasSaved'
          nextRouteOverride='/flow/you-and-your-family/about-you/about-you-breather'
        />
      </Screen>
    </Gate>
    <SubSubcategory route='your-basic-information'>
      <Screen
        route='about-you-basic-info'
        condition={{ operator: `isFalse`, condition: `data-import`, section: `about-you` }}
      >
        <MefAlert type='warning' mefErrorCode='IND-524' i18nKey='date-of-birth' factPaths={[`/filers/*/dateOfBirth`]} />
        <MefAlert
          type='warning'
          mefErrorCode='R0000-500-01'
          i18nKey='full-name'
          factPaths={[`/filers/*/fullName`]}
          internalLink='/flow/you-and-your-family/about-you/about-you-tin'
        />
        <Heading i18nKey='/heading/you-and-your-family/about-you/basic-info' />
        <IntroContent i18nKey='/info/you-and-your-family/about-you/fill-in-your-name' />
        <DFModal i18nKey='/info/you-and-your-family/about-you/what-last-name' />
        <LimitingString
          path='/filers/*/firstName'
          importedPath='/importedPrimaryFilerFirstName'
          displayOnlyOn='edit'
          autoComplete='given-name'
        />
        <LimitingString
          path='/filers/*/writableMiddleInitial'
          importedPath='/importedPrimaryFilerMiddleInitial'
          displayOnlyOn='edit'
          required={false}
          autoComplete='additional-name'
        />
        <LimitingString path='/filers/*/lastName' displayOnlyOn='edit' autoComplete='family-name' />
        <Enum
          path='/filers/*/writableSuffix'
          displayOnlyOn='edit'
          required={false}
          skipBlank={true}
          autoComplete='honorific-suffix'
        />
        <GenericString path='/filers/*/fullName' displayOnlyOn='data-view' />
        <DatePicker path='/filers/*/dateOfBirth' autoComplete='bday' />
        <SaveAndOrContinueButton />
      </Screen>
      <Screen route='about-you-basic-info-imported' condition={{ condition: `data-import`, section: `about-you` }}>
        <Heading batches={[`data-import-0`]} i18nKey='/heading/you-and-your-family/about-you/basic-info-imported' />
        <IntroContent
          batches={[`data-import-0`]}
          i18nKey='/info/you-and-your-family/about-you/fill-in-your-name-imported'
        />
        <DFModal i18nKey='/info/you-and-your-family/about-you/what-last-name' />
        <LimitingString
          path='/filers/*/firstName'
          importedPath='/importedPrimaryFilerFirstName'
          displayOnlyOn='edit'
          autoComplete='given-name'
        />
        <LimitingString
          path='/filers/*/writableMiddleInitial'
          displayOnlyOn='edit'
          required={false}
          autoComplete='additional-name'
        />
        <LimitingString
          path='/filers/*/lastName'
          importedPath='/importedPrimaryFilerLastName'
          displayOnlyOn='edit'
          autoComplete='family-name'
        />
        <Enum
          path='/filers/*/writableSuffix'
          displayOnlyOn='edit'
          required={false}
          skipBlank={true}
          autoComplete='honorific-suffix'
        />
        <GenericString path='/filers/*/fullName' displayOnlyOn='data-view' />
        <DatePicker
          path='/filers/*/dateOfBirth'
          importedPath='/importedPrimaryFilerDateOfBirth'
          readOnly={true}
          autoComplete='bday'
        />
        <DFModal batches={[`data-import-0`]} i18nKey='/info/you-and-your-family/about-you/why-dob' />
        <SaveAndOrContinueButton
          condition={{ operator: `isFalse`, condition: `/aboutYouDataWasSaved` }}
          nextRouteOverride='/flow/you-and-your-family/about-you/about-you-data-import'
        />
        <SaveAndOrContinueButton condition={`/aboutYouDataWasSaved`} />
      </Screen>
      <Screen route='age-ko' condition='/primaryFiler/youngerThan16' isKnockout={true}>
        <IconDisplay name='ErrorOutline' size={9} isCentered />
        <Heading i18nKey='/heading/knockout/forms-missing/filer-age-under-16' />
        <DFAlert i18nKey='/info/knockout/generic-other-ways-to-file' headingLevel='h2' type='warning' />
        <KnockoutButton i18nKey='button.knockout' />
      </Screen>
    </SubSubcategory>
    <SubSubcategory route='your-contact-information'>
      <Screen
        route='about-you-contact-info'
        condition={{ operator: `isFalse`, condition: `data-import`, section: `about-you` }}
      >
        <Heading i18nKey='/heading/you-and-your-family/about-you/contact-info' />
        <DFModal i18nKey='/info/you-and-your-family/about-you/why-contact-info' />
        <Subheading i18nKey='fields.generics.address.name' />
        <Address
          path='/address'
          useCombinedStreetLengthForValidation={true}
          hintKey='/info/why-cant-i-change-country'
          importedPath='/importedPrimaryFilerAddress'
          autoComplete='street-address'
        />
        <PhoneNumber path='/phone' autoComplete='`tel-national`' />
        <GenericString path='/email' readOnly={true} autoComplete='email' />
        <SaveAndOrContinueButton />
      </Screen>
      <Screen route='about-you-contact-info-imported' condition={{ condition: `data-import`, section: `about-you` }}>
        <Heading batches={[`data-import-0`]} i18nKey='/heading/you-and-your-family/about-you/contact-info-imported' />
        <InfoDisplay batches={[`data-import-0`]} i18nKey='/info/you-and-your-family/about-you/contact-info-imported' />
        <DFModal batches={[`data-import-0`]} i18nKey='/info/you-and-your-family/about-you/why-contact-info' />
        <Subheading batches={[`data-import-0`]} i18nKey='fields.generics.address.name' />
        <Address
          path='/address'
          useCombinedStreetLengthForValidation={true}
          hintKey='/info/why-cant-i-change-country'
          importedPath='/importedPrimaryFilerAddress'
          autoComplete='street-address'
        />
        <PhoneNumber path='/phone' importedPath='/importedPrimaryFilerPhone' autoComplete='tel-national' />
        <GenericString path='/email' readOnly={true} autoComplete='email' />
        <SaveAndOrContinueButton
          condition={{ operator: `isFalse`, condition: `/aboutYouDataWasSaved` }}
          nextRouteOverride='/flow/you-and-your-family/about-you/about-you-data-import'
        />
        <SaveAndOrContinueButton condition={`/aboutYouDataWasSaved`} />
      </Screen>
    </SubSubcategory>
    <Screen route='about-you-breather' condition={`/aboutYouDataWasSaved`}>
      <Heading batches={[`data-import-0`]} i18nKey='/heading/you-and-your-family/about-you/breather' />
      <Subheading
        batches={[`data-import-0`]}
        i18nKey='subheadings./subheading/you-and-your-family/about-you/breather'
      />
      <SaveAndOrContinueButton />
    </Screen>
    <SubSubcategory route='your-occupation'>
      <Screen route='about-you-occupation'>
        <Heading batches={[`data-import-0`]} i18nKey='/heading/you-and-your-family/about-you/occupation' />
        <InfoDisplay
          batches={[`data-import-0`]}
          i18nKey='/info/you-and-your-family/about-you/what-occupation-help-text'
        />
        <DFModal batches={[`data-import-0`]} i18nKey='/info/you-and-your-family/about-you/what-occupation' />
        <LimitingString path='/filers/*/occupation' autoComplete='organization-title' />
        <SaveAndOrContinueButton />
      </Screen>
    </SubSubcategory>
    <SubSubcategory route='citizenship-or-residency'>
      <Screen route='about-you-citizenship'>
        <Heading i18nKey='/heading/you-and-your-family/about-you/citizenship' />
        <DFModal i18nKey='/info/why-citizenship' />
        <Boolean path='/filers/*/isUsCitizenFullYear' />
        <SaveAndOrContinueButton />
      </Screen>
      <Gate condition={{ operator: `isFalse`, condition: `/filers/*/isUsCitizenFullYear` }}>
        <Screen route='about-you-citizen-by-end-ty'>
          <Heading i18nKey='/heading/you-and-your-family/about-you/citizen-end-ty' />
          <DFModal i18nKey='/info/you-and-your-family/what-is-us-resident' />
          <InfoDisplay i18nKey='/info/you-and-your-family/about-you/citizen-end-ty' />
          <Boolean path='/filers/*/writableCitizenAtEndOfTaxYear' />
          <SaveAndOrContinueButton />
        </Screen>
        <Gate condition={{ operator: `isFalse`, condition: `/filers/*/citizenAtEndOfTaxYear` }}>
          <Screen route='about-you-residency'>
            <Heading i18nKey='/heading/you-and-your-family/about-you/residency' />
            <DFModal i18nKey='/info/you-and-your-family/what-is-us-resident' />
            <DFModal i18nKey='/info/you-and-your-family/about-you/an-election' />
            <InfoDisplay i18nKey='/info/you-and-your-family/about-you/residency' />
            <Boolean path='/filers/*/writableIsNoncitizenResidentFullYear' />
            <SaveAndOrContinueButton />
          </Screen>
          <Gate condition='/filers/*/isNoncitizenResidentFullYear'>
            <Screen route='about-you-national'>
              <Heading i18nKey='/heading/you-and-your-family/about-you/national' />
              <DFModal i18nKey='/info/you-and-your-family/what-is-a-national' />
              <Boolean path='/filers/*/writableIsNational' />
              <SaveAndOrContinueButton />
            </Screen>
          </Gate>
        </Gate>
        <Screen route='about-you-citizen-resident-ko' condition='/primaryFilerResidencyKnockout' isKnockout={true}>
          <IconDisplay name='ErrorOutline' size={9} isCentered />
          <Heading i18nKey='/heading/knockout/forms-missing/non-resident' />
          <InfoDisplay i18nKey='/info/knockout/non-resident' />
          <DFAlert i18nKey='/info/knockout/non-resident/alert' headingLevel='h2' type='warning' />
          <KnockoutButton i18nKey='button.knockout' />
        </Screen>
      </Gate>
    </SubSubcategory>
    <SubSubcategory route='state-residency-and-income'>
      <Screen route='about-you-state-residency-scope'>
        <Heading i18nKey='/heading/you-and-your-family/about-you/supported-income' />
        <Enum path='/filerResidenceAndIncomeState' />
        <SaveAndOrContinueButton />
      </Screen>
      <Screen
        route='about-you-state-income-form'
        condition={{ operator: `isFalse`, condition: `/filerResidenceOrIncomeStateOutOfScope` }}
      >
        <Heading i18nKey='/heading/you-and-your-family/about-you/state-income-form' batches={[`schedule-b-0`]} />
        <DFModal i18nKey='/info/you-and-your-family/about-you/state-income-form' batches={[`schedule-b-0`]} />
        <Enum path='/primaryFilerW2And1099IntInScopedState' batches={[`schedule-b-0`]} />
        <SaveAndOrContinueButton />
      </Screen>
      <Screen
        route='about-you-state-income-1099-misc-pfd'
        condition={{ operator: `isFalse`, condition: `/filerResidenceOrIncomeOrW2StateOutOfScope` }}
      >
        <Heading
          i18nKey='/heading/you-and-your-family/about-you/state-income-1099-misc-pfd'
          batches={[`alaska-permanent-fund-0`]}
        />
        <InfoDisplay
          i18nKey='/info/you-and-your-family/about-you/state-income-1099-misc-pfd'
          batches={[`alaska-permanent-fund-0`]}
        />
        <Boolean path='/receivedAlaskaPfd' batches={[`alaska-permanent-fund-0`]} />
        <SaveAndOrContinueButton />
      </Screen>
      <Screen route='state-breather-nj' condition='/livedInNj'>
        <Heading i18nKey='/heading/you-and-your-family/about-you/state-breather-nj' />
        <InfoDisplay i18nKey='/info/you-and-your-family/about-you/state-breather-nj-info' />
        <DFAlert i18nKey='/info/you-and-your-family/about-you/state-breather-nj-alert' headingLevel='h2' type='info'>
          <DFModal i18nKey='/info/you-and-your-family/about-you/state-breather-nj-modal' />
        </DFAlert>
        <SaveAndOrContinueButton />
      </Screen>
      <Screen route='about-you-state-income-scope-ko' condition='/flowKnockoutUnsupportedState' isKnockout={true}>
        <IconDisplay name='ErrorOutline' size={9} isCentered />
        <Heading
          i18nKey='/heading/knockout/forms-missing/supported-state'
          condition={{ operator: `isFalseOrIncomplete`, condition: `/isMarried` }}
        />
        <Heading i18nKey='/heading/knockout/forms-missing/supported-spouse-state' condition='/isMarried' />
        <DFAlert i18nKey='/info/knockout/generic-other-ways-to-file' headingLevel='h2' type='warning' />
        <KnockoutButton i18nKey='button.knockout' />
      </Screen>
      <Screen route='about-you-breather-1099-misc-pfd' condition='/livedInAk'>
        <Heading
          i18nKey='/heading/you-and-your-family/about-you/breather-1099-misc-pfd'
          batches={[`alaska-permanent-fund-0`]}
        />
        <InfoDisplay
          i18nKey='/info/you-and-your-family/about-you/breather-1099-misc-pfd-yes'
          condition='/receivedAlaskaPfd'
          batches={[`alaska-permanent-fund-0`]}
        />
        <InfoDisplay
          i18nKey='/info/you-and-your-family/about-you/breather-1099-misc-pfd-no'
          condition={{ operator: `isFalse`, condition: `/receivedAlaskaPfd` }}
          batches={[`alaska-permanent-fund-0`]}
        />
        <InfoDisplay
          i18nKey='/info/you-and-your-family/about-you/breather-1099-misc-pfd'
          batches={[`alaska-permanent-fund-0`]}
        />
        <SaveAndOrContinueButton />
      </Screen>
    </SubSubcategory>

    <SubSubcategory route='your-tax-identification'>
      <Screen route='about-you-tin'>
        <Heading i18nKey='/heading/you-and-your-family/about-you/tin' />
        <TaxReturnAlert
          type='error'
          i18nKey='/info/non-unique-tin'
          conditions={[
            { operator: `isComplete`, condition: `/primaryFiler/tin` },
            { operator: `isFalse`, condition: `/filers/*/isTinUnique` },
          ]}
        />
        <MefAlert
          type='warning'
          mefErrorCode='R0000-500-01'
          i18nKey='ssn-or-itin'
          internalLink='/flow/you-and-your-family/about-you/about-you-basic-info'
        />
        <MefAlert type='warning' mefErrorCode='IND-452' i18nKey='fraud' />
        <InfoDisplay i18nKey='/info/you-and-your-family/about-you/tin' />
        <DFModal batches={[`data-import-w2`]} i18nKey='/info/you-and-your-family/about-you/tin/cant-change' />
        <Tin path='/primaryFiler/tin' isSensitive={true} readOnly />
        <SaveAndOrContinueButton />
      </Screen>
      <Gate condition='/filers/*/needsSSNWorkStatus'>
        <Screen route='about-you-ssn-valid-for-work'>
          <Heading i18nKey='/heading/you-and-your-family/about-you/ssn-valid-for-work' />
          <DFModal i18nKey='/info/you-and-your-family/ssn-valid-for-work/where' />
          <DFModal i18nKey='/info/you-and-your-family/ssn-valid-for-work/needs-to-be-updated' />
          <Enum path='/primaryFilerSsnEmploymentValidity' />
          <SaveAndOrContinueButton />
        </Screen>
        <Screen route='about-you-ssn-federal-benefits' condition='/filers/*/ssnNotValidForEmployment'>
          <Heading i18nKey='/heading/you-and-your-family/about-you/about-you-ssn-federal-benefits' />
          <Boolean path='/filers/*/writableHasSSNOnlyForBenefits' />
          <SaveAndOrContinueButton />
        </Screen>
      </Gate>
    </SubSubcategory>
    <SubSubcategory route='your-identity-protection'>
      <Gate condition={{ operator: `isUnknown`, condition: `data-import`, section: `ip-pin-taxpayer-has-ip-pin` }}>
        <Screen route='about-you-ip-pin-choice'>
          <MefAlert
            type='error'
            mefErrorCode='IND-180-01'
            i18nKey='about-you-ip-pin-choice'
            condition={{ operator: `isFalse`, condition: `/filers/*/hasIpPin` }}
          />
          <MefAlert
            type='error'
            mefErrorCode='IND-181-01'
            i18nKey='about-you-ip-pin-choice'
            condition={{ operator: `isFalse`, condition: `/filers/*/hasIpPin` }}
          />
          <Heading i18nKey='/heading/you-and-your-family/about-you/ip-pin-choice' />
          <DFModal i18nKey='/info/ip-pin-choice/what' />
          <InfoDisplay i18nKey='/info/ip-pin-choice' />
          <Boolean path='/filers/*/hasIpPin' />
          <SaveAndOrContinueButton />
        </Screen>
        <Gate condition='/filers/*/hasIpPin'>
          <Screen route='about-you-ip-pin-ready'>
            <TaxReturnAlert
              i18nKey={`/info/you-and-your-family/about-you/ip-pin-not-ready`}
              conditions={[`/filers/*/hasIpPin`, { operator: `isFalse`, condition: `/filers/*/flowIpPinReady` }]}
              type='warning'
              headingLevel='h2'
            >
              <DFAccordion
                i18nKey='/info/you-and-your-family/about-you/ip-pin-not-ready-explainer'
                headingLevel='h3'
                internalLink='/flow/you-and-your-family/about-you/about-you-ip-pin-ready'
              />
            </TaxReturnAlert>
            <MefAlert
              type='error'
              mefErrorCode='IND-180-01'
              i18nKey='about-you-ip-pin-ready'
              conditions={[
                `/filers/*/hasIpPin`,
                { operator: `isFalseOrIncomplete`, condition: `/filers/*/flowIpPinReady` },
              ]}
            />
            <MefAlert
              type='error'
              mefErrorCode='IND-181-01'
              i18nKey='about-you-ip-pin-ready'
              conditions={[
                `/filers/*/hasIpPin`,
                { operator: `isFalseOrIncomplete`, condition: `/filers/*/flowIpPinReady` },
              ]}
            />
            <Heading i18nKey='/heading/you-and-your-family/about-you/ip-pin-ready' />
            <HelpLink i18nKey='/info/you-and-your-family/about-you/ip-pin-ready' />
            <Boolean path='/filers/*/flowIpPinReady' />
            <SaveAndOrContinueButton />
          </Screen>
          <Screen
            route='about-you-ip-pin-not-ready'
            condition={{ operator: `isFalse`, condition: `/filers/*/flowIpPinReady` }}
          >
            <Heading i18nKey='/heading/you-and-your-family/about-you/ip-pin-not-ready' />
            <DFAlert
              headingLevel='h3'
              i18nKey={`/info/you-and-your-family/about-you/ip-pin-not-ready-assertion`}
              type='warning'
              internalLink='/flow/you-and-your-family/about-you/about-you-ip-pin-ready'
            />
            <SaveAndOrContinueButton />
          </Screen>
          <Screen route='about-you-ip-pin-input' condition='/filers/*/flowIpPinReady'>
            <MefAlert
              type='warning'
              mefErrorCode='IND-180-01'
              i18nKey='about-you-ip-pin-input'
              conditions={[
                { operator: `isTrue`, condition: `/filers/*/hasIpPin` },
                { operator: `isTrue`, condition: `/filers/*/flowIpPinReady` },
              ]}
              internalLink='/flow/you-and-your-family/about-you/about-you-ip-pin-ready'
            />
            <MefAlert
              type='error'
              mefErrorCode='IND-181-01'
              i18nKey='about-you-ip-pin-input'
              conditions={[
                { operator: `isTrue`, condition: `/filers/*/hasIpPin` },
                { operator: `isTrue`, condition: `/filers/*/flowIpPinReady` },
                { operator: `isIncomplete`, condition: `/filers/*/identityPin` },
              ]}
              internalLink='/flow/you-and-your-family/about-you/about-you-ip-pin-ready'
            />
            <Heading i18nKey='/heading/you-and-your-family/about-you/ip-pin-input' />
            <IpPin path='/filers/*/identityPin' isSensitive={true} />
            <SaveAndOrContinueButton />
          </Screen>
        </Gate>
      </Gate>
      <Screen
        route='about-you-ip-pin-input-review'
        condition={{ operator: `isTrue`, condition: `data-import`, section: `ip-pin-taxpayer-has-ip-pin` }}
      >
        <MefAlert
          type='warning'
          mefErrorCode='IND-180-01'
          i18nKey='about-you-ip-pin-input'
          conditions={[
            { operator: `isTrue`, condition: `/filers/*/hasIpPin` },
            { operator: `isTrue`, condition: `/filers/*/flowIpPinReady` },
          ]}
          internalLink='/flow/you-and-your-family/about-you/about-you-ip-pin-ready'
        />
        <MefAlert
          type='error'
          mefErrorCode='IND-181-01'
          i18nKey='about-you-ip-pin-input'
          conditions={[
            { operator: `isTrue`, condition: `/filers/*/hasIpPin` },
            { operator: `isTrue`, condition: `/filers/*/flowIpPinReady` },
            { operator: `isIncomplete`, condition: `/filers/*/identityPin` },
          ]}
          internalLink='/flow/you-and-your-family/about-you/about-you-ip-pin-ready'
        />
        <Heading i18nKey='/heading/you-and-your-family/about-you/ip-pin-input-review' />
        <InfoDisplay i18nKey='/info/ip-pin-review' />
        <DFModal i18nKey='/info/ip-pin-review/what' />
        <IpPin readOnly path='/filers/*/identityPin' isSensitive={true} />
        <SaveAndOrContinueButton />
      </Screen>
    </SubSubcategory>
    <SubSubcategory route='your-life-circumstances'>
      <Screen route='about-you-blind'>
        <Heading i18nKey='/heading/you-and-your-family/about-you/blind' />
        <DFModal i18nKey='/info/you-and-your-family/about-you/why-ask-blind' />
        <DFModal i18nKey='/info/you-and-your-family/about-you/blind/defined' />
        <Boolean path='/filers/*/isBlind' />
        <SaveAndOrContinueButton />
      </Screen>
      <Screen route='about-you-self-care'>
        <Heading i18nKey='/heading/you-and-your-family/about-you/self-care' batches={[`cdcc-0`]} />
        <InfoDisplay i18nKey='/info/you-and-your-family/about-you/self-care' />
        <DFModal i18nKey='/info/you-and-your-family/about-you/self-care/why-ask' />
        <DFModal i18nKey='/info/you-and-your-family/about-you/self-care/do-i-need-records' />
        <Boolean path='/filers/*/isDisabled' batches={[`cdcc-0`]} />
        <SaveAndOrContinueButton />
      </Screen>
      <Screen route='about-you-student'>
        <Heading i18nKey='/heading/you-and-your-family/about-you/student' batches={[`cdcc-0`]} />
        <DFModal i18nKey='/info/you-and-your-family/dependents/add-person-student-full-time' batches={[`cdcc-0`]} />
        <Boolean path='/filers/*/isStudent' batches={[`cdcc-0`]} />
        <SaveAndOrContinueButton />
      </Screen>
    </SubSubcategory>
    <SubSubcategory route='your-dependency-status'>
      <Screen route='about-you-could-be-claimed'>
        <Heading i18nKey='/heading/you-and-your-family/about-you/can-be-claimed' />
        <DFModal i18nKey='/info/you-and-your-family/about-you/can-be-claimed/how-to-know' />
        <InfoDisplay i18nKey='/info/you-and-your-family/about-you/can-be-claimed' />
        <Boolean path='/filers/*/canBeClaimed' />
        <SaveAndOrContinueButton />
      </Screen>
      <Gate condition='/filers/*/canBeClaimed'>
        <Screen route='about-you-claimer-filing-requirement'>
          <Heading i18nKey='/heading/you-and-your-family/about-you/required-to-file' />
          <InfoDisplay i18nKey='/info/you-and-your-family/about-you/required-to-file' />
          <DFModal i18nKey='/info/you-and-your-family/about-you/required-to-file-snack' />
          <Boolean path='/filers/*/potentialClaimerMustFile' />
          <SaveAndOrContinueButton />
        </Screen>
        <Gate condition={{ operator: `isFalse`, condition: `/filers/*/potentialClaimerMustFile` }}>
          <Screen route='about-you-claimer-filing'>
            <Heading i18nKey='/heading/you-and-your-family/about-you/did-file' />
            <InfoDisplay i18nKey='/info/you-and-your-family/about-you/did-file' />
            <Boolean path='/filers/*/potentialClaimerDidFile' />
            <SaveAndOrContinueButton />
          </Screen>
          <Gate condition='/filers/*/potentialClaimerDidFile'>
            <Screen route='about-you-claimers-return'>
              <Heading i18nKey='/heading/you-and-your-family/about-you/did-file-only-for-refund' />
              <InfoDisplay i18nKey='/info/you-and-your-family/about-you/did-file-only-for-refund' />
              <Boolean path='/primaryFilerPotentialClaimerFiledOnlyForRefund' />
              <SaveAndOrContinueButton />
            </Screen>
          </Gate>
        </Gate>
      </Gate>
      <Screen
        route='about-you-will-be-claimed'
        condition='/primaryFilerCouldBeDependentAndClaimerIsRequiredToFileOrFilingForCredits'
      >
        <Heading i18nKey='/heading/you-and-your-family/about-you/will-be-claimed' batches={[`updates-0`]} />
        <InfoDisplay i18nKey='/info/you-and-your-family/about-you/will-be-claimed' batches={[`updates-0`]} />
        {/* This question is overridden by /taxpayerCannotBeClaimed, so we only let the taxpayer answer it if /taxpayerCannotBeClaimed is false */}
        <Boolean
          path='/filers/*/willBeClaimed'
          condition={{ operator: `isFalse`, condition: `/taxpayerCannotBeClaimed` }}
          batches={[`updates-0`]}
        />
        {/* Otherwise, we show an alert letting the taxpayer know they can't be claimed, with variations depending on how the taxpayer originally answered the question */}
        <DFAlert
          i18nKey='/info/will-be-claimed-cant-be-claimed'
          headingLevel='h2'
          type='warning'
          conditions={[
            `/taxpayerCannotBeClaimed`,
            { operator: `isFalseOrIncomplete`, condition: `/filers/*/willBeClaimed` },
          ]}
          batches={[`updates-0`]}
        />
        <DFAlert
          i18nKey='/info/will-be-claimed-cant-be-claimed-contradiction'
          headingLevel='h2'
          type='error'
          conditions={[`/taxpayerCannotBeClaimed`, `/filers/*/willBeClaimed`]}
          batches={[`updates-0`]}
        />
        <SaveAndOrContinueButton />
      </Screen>
    </SubSubcategory>
  </Subcategory>
);

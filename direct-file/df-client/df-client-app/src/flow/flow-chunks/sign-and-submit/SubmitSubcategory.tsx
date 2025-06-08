import { Subcategory, Screen } from '../../flowDeclarations.js';
import {
  BigContent,
  CertifyCheckbox,
  ConditionalList,
  DFModal,
  DFAlert,
  DownloadPDFButton,
  Heading,
  IconDisplay,
  InfoDisplay,
  InternalLink,
  StateTaxReminderAlertWrapper,
  Subheading,
  SubmitButton,
} from '../../ContentDeclarations.js';

export const SubmitSubcategory = (
  // We never mark this complete in the flow; we need to use the tax return status for submit info
  <Subcategory
    route={`submit`}
    completeIf={`/flowFalse`}
    skipDataView={true}
    displayOnlyIf={{ operator: `isFalseOrIncomplete`, condition: `/isPaperPath` }}
  >
    <Screen route='sign-return-mfj-submit' condition='/isFilingStatusMFJ'>
      <Heading i18nKey='/heading/complete/sign-and-submit/final-step' />
      <InfoDisplay i18nKey='/info/complete/sign-and-submit/final-step' />
      <Subheading
        i18nKey='subheadings./subheading/complete/sign-and-submit/amount-owed'
        condition={{ operator: `isFalse`, condition: `/dueRefund` }}
      />
      <Subheading i18nKey='subheadings./subheading/complete/sign-and-submit/refund-owed' condition='/dueRefund' />
      <BigContent
        i18nKey='/info/your-taxes/amount/tax-amount-number-owed'
        condition={{ operator: `isFalse`, condition: `/dueRefund` }}
      />
      <BigContent i18nKey='/info/your-taxes/amount/tax-amount-number-refund' condition='/dueRefund' />
      <ConditionalList
        conditions={[
          { operator: `isFalse`, condition: `/dueRefund` },
          { operator: `isFalse`, condition: `/zeroBalance` },
        ]}
        i18nKey='/info/complete/sign-and-submit/payment-method-owed'
        items={[
          { itemKey: `payment_direct_debit`, conditions: [`/payViaAch`] },
          { itemKey: `payment_after_file`, conditions: [{ operator: `isFalse`, condition: `/payViaAch` }] },
        ]}
      />
      <ConditionalList
        conditions={[`/dueRefund`, { operator: `isFalse`, condition: `/zeroBalance` }]}
        i18nKey='/info/complete/sign-and-submit/payment-method-refund'
        items={[
          { itemKey: `refund_direct_debit`, conditions: [`/refundViaAch`] },
          { itemKey: `refund_mail`, conditions: [{ operator: `isFalse`, condition: `/refundViaAch` }] },
        ]}
      />
      <Subheading
        i18nKey='subheadings./subheading/complete/sign-and-submit/statement-direct-deposit'
        condition='/isUsingBankAccountToPay'
      />
      <InfoDisplay
        i18nKey='/info/complete/sign-and-submit/statement-direct-deposit'
        condition='/isUsingBankAccountToPay'
      />
      <CertifyCheckbox
        i18nKey='/checkbox/complete/sign-and-submit/direct-deposit'
        condition='/isUsingBankAccountToPay'
      />
      <Subheading i18nKey='subheadings./subheading/complete/sign-and-submit/your-digital-signature' />
      <ConditionalList
        i18nKey='/info/complete/sign-and-submit/self-signature'
        items={[
          { itemKey: `self_date_of_birth` },
          {
            itemKey: `self_select_pin`,
            editRoute: `/flow/complete/sign-and-submit/sign-return-create-new-self-select-pin`,
          },
          {
            itemKey: `self_last_year_select_pin`,
            conditions: [`/willEnterLastYearPin`],
            editRoute: `/flow/complete/sign-and-submit/sign-return-enter-self-select-pin`,
          },
          {
            itemKey: `self_last_year_agi`,
            conditions: [`/willEnterLastYearAgi`],
            editRoute: `/flow/complete/sign-and-submit/sign-return-agi`,
          },
        ]}
      />
      <Subheading i18nKey='subheadings./subheading/complete/sign-and-submit/spouse-digital-signature' />
      <ConditionalList
        i18nKey='/info/complete/sign-and-submit/spouse-self-signature'
        items={[
          { itemKey: `spouse_date_of_birth` },
          {
            itemKey: `spouse_self_select_pin`,
            conditions: [{ operator: `isFalse`, condition: `/isWidowedInTaxYear` }],
            editRoute: `/flow/complete/sign-and-submit/sign-return-spouse-create-self-select-pin`,
          },
          {
            itemKey: `spouse_last_year_self_select_pin`,
            conditions: [`/spouseWillEnterLastYearPin`],
            editRoute: `/flow/complete/sign-and-submit/sign-return-spouse-enter-self-select-pin`,
          },
          {
            itemKey: `spouse_last_year_agi`,
            conditions: [`/spouseWillEnterLastYearAgi`],
            editRoute: `/flow/complete/sign-and-submit/sign-return-spouse-agi`,
          },
        ]}
      />
      <DFAlert
        i18nKey='/info/complete/sign-and-submit/double-check'
        type='warning'
        headingLevel='h3'
        className='margin-bottom-2'
      />
      <InfoDisplay i18nKey='/info/complete/sign-and-submit/statement' />
      <CertifyCheckbox i18nKey='/checkbox/complete/sign-and-submit/outro' />
      <SubmitButton />
    </Screen>
    <Screen route='sign-return-submit' condition={{ operator: `isFalse`, condition: `/isFilingStatusMFJ` }}>
      <Heading i18nKey='/heading/complete/sign-and-submit/final-step' />
      <InfoDisplay i18nKey='/info/complete/sign-and-submit/final-step' />
      <Subheading
        i18nKey='subheadings./subheading/complete/sign-and-submit/amount-owed'
        condition={{ operator: `isFalse`, condition: `/dueRefund` }}
      />
      <Subheading i18nKey='subheadings./subheading/complete/sign-and-submit/refund-owed' condition='/dueRefund' />
      <BigContent
        i18nKey='/info/your-taxes/amount/tax-amount-number-owed'
        condition={{ operator: `isFalse`, condition: `/dueRefund` }}
      />
      <BigContent i18nKey='/info/your-taxes/amount/tax-amount-number-refund' condition='/dueRefund' />
      <ConditionalList
        conditions={[
          { operator: `isFalse`, condition: `/dueRefund` },
          { operator: `isFalse`, condition: `/zeroBalance` },
        ]}
        i18nKey='/info/complete/sign-and-submit/payment-method-owed'
        items={[
          { itemKey: `payment_direct_debit`, conditions: [`/payViaAch`] },
          { itemKey: `payment_after_file`, conditions: [{ operator: `isFalse`, condition: `/payViaAch` }] },
        ]}
      />
      <ConditionalList
        conditions={[`/dueRefund`, { operator: `isFalse`, condition: `/zeroBalance` }]}
        i18nKey='/info/complete/sign-and-submit/payment-method-refund'
        items={[
          { itemKey: `refund_direct_debit`, conditions: [`/refundViaAch`] },
          { itemKey: `refund_mail`, conditions: [{ operator: `isFalse`, condition: `/refundViaAch` }] },
        ]}
      />
      <Subheading
        i18nKey='subheadings./subheading/complete/sign-and-submit/statement-direct-deposit'
        condition='/isUsingBankAccountToPay'
      />
      <InfoDisplay
        i18nKey='/info/complete/sign-and-submit/instruction-direct-deposit'
        condition='/isUsingBankAccountToPay'
        className='margin-y-2'
      />
      <InfoDisplay
        i18nKey='/info/complete/sign-and-submit/statement-direct-deposit'
        condition='/isUsingBankAccountToPay'
      />
      <CertifyCheckbox
        i18nKey='/checkbox/complete/sign-and-submit/direct-deposit'
        condition='/isUsingBankAccountToPay'
      />
      <Subheading i18nKey='subheadings./subheading/complete/sign-and-submit/your-digital-signature' />
      <InfoDisplay i18nKey='/info/complete/sign-and-submit/instruction' className='margin-y-2' />
      <InfoDisplay i18nKey='/info/complete/sign-and-submit/statement' />
      <CertifyCheckbox i18nKey='/checkbox/complete/sign-and-submit/outro' />
      <SubmitButton i18nKey='button.submitSigned' />
    </Screen>

    <Screen route='sign-return-done' hideBreadcrumbs={true}>
      <IconDisplay name={`CheckCircle`} size={9} isCentered className='text-green' />
      <Heading
        i18nKey='/heading/complete/sign-and-submit/success'
        condition={{ operator: `isFalseOrIncomplete`, condition: `/isResubmitting` }}
      />
      <Heading i18nKey='/heading/complete/sign-and-submit/resubmit_success' condition='/isResubmitting' />
      <StateTaxReminderAlertWrapper condition='/filingStateOrProvince' />
      <InfoDisplay i18nKey='/info/complete/sign-and-submit/success' />
      <InternalLink i18nKey='/info/complete/sign-and-submit/success-dashboard' route='/home' />
      <InfoDisplay i18nKey='/info/complete/sign-and-submit/resubmit-additional-info' condition='/isResubmitting' />
      <DFModal i18nKey='/info/complete/sign-and-submit/success' />
      <DownloadPDFButton i18nKey='button.downloadPDF' />
      <InfoDisplay
        i18nKey='/info/complete/sign-and-submit/refund-info-check'
        conditions={[`/dueRefund`, { operator: `isFalse`, condition: `/refundViaAch` }]}
      />
      <InfoDisplay
        i18nKey='/info/complete/sign-and-submit/refund-info-direct-deposit'
        conditions={[`/dueRefund`, `/refundViaAch`]}
      />
      <InfoDisplay
        i18nKey='/info/complete/sign-and-submit/tax-owed-pay-now'
        conditions={[`/owesBalance`, `/payViaAch`]}
      />
      <InfoDisplay
        i18nKey='/info/complete/sign-and-submit/tax-owed-pay-later'
        conditions={[
          `/owesBalance`,
          { operator: `isFalse`, condition: `/payViaAch` },
          { operator: `isFalse`, condition: `/isAfterTaxDay` },
        ]}
      />
      <InfoDisplay
        i18nKey='/info/complete/sign-and-submit/tax-owed-pay-later-after-tax-day'
        conditions={[`/owesBalance`, { operator: `isFalse`, condition: `/payViaAch` }, `/isAfterTaxDay`]}
      />
      {/* // Todo: SOT seems to imply this will route to the dashboard - is that really synonymous with Exit? */}
      {/* <ExitButton condition={{ operator: `isFalse`, condition: `/hasStateFilingIntegration` }} /> */}
    </Screen>
  </Subcategory>
);

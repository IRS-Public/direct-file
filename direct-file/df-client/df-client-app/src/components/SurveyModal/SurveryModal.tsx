import { CommonAccordion } from '@irs/df-common';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ModalHeading,
  Button,
  ButtonGroup,
  Checkbox,
  Form,
  FormGroup,
  ModalFooter,
  TextInput,
  ModalRef,
} from '@trussworks/react-uswds';
import { useContext, useState } from 'react';
import Translation from '../Translation/Translation.js';
import { useFactGraph } from '../../factgraph/FactGraphContext.js';
import { TaxReturnsContext } from '../../context/TaxReturnsContext.js';
import { save } from '../../hooks/useApiHook.js';
import { ConcretePath } from '@irs/js-factgraph-scala';
import {
  SetSystemAlertConfig,
  SystemAlertKey,
  useSystemAlertContext,
} from '../../context/SystemAlertContext/SystemAlertContext.js';

interface SurveyModalProps {
  modalRef: React.RefObject<ModalRef>;
  toggleModal: (e: React.MouseEvent<HTMLButtonElement>, confirmationType?: 'yes' | 'no-thanks') => void;
  openSurveyConfirmationModal: (type: 'yes' | 'no-thanks') => void;
}

const SurveyModal = ({ modalRef, toggleModal, openSurveyConfirmationModal }: SurveyModalProps) => {
  const { t } = useTranslation(`translation`);
  const { factGraph } = useFactGraph();
  const modalButtonShareEmailText = t(`surveyBanner.shareEmailButton`);
  const modalButtonNoThanksText = t(`surveyBanner.noThanksButton`);
  const { currentTaxReturnId, fetchTaxReturns } = useContext(TaxReturnsContext);
  const url = `${import.meta.env.VITE_BACKEND_URL}v1/taxreturns/${currentTaxReturnId}`;
  const [isChecked, setIsChecked] = useState(false);
  const userEmail = factGraph.get(`/email` as ConcretePath).get.toString();
  const { setSystemAlert, deleteSystemAlert } = useSystemAlertContext();

  const updateTaxReturnSurveyOptIn = async (surveyOptIn: boolean) => {
    const facts = JSON.parse(factGraph.toJSON());
    const alertKey = SystemAlertKey.USE_SAVE_AND_PERSIST;
    try {
      await save(url, {
        body: {
          facts,
          surveyOptIn,
        },
      });
      deleteSystemAlert(alertKey);
      fetchTaxReturns();
    } catch (error) {
      const config: SetSystemAlertConfig = {
        type: `error`,
        i18nKey: `generic.serverError`,
      };
      setSystemAlert(alertKey, config);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTaxReturnSurveyOptIn(true);
    // Simulate a button click event to call toggleModal
    const fakeEvent = new Event(`click`, { bubbles: true }) as unknown as React.MouseEvent<HTMLButtonElement>;
    toggleModal(fakeEvent, `yes`);
    openSurveyConfirmationModal(`yes`);
  };

  const handleNoThanks = async (e: React.MouseEvent<HTMLButtonElement>) => {
    await updateTaxReturnSurveyOptIn(false);
    toggleModal(e, `no-thanks`);
    openSurveyConfirmationModal(`no-thanks`);
  };

  return (
    <Modal
      ref={modalRef}
      id='survey-modal'
      aria-labelledby='modal-heading'
      aria-describedby='modal-description'
      isInitiallyOpen={true}
      style={{ maxWidth: `53.125rem`, width: `100%` }}
    >
      <ModalHeading>
        <Translation i18nKey={`surveyBanner.header`} collectionId={null} />
      </ModalHeading>
      <div>
        <p>
          <Translation i18nKey={`surveyBanner.para1`} collectionId={null} />
        </p>
        <p>
          <Translation i18nKey={`surveyBanner.para2`} collectionId={null} />
        </p>
        <CommonAccordion
          i18nKey={`surveyBanner.accordion`}
          asExpanded
          className='full-width-accordion'
          TranslationComponent={Translation}
        />
        <p>
          <Translation i18nKey={`surveyBanner.para3`} collectionId={null} />
        </p>
        <CommonAccordion
          i18nKey={`surveyBanner.accordion2`}
          className='full-width-accordion'
          TranslationComponent={Translation}
        />
        <Form className='survey-modal-form' onSubmit={handleSubmit}>
          <FormGroup>
            <TextInput id='email-input' name='email' type='email' value={userEmail} required readOnly />
          </FormGroup>
          <div className='full-width-checkbox-wrapper'>
            <Checkbox
              id='subscribe-checkbox'
              name='survey checkbox'
              label={t(`surveyBanner.checkbox`)}
              checked={isChecked}
              required
              className='full-width-checkbox'
              onChange={(e: any) => setIsChecked(e.target.checked ? true : false)}
            />
          </div>
          <ModalFooter>
            <ButtonGroup style={{ display: `flex`, flexWrap: `wrap`, gap: `1rem` }}>
              <Button type='submit' disabled={!isChecked} style={{ flex: `1 1 auto`, minWidth: `7.5rem` }}>
                {modalButtonShareEmailText}
              </Button>
              <Button
                type='button'
                unstyled
                onClick={handleNoThanks}
                style={{ marginLeft: 0, flex: `1 1 auto`, minWidth: `7.5rem`, textAlign: `center` }}
                className='mobile-center'
              >
                {modalButtonNoThanksText}
              </Button>
            </ButtonGroup>
          </ModalFooter>
        </Form>
      </div>
    </Modal>
  );
};

export default SurveyModal;

// make sure can open bug

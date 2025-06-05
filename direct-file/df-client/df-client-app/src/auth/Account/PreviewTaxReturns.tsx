import { useTranslation } from 'react-i18next';
import { save } from '../../hooks/useApiHook.js';
import { useCallback, useContext, useState } from 'react';
import { useFactGraph } from '../../factgraph/FactGraphContext.js';
import { useNavigate } from 'react-router-dom';
import { Alert, Button } from '@trussworks/react-uswds';
import {
  SetSystemAlertConfig,
  SystemAlertKey,
  useSystemAlertContext,
} from '../../context/SystemAlertContext/SystemAlertContext.js';
import SystemAlertAggregator from '../../components/SystemAlertAggregator/SystemAlertAggregator.js';
import { TaxReturnsContext } from '../../context/TaxReturnsContext.js';

const PreviewTaxReturns = () => {
  const { setSystemAlert, deleteSystemAlert } = useSystemAlertContext();
  const { currentTaxReturnId } = useContext(TaxReturnsContext);
  const [hasSuccessfulPreview, setSuccessfulPreview] = useState<boolean>(false);
  const { factGraph } = useFactGraph();
  const navigate = useNavigate();

  const handlePreview = useCallback(async () => {
    const url = `${import.meta.env.VITE_BACKEND_URL}v1/taxreturns/${currentTaxReturnId}/preview`;
    const alertKey = SystemAlertKey.PREVIEW;
    const facts = JSON.parse(factGraph.toJSON());

    try {
      await save(url, {
        body: {
          facts,
        },
      });
      deleteSystemAlert(alertKey);
      setSuccessfulPreview(true);
    } catch (err) {
      const config: SetSystemAlertConfig = {
        type: `error`,
        i18nKey: `generic.serverError`,
      };
      setSystemAlert(alertKey, config);
    }
  }, [deleteSystemAlert, factGraph, setSystemAlert, currentTaxReturnId]);

  const { t } = useTranslation(`translation`);

  if (!currentTaxReturnId || !factGraph) {
    return (
      <Alert type='error' headingLevel='h3' slim>
        You must have an active tax return to use this feature
      </Alert>
    );
  }

  if (hasSuccessfulPreview) {
    return (
      <div>
        <SystemAlertAggregator />
        {/* Need to use anchor tag to force browser refresh */}
        {/* <a href={`${import.meta.env.VITE_PUBLIC_PATH}/home`} className='usa-button'>
          <Icon.NavigateNext size={3} className='usa-button__icon-right' aria-hidden='true' /> */}
        <Button type='button' onClick={() => navigate(`/home`)}>
          {t(`button.dashboard`)}
        </Button>
      </div>
    );
  }

  return (
    <>
      <SystemAlertAggregator />
      <Button type={`button`} onClick={handlePreview}>
        Preview fact graph in backend
      </Button>
    </>
  );
};

export default PreviewTaxReturns;

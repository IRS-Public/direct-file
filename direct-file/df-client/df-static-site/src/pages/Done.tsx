import { useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { CommonContentDisplay } from '@irs/df-common';

import { DFAccordion, Heading, Translation, Prose, NextLink, Breadcrumbs, SubHeader } from '../components/index.js';
import { englishUrl, spanishUrl } from '../constants.js';
import { PilotPhaseContext } from '../layouts/Providers.js';
import { Alert } from '@trussworks/react-uswds';

const Done = () => {
  const { t, i18n } = useTranslation(`translation`);
  const navigate = useNavigate();
  const phase = useContext(PilotPhaseContext);
  const PREV = `/credits`;
  const directFileUrl = i18n.language?.startsWith(`es`) ? spanishUrl : englishUrl;
  const NEXT = directFileUrl;
  if (!phase?.enableScreener) navigate(`/`);


  return (
    <>
      <Helmet>
        <title>{t(`pages.ScreenerDone.pageTitle`)}</title>
      </Helmet>
      <SubHeader />
      <Breadcrumbs href={PREV} />
      {/* We are currently commenting out this ternary operator as we are temporarily removing the
      "closing soon" state until designers and product have a chance to review this copy */}
      {/* {phase?.showOpenDoneSection ? (
        <>
          <Prose>
            <Heading level='h1'>{t(`pages.ScreenerDone.heading`)}</Heading>
            <CommonContentDisplay i18nKey='pages.ScreenerDone' TranslationComponent={Translation} />
            <DFAccordion i18nKey='pages.ScreenerDone.accordion' />
          </Prose>
          <NextLink href={NEXT}>{t(`pages.ScreenerDone.button.text`)}</NextLink>
        </>
      ) : (
        <> */}
      <Prose>
        <Heading level='h1'>{t(`pages.ScreenerDone.heading`)}</Heading>
        <CommonContentDisplay i18nKey='pages.ScreenerDone' TranslationComponent={Translation} />
        <DFAccordion i18nKey='pages.ScreenerDone.accordion' />
      </Prose>
      <NextLink href={NEXT}>{t(`pages.ScreenerDone.button.text`)}</NextLink>
      {/* </>
      )} */}
      <Alert className='margin-top-3' type='info' headingLevel='h3' validation>
        <CommonContentDisplay i18nKey='pages.ScreenerDone.alert' TranslationComponent={Translation} />
      </Alert>
    </>
  );
};

export default Done;

import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { CommonFooter, CommonOverrideBanner, CommonOverrideDatePicker } from '@irs/df-common';

import { baseRouterPath } from './constants.js';
import { Banner, PilotBanner, Header, Head, ErrorBoundary } from './components/index.js';
import { LandingPageLayout, Providers, ScreenerLayout } from './layouts/index.js';
import {
  About,
  Credits,
  Deductions,
  Done,
  Income,
  Intro,
  PilotLimitedAccess,
  Retirement,
  State,
} from './pages/index.js';

import '../node_modules/@trussworks/react-uswds/lib/index.css'

function App() {
  const { t, i18n } = useTranslation(`translation`);
  const locale = i18n.language;

  return (
    <ErrorBoundary>
      <Providers>
        <CommonOverrideBanner />
        <Head />
        <Router basename={baseRouterPath}>
          <a className='usa-skipnav' href='#main'>
            {t(`components.skipLink.label`)}
          </a>
          <Banner lang={locale} />
          <PilotBanner />
          <Header />
          <Routes>
            <Route path='/' element={<LandingPageLayout page={Intro} />} />
            <Route path='/about' element={<ScreenerLayout page={About} />} />
            <Route path='/limited' element={<ScreenerLayout page={PilotLimitedAccess} />} />
            {/* Screener pages */}
            <Route path='/state' element={<ScreenerLayout page={State} />} />
            <Route path='/income' element={<ScreenerLayout page={Income} />} />
            <Route path='/savingsandretirement' element={<ScreenerLayout page={Retirement} />} />
            <Route path='/deductions' element={<ScreenerLayout page={Deductions} />} />
            <Route path='/credits' element={<ScreenerLayout page={Credits} />} />
            <Route path='/done' element={<ScreenerLayout page={Done} />} />
          </Routes>
          <CommonFooter
            masthead={t(`components.footer.masthead`)}
            logo_alt={t(`components.footer.logo_alt`)}
            official_of={t(`components.footer.official_of`)}
            important_links={t(`components.footer.important_links`)}
            about={t(`components.footer.about`)}
            direct_file_news={t(`components.footer.direct_file_news`)}
            accessibility={t(`components.footer.accessibility`)}
            privacy={t(`components.footer.privacy`)}
            df_prefix={baseRouterPath}
          />
        </Router>
      </Providers>
    </ErrorBoundary>
  );
}

export default App;

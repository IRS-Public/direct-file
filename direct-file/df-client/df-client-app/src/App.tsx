import { Navigate, Route, BrowserRouter as Router, Routes, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import Head from './components/Head/Head.js';
import NotFound from './pages/NotFound.js';
import NotPermitted from './pages/NotPermitted.js';
import AccessLimited from './pages/AccessLimited.js';
import Account from './auth/Account/Account.js';
import useNetworkConnectionStatus from './hooks/useNetworkConnectionStatus.js';
import { NetworkConnectionContext } from './context/networkConnectionContext.js';
import { Suspense } from 'react';
import { About } from './pages/About.js';
import AuthorizeStateScreen from './screens/AuthorizeStateScreen/AuthorizeStateScreen.js';
import LoadingIndicator from './components/LoadingIndicator/LoadingIndicator.js';
import TaxReturnIntro from './components/TaxReturnIntro/TaxReturnIntro.js';
import ErrorBoundary from './utils/errorBoundary.js';
import { TaxReturnDetails } from './pages/TaxReturnDetails/TaxReturnDetails.js';
import { SubmissionStatusContextProvider } from './context/SubmissionStatusContext/SubmissionStatusContext.js';
import LoadingVerify from './pages/LoadingVerify.js';
import { v4 as uuidv4 } from 'uuid';
import ResetTaxReturns from './auth/Account/ResetTaxReturns.js';
import PreviewTaxReturns from './auth/Account/PreviewTaxReturns.js';
import { ScreenHeader } from './screens/ScreenHeader.js';
import { SystemAlertContextProvider } from './context/SystemAlertContext/SystemAlertContext.js';
import { TaxReturnsContextProvider } from './context/TaxReturnsContext.js';
import { Provider } from 'react-redux';

import BaseScreen from './screens/BaseScreen.js';
import Checklist from './screens/Checklist.js';
import { TaxProfileContextOrSpinnerGate } from './screens/TaxProfileContextOrSpinnerGate.js';
import DataView from './screens/DataView.js';
import CollectionItemDataView from './screens/data-view/CollectionItemDataView.js';
import GlobalLayout from './components/GlobalLayout.js';
import Home from './components/Home.js';
import { isFlowEnabled } from './constants/pageConstants.js';
import { store } from './redux/store.js';

// These styles are global so we make sure it is imported at the root
import '../node_modules/@trussworks/react-uswds/lib/index.css'
import FileYourStateTaxesDetails from './components/FileYourStateTaxesDetails/FileYourStateTaxesDetails.js';
import { FactGraphTranslationContext } from './context/FactGraphTranslationContext.js';
import { DataImportMagicScreen } from './components/DataImportMagicScreen/DataImportMagicScreen.js';

const FlowEnabledRoutes = () => {
  return isFlowEnabled() ? <Outlet /> : <Navigate to='/access-limited' />;
};

function App() {
  // Network connection hook polls for connectivity and results are passed
  // into the value of the NetworkConnectionContext.
  const INTERVAL_TIME = 4000;
  const initialNetworkState = { online: true, prevOnlineStatus: true };
  const networkConnectionValue = useNetworkConnectionStatus(initialNetworkState, INTERVAL_TIME);

  const baseRouterPath = import.meta.env.VITE_PUBLIC_PATH || ``;

  if (import.meta.env.VITE_ALLOW_LOADING_TEST_DATA) {
    const searchParams = new URLSearchParams(window.location.search);
    const dummyEmail = searchParams.get(`testEmail`);
    if (dummyEmail) {
      sessionStorage.setItem(`email`, dummyEmail);
    }
    const generateNewUUID = searchParams.get(`generateUUID`);
    if (generateNewUUID) {
      const uuid = uuidv4();
      localStorage.setItem(`preauthUuid`, uuid);
    }
  }

  return (
    <NetworkConnectionContext.Provider value={networkConnectionValue}>
      <HelmetProvider>
        <Head />
        <Suspense fallback={<LoadingIndicator delayMS={0} />}>
          <Provider store={store}>
            <Router basename={baseRouterPath}>
              <ErrorBoundary>
                <SystemAlertContextProvider>
                  <TaxReturnsContextProvider>
                    <SubmissionStatusContextProvider>
                      <Suspense fallback={<LoadingIndicator />}>
                        <GlobalLayout {...networkConnectionValue}>
                          <Suspense fallback={<LoadingIndicator />}>
                            <Routes>
                              <Route path='/' element={<Navigate to='/loading' replace />} />
                              <Route path='/es/' element={<Navigate to='/loading' replace />} />
                              <Route element={<FlowEnabledRoutes />}>
                                <Route
                                  path='/flow/*'
                                  element={
                                    <TaxProfileContextOrSpinnerGate>
                                      <ScreenHeader />
                                      <main id='main' tabIndex={-1}>
                                        <BaseScreen />
                                      </main>
                                    </TaxProfileContextOrSpinnerGate>
                                  }
                                />
                                <Route
                                  path='/data-view/loop/:loopName/:collectionId/'
                                  element={
                                    <TaxProfileContextOrSpinnerGate>
                                      <ScreenHeader />
                                      <main id='main' tabIndex={-1}>
                                        <CollectionItemDataView />
                                      </main>
                                    </TaxProfileContextOrSpinnerGate>
                                  }
                                />
                                <Route
                                  path='/data-view/*'
                                  element={
                                    <TaxProfileContextOrSpinnerGate>
                                      <ScreenHeader />
                                      <main id='main' tabIndex={-1}>
                                        <DataView />
                                      </main>
                                    </TaxProfileContextOrSpinnerGate>
                                  }
                                />
                                <Route
                                  path='/pre-checklist/'
                                  element={
                                    <FactGraphTranslationContext.Provider
                                      value={{ shouldFetchTranslationValuesFromFactGraph: false }}
                                    >
                                      <main id='main' tabIndex={-1}>
                                        <TaxReturnIntro />
                                      </main>
                                    </FactGraphTranslationContext.Provider>
                                  }
                                />
                                <Route
                                  path='/load-taxpayer-info'
                                  element={
                                    <TaxProfileContextOrSpinnerGate>
                                      <main id='main' tabIndex={-1}>
                                        <DataImportMagicScreen />
                                      </main>
                                    </TaxProfileContextOrSpinnerGate>
                                  }
                                />
                                <Route
                                  path='/checklist/'
                                  element={
                                    <TaxProfileContextOrSpinnerGate>
                                      <main id='main' tabIndex={-1}>
                                        <Checklist />
                                      </main>
                                    </TaxProfileContextOrSpinnerGate>
                                  }
                                />
                              </Route>
                              <Route
                                path='/home'
                                element={
                                  <main id='main' tabIndex={-1}>
                                    <Home />
                                  </main>
                                }
                              />
                              <Route
                                path='/knockout'
                                element={
                                  <main id='main' tabIndex={-1}>
                                    <NotFound />
                                  </main>
                                }
                              />

                              <Route
                                path='/account/reset'
                                element={
                                  <TaxProfileContextOrSpinnerGate>
                                    <main id='main' tabIndex={-1}>
                                      <ResetTaxReturns />
                                    </main>
                                  </TaxProfileContextOrSpinnerGate>
                                }
                              />

                              <Route
                                path='/account/preview'
                                element={
                                  <TaxProfileContextOrSpinnerGate>
                                    <main id='main' tabIndex={-1}>
                                      <PreviewTaxReturns />
                                    </main>
                                  </TaxProfileContextOrSpinnerGate>
                                }
                              />
                              <Route path='/account/' element={<Account />} />

                              <Route
                                path='/about/'
                                element={
                                  <main id='main' tabIndex={-1}>
                                    <About />
                                  </main>
                                }
                              />

                              <Route
                                path='/authorize-state/'
                                element={
                                  <main id='main' tabIndex={-1}>
                                    <AuthorizeStateScreen />
                                  </main>
                                }
                              />
                              <Route
                                path='/federal-tax-return'
                                element={
                                  <TaxProfileContextOrSpinnerGate>
                                    <ScreenHeader />
                                    <main id='main' tabIndex={-1}>
                                      <TaxReturnDetails />
                                    </main>
                                  </TaxProfileContextOrSpinnerGate>
                                }
                              />
                              <Route
                                path='/file-your-state-taxes'
                                element={
                                  <TaxProfileContextOrSpinnerGate>
                                    <main id='main' tabIndex={-1}>
                                      <FileYourStateTaxesDetails />
                                    </main>
                                  </TaxProfileContextOrSpinnerGate>
                                }
                              />
                              <Route
                                path='/loading'
                                element={
                                  <main id='main' tabIndex={-1}>
                                    <LoadingVerify />
                                  </main>
                                }
                              />
                              <Route
                                path='/not-found'
                                element={
                                  <main id='main' tabIndex={-1}>
                                    <NotFound />
                                  </main>
                                }
                              />
                              <Route
                                path='/not-permitted'
                                element={
                                  <main id='main' tabIndex={-1}>
                                    <NotPermitted />
                                  </main>
                                }
                              />
                              <Route
                                path='/access-limited'
                                element={
                                  <main id='main' tabIndex={-1}>
                                    <AccessLimited />
                                  </main>
                                }
                              />
                              <Route path='*' element={<Navigate to='/not-found' replace />} />
                            </Routes>
                          </Suspense>
                        </GlobalLayout>
                      </Suspense>
                    </SubmissionStatusContextProvider>
                  </TaxReturnsContextProvider>
                </SystemAlertContextProvider>
              </ErrorBoundary>
            </Router>
          </Provider>
        </Suspense>
      </HelmetProvider>
    </NetworkConnectionContext.Provider>
  );
}

export default App;

/* eslint-disable max-len */
import { FC, useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import styles from './AllScreens.module.scss';
import { Button, ButtonGroup, Checkbox, ComboBox, Label, Radio, Select, TextInput } from '@trussworks/react-uswds';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Path } from '../fact-dictionary/Path.js';
import { TAX_TESTS } from './AllScreensContext.js';
import { BATCH_NAME, BATCH_NAMES, BatchStates, BatchStatus } from '../flow/batches.js';
import { AllScreensFilterSet, ShowType, showTypes } from './AllScreensContent.js';
import { AllScreensStateTaxesSettings } from './postSubmission/AllScreensPostSubmissionSettings.js';

type AllScreensMenuProps = {
  showType: ShowType;
  onShowTypeChange: (value: ShowType) => void;
  showConditionalScreenLogic: boolean;
  onConditionalScreenLogicToggle: (value: boolean) => void;
  hideAlerts: boolean;
  setHideAlerts: (value: boolean) => void;
  filters: AllScreensFilterSet;
  setFilters: (filters: AllScreensFilterSet) => void;
  showModals: boolean;
  setShowModals: (value: boolean) => void;
  showDataviews: boolean;
  setShowDataviews: (value: boolean) => void;
};

const AllScreensMenu: FC<AllScreensMenuProps> = ({
  showType,
  onShowTypeChange,
  showConditionalScreenLogic,
  onConditionalScreenLogicToggle,
  hideAlerts,
  setHideAlerts,
  filters,
  setFilters,
  showModals,
  setShowModals,
  showDataviews,
  setShowDataviews,
}) => {
  // CSV
  const handleChangeShowType = (selectedShowType: ShowType) => {
    onShowTypeChange(selectedShowType);
  };

  // Change lang
  const { i18n } = useTranslation();
  const handleLangChange = useCallback(
    (e: { target: { value: string } }) => {
      const languageOption = e.target.value;
      i18n.changeLanguage(languageOption);
      document.documentElement.setAttribute(`lang`, languageOption);
      localStorage.setItem(`irs_df_language`, languageOption);
    },
    [i18n]
  );

  // Removing scroll bars
  const [showFullHeight, setShowFullHeight] = useState(false);
  const handleHeightToggle = useCallback(() => {
    setShowFullHeight((prevState) => !prevState);
  }, []);

  useEffect(() => {
    if (showFullHeight) {
      document.body.classList.add(styles.showFullHeights);
    } else {
      document.body.classList.remove(styles.showFullHeights);
    }
  }, [showFullHeight]);

  // Set for PDF
  const [adjustForPDF, setAdjustForPDF] = useState(false);

  useEffect(() => {
    if (adjustForPDF) {
      document.documentElement.classList.add(`prep-for-pdf`);
      setShowFullHeight(true);
      onConditionalScreenLogicToggle(false);
      setHideAlerts(true);
    } else {
      document.documentElement.classList.remove(`prep-for-pdf`);
      setShowFullHeight(false);
      onConditionalScreenLogicToggle(true);
      setHideAlerts(false);
    }
  }, [adjustForPDF, onConditionalScreenLogicToggle, setHideAlerts]);

  useEffect(() => {
    const handleKeyPress = (event: { key: string }) => {
      const activeElement = document.activeElement;
      if (activeElement) {
        const isInputField = activeElement.tagName === `INPUT` || activeElement.tagName === `TEXTAREA`;

        if (!isInputField && (event.key === `p` || event.key === `P`)) {
          setAdjustForPDF((prevState) => !prevState);
        }
      }
    };

    window.addEventListener(`keydown`, handleKeyPress);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener(`keydown`, handleKeyPress);
    };
  }, []);

  // CSS Filters
  const [cssSelectorFilter, setCssSelectorFilter] = useState(``);
  const timer = useRef<string | number | NodeJS.Timeout | undefined>(0);
  const handleCSSFilter = useCallback((e: { target: { value: string } }) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCssSelectorFilter(`${e.target.value}`);
    }, 100);
  }, []);

  const changeTaxTestFilter = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Path;
    // If the "Select - " box is selected, we'll set undefined below.
    if (TAX_TESTS.includes(value as Path)) {
      setFilters({
        ...filters,
        tax: value,
      });
    } else {
      setFilters({
        ...filters,
        tax: undefined,
      });
    }
  };

  const changeBatchFilter = (value: string | undefined) => {
    setFilters({
      ...filters,
      batch: value as BATCH_NAME,
    });
  };

  const changeScreenStatusFilter = (value: string | undefined) => {
    setFilters({
      ...filters,
      status: BatchStates[value as keyof typeof BatchStates],
    });
  };

  const changeScreenWorkflowFilter = (value: string | undefined) => {
    setFilters({
      ...filters,
      workflow: BatchStatus[value as keyof typeof BatchStatus],
    });
  };

  return (
    <div className={styles.flyoutMenu}>
      <div className={styles.flyoutMenuSection}>
        <h2>Info</h2>
        <ButtonGroup type='segmented'>
          {showTypes.map((type, index) => (
            <Button
              key={`${index}.${type}`}
              type={`button`}
              onClick={() => handleChangeShowType(type)}
              outline={showType !== type}
            >
              {type}
            </Button>
          ))}
        </ButtonGroup>
      </div>
      <div className={styles.flyoutMenuSection}>
        <fieldset className='usa-fieldset'>
          <legend>Language</legend>
          <Radio
            id='lang-en'
            name='set-lang'
            label='English'
            checked={i18n.language === `en`}
            value='en'
            onChange={handleLangChange}
          />
          <Radio
            id='lang-es'
            name='set-lang'
            label='Spanish'
            value='es-US'
            checked={i18n.language === `es-US`}
            onChange={handleLangChange}
          />
        </fieldset>
      </div>
      {showType === `screens` && (
        <>
          <div className={styles.flyoutMenuSection}>
            <fieldset className={`usa-fieldset ${styles.flyoutMenuSection}`}>
              <legend>Display</legend>
              <Checkbox
                id='check-full-height'
                name='full-height'
                label='Remove scrollbars'
                onChange={handleHeightToggle}
                checked={showFullHeight}
              />
              <Checkbox
                id='check-show-conditionals'
                name='conditionals'
                label='Show conditional screen logic'
                onChange={(e: any) => onConditionalScreenLogicToggle(e.target.checked)}
                checked={showConditionalScreenLogic}
              />
              <Checkbox
                id='check-show-modals'
                name='show-modals'
                label='Show modals'
                onChange={(e: any) => setShowModals(e.target.checked)}
                checked={showModals}
              />
              <Checkbox
                id='check-show-dataviews'
                name='show-dataviews'
                label='Show dataviews'
                onChange={(e: any) => setShowDataviews(e.target.checked)}
                checked={showDataviews}
              />
              <Checkbox
                id='check-hide-alerts'
                name='hide-alerts'
                label='Hide alerts'
                onChange={(e: any) => setHideAlerts(e.target.checked)}
                checked={hideAlerts}
              />
            </fieldset>
          </div>
          <div className={styles.flyoutMenuSection}>
            <fieldset className={`usa-fieldset ${styles.flyoutMenuSection}`}>
              <legend>Filter</legend>
              <Label htmlFor='css-filter'>By CSS selector</Label>
              <span className='usa-hint' id='css-cs--filter-hint'>
                Try <code className='font-mono-xs text-black'>.usa-alert h2</code> or <br />
                {``}
                <code className='font-mono-xs text-black'>[class*=df-big-content]</code>
              </span>
              <TextInput
                id='css-filter'
                name='css-filter'
                type='text'
                onChange={handleCSSFilter}
                aria-describedby='usa-css-filter-hint'
                spellCheck={false}
              />
              <Label htmlFor='tax-test-filter'>By tax test</Label>
              <Select id='tax-test-filter' name='tax-test-filter' value={filters.tax} onChange={changeTaxTestFilter}>
                <option>- Select - </option>
                {TAX_TESTS.map((o) => {
                  return (
                    <option value={o} key={o}>
                      {o}
                    </option>
                  );
                })}
              </Select>
              <Label htmlFor='batch-filter'>By content batch</Label>
              <ComboBox
                id='batch-filter'
                name='batch-filter'
                options={BATCH_NAMES.map((o) => ({ value: `${o}`, label: `${o}` }))}
                onChange={changeBatchFilter}
              />
              <Label htmlFor='status-filter'>By screen status</Label>
              <ComboBox
                id='status-filter'
                name='status-filter'
                options={Object.keys(BatchStates).map((o) => ({
                  value: `${o}`,
                  label: `${BatchStates[o as keyof typeof BatchStates]}`,
                }))}
                onChange={changeScreenStatusFilter}
              />
              <Label htmlFor='workflow-filter'>By workflow step</Label>
              <ComboBox
                id='workflow-filter'
                name='workflow-filter'
                options={Object.keys(BatchStatus).map((o) => ({
                  value: `${o}`,
                  label: `${BatchStatus[o as keyof typeof BatchStatus]}`,
                }))}
                onChange={changeScreenWorkflowFilter}
              />
            </fieldset>
            <HelmetProvider>
              {/* 
                Basically, this css rule in plain language:
                "Hide any screen wrapper that does not have a screen that has the [selector]" 
              */}
              <Helmet
                style={[
                  {
                    cssText: `
                [class*="_screen-outer-container"]:not(:has([class*="_screen-container"] ${cssSelectorFilter})) {
                  display: none !important;
                }
                `,
                  },
                ]}
              />
            </HelmetProvider>
          </div>
        </>
      )}
      {showType === `postSubmission` && <AllScreensStateTaxesSettings />}
    </div>
  );
};

export default AllScreensMenu;

import { FC } from 'react';
import { Accordion, Tag } from '@trussworks/react-uswds';
import { CommonAccordionItemProps } from '@irs/df-common';
import { dependenciesPerTaxTest } from './AllScreensContext.js';
import { BatchDetails, CONTENT_BATCHES, calculateScreenStatus } from '../flow/batches.js';
import { ScreenConfig } from '../flow/ScreenConfig.js';
import styles from './AllScreens.module.scss';

interface AllScreensScreenHeaderProps {
  screen: ScreenConfig;
}

const getBatchDetailsContent = (screen: ScreenConfig) => {
  const openBatchesContent = [];
  const closedBatchesContent = [];
  for (let i = 0; i < screen.batches.length; i++) {
    const batchName = screen.batches[i];
    const batch = CONTENT_BATCHES[batchName] as BatchDetails;
    const batchScreenStatus = calculateScreenStatus([batchName]);

    const item = [];
    const childList = [];
    childList.push(
      <li key={`batch-current-status`}>
        {batch.status} ({batch.started})
      </li>
    );
    if (batch && batch.history) {
      // get history child list
      for (let j = 0; j < batch.history.length; j++) {
        const historyItem = batch.history[j];
        childList.push(
          <li key={`batch-history-${i}-${j}`}>
            {historyItem.status} ({historyItem.completed})
          </li>
        );
      }
    }
    item.push(
      <li key={`batch-${i}`}>
        {batchName} ({batch.type}) <ul>{childList}</ul>
      </li>
    );

    if (batchScreenStatus.isOpen) {
      openBatchesContent.push(<ol>{item}</ol>);
    } else {
      closedBatchesContent.push(<ol>{item}</ol>);
    }
  }

  const batchDetailsContent = [];
  batchDetailsContent.push(<h5>Open batch(es)</h5>);
  if (openBatchesContent.length > 0) {
    batchDetailsContent.push(...openBatchesContent);
  } else {
    batchDetailsContent.push(<p>This screen isn&lsquo;t part of an open batch.</p>);
  }

  batchDetailsContent.push(<h5>Batch History</h5>);
  if (closedBatchesContent.length > 0) {
    batchDetailsContent.push(...closedBatchesContent);
  } else {
    batchDetailsContent.push(<p>This screen isn&lsquo;t part of a completed batch.</p>);
  }

  return batchDetailsContent;
};

const AllScreensScreenHeader: FC<AllScreensScreenHeaderProps> = ({ screen }) => {
  const taxTestsAffectedByScreen = Object.entries(dependenciesPerTaxTest)
    .filter(([_test, deps]) => {
      return screen.factPaths.some((fp) => deps.has(fp));
    })
    .map(([test, _deps]) => {
      return test;
    });

  const screenHeaderContent = [];
  // Tax Tests Accordion
  let taxTestsContent = (
    <>
      <h5>No tax tests affected</h5>
      <p></p>
    </>
  );
  if (taxTestsAffectedByScreen.length > 0) {
    const taxTestsItems: CommonAccordionItemProps[] = [
      {
        title: `Tax tests affected (${taxTestsAffectedByScreen.length})`,
        content: (
          <ul>
            {taxTestsAffectedByScreen.map((test) => (
              <li key={test}>{test}</li>
            ))}
          </ul>
        ),
        expanded: false,
        headingLevel: `h5`,
        id: `screenheading-taxtests-${screen.route}`,
      },
    ];
    taxTestsContent = <Accordion className={styles.screenHeaderContent} items={taxTestsItems} />;
  }
  screenHeaderContent.push(taxTestsContent);

  if (screen.batches.length > 0) {
    const batchDetailsContent = getBatchDetailsContent(screen);
    const batchDetailsItems: CommonAccordionItemProps[] = [
      {
        title: `Batch Details`,
        content: batchDetailsContent,
        expanded: false,
        headingLevel: `h5`,
        id: `screenheading-batches-${screen.route}`,
      },
    ];
    screenHeaderContent.push(<Accordion className={styles.screenHeaderContent} items={batchDetailsItems} />);
  }

  const screenStatus = calculateScreenStatus(screen.batches);
  const screenHeaderTitle = [];
  screenHeaderTitle.push(<h4>{screen.route}</h4>);
  if (screenStatus.isLocked) {
    screenHeaderTitle.push(<Tag background='#900'>locked</Tag>);
  }

  if (screenStatus.isPublishable) {
    screenHeaderTitle.push(<Tag background='#090'>publishable</Tag>);
  } else {
    screenHeaderTitle.push(<Tag>unpublishable</Tag>);
  }

  if (taxTestsAffectedByScreen.length > 0) {
    screenHeaderTitle.push(<Tag background='#783cb9'>{taxTestsAffectedByScreen.length} tests</Tag>);
  }

  const screenHeaderItems: CommonAccordionItemProps[] = [
    {
      title: screenHeaderTitle,
      content: screenHeaderContent,
      expanded: false,
      headingLevel: `h4`,
      id: `screenheading-${screen.route}`,
    },
  ];

  if (screenStatus.isLocked) {
    return <Accordion className={styles.screenHeaderLocked} items={screenHeaderItems} />;
  }
  return <Accordion className={styles.screenHeader} items={screenHeaderItems} />;
};
export default AllScreensScreenHeader;

import { render, screen } from '@testing-library/react';
import RejectedReturnDetails, { RejectedReturnDetailsProps } from './RejectedReturnDetails.js';
import { CURRENT_TAX_YEAR, FEDERAL_RETURN_STATUS } from '../../../constants/taxConstants.js';
import { v4 as uuidv4 } from 'uuid';
import { BrowserRouter } from 'react-router-dom';
import { TaxReturn } from '../../../types/core.js';
import enLocale from '../../../locales/en.yaml';
import { vi } from 'vitest';

const { mockT, mockI18n } = vi.hoisted(() => {
  return {
    mockT: (key: string) => {
      if (key === `urls`) {
        return enLocale.urls;
      } else return key;
    },
    mockI18n: { language: `en`, exists: vi.fn((_key: string) => true) },
  };
});
vi.mock(`react-i18next`, async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: mockT,
      i18n: mockI18n,
    }),
    Trans: ({ i18nKey }: { i18nKey: string }) => mockT(i18nKey),
  };
});

// tempoarily skipping since its not clear if we should actually pass facts down as props or refactor these tests to
// account for fact information. This is mainly checking basic rendering and much of that has changed and is now even
// more dynamic
describe.skip(`RejectedReturnDetails`, () => {
  const taxReturnUuid = uuidv4();
  const userUuid = uuidv4();

  const taxReturn: TaxReturn = {
    id: taxReturnUuid,
    createdAt: new Date().toISOString(),
    taxYear: parseInt(CURRENT_TAX_YEAR),
    facts: {},
    taxReturnSubmissions: [
      {
        id: uuidv4(),
        receiptId: `12345620230215000001`,
        submitUserId: userUuid,
        createdAt: new Date().toISOString(),
        submissionReceivedAt: new Date().toISOString(),
      },
    ],
    isEditable: true,
    surveyOptIn: null,
  };

  const renderRejectedReturnDetails = (props: RejectedReturnDetailsProps) => {
    render(
      <BrowserRouter>
        <RejectedReturnDetails {...props} />
      </BrowserRouter>
    );

    const heading = screen.getByRole(`heading`, { level: 1 });
    const subHeadings = screen.getAllByRole(`heading`, { level: 2 });

    const queryForEditReturnLink = () =>
      screen.queryByRole(`link`, { name: `taxReturnDetails.rejectedReturnDetails.fixable.editReturnButtonText` });

    const queryForFindOtherWaysToFileLink = () =>
      screen.queryByRole(`link`, {
        name: `taxReturnDetails.rejectedReturnDetails.unfixable.findOtherWaysToFileButtonText`,
      });

    return {
      heading,
      subHeadings,
      queryForEditReturnLink,
      queryForFindOtherWaysToFileLink,
    };
  };

  describe(`fixable reject codes`, () => {
    it(`renders correctly with one fixable reject code`, () => {
      // given:
      const submissionStatus = {
        status: FEDERAL_RETURN_STATUS.REJECTED,
        translationKey: `status.rejected`,
        rejectionCodes: [
          {
            MeFErrorCode: `123-fixable`,
            TranslationKey: `mefErrors.123-fixable`,
            MeFDescription: `a description of the error`,
          },
        ],
        createdAt: new Date().toISOString(),
      };

      // when:
      const { heading, subHeadings, queryForEditReturnLink, queryForFindOtherWaysToFileLink } =
        renderRejectedReturnDetails({
          taxReturn,
          submissionStatus,
        });

      const editReturnLink = queryForEditReturnLink();
      const otherWaysToFileLink = queryForFindOtherWaysToFileLink();

      //then:
      expect(heading).toHaveTextContent(`taxReturnDetails.rejectedReturnDetails.fixable.heading`);
      expect(subHeadings.length).toEqual(4);
      expect(subHeadings.at(0)).toHaveTextContent(`taxReturnDetails.rejectedReturnDetails.errorCode`);
      expect(subHeadings.at(1)).toHaveTextContent(`taxReturnDetails.rejectedReturnDetails.howToFixError`);
      expect(subHeadings.at(2)).toHaveTextContent(
        `taxReturnDetails.rejectedReturnDetails.fixable.customerSupportHeading`
      );
      expect(subHeadings.at(3)).toHaveTextContent(
        `taxReturnDetails.rejectedReturnDetails.fixable.resubmitDeadline.heading`
      );
      // expect(customerSupportLink).toHaveProperty(`rel`, `noreferrer`);
      // expect(customerSupportLink).toHaveProperty(`target`, `_blank`);
      // expect(customerSupportLink).toHaveClass(`usa-button usa-button--outline`);
      expect(editReturnLink).toBeInTheDocument();
      expect(editReturnLink).toHaveClass(`usa-button`);
      expect(otherWaysToFileLink).not.toBeInTheDocument();
    });

    it(`renders correctly with multiple fixable reject codes`, () => {
      // given:
      const submissionStatus = {
        status: FEDERAL_RETURN_STATUS.REJECTED,
        translationKey: `status.rejected`,
        rejectionCodes: [
          {
            MeFErrorCode: `123-fixable-one`,
            TranslationKey: `mefErrors.123-fixable-one`,
            MeFDescription: `a description of the error`,
          },
          {
            MeFErrorCode: `123-fixable-two`,
            TranslationKey: `mefErrors.123-fixable-two`,
            MeFDescription: `a description of the error`,
          },
        ],
        createdAt: new Date().toISOString(),
      };

      // when:
      const { heading, subHeadings, queryForEditReturnLink, queryForFindOtherWaysToFileLink } =
        renderRejectedReturnDetails({
          taxReturn,
          submissionStatus,
        });

      const editReturnLink = queryForEditReturnLink();
      const otherWaysToFileLink = queryForFindOtherWaysToFileLink();

      //then:
      expect(heading).toHaveTextContent(`taxReturnDetails.rejectedReturnDetails.fixable.heading`);
      expect(subHeadings.length).toEqual(4);
      expect(subHeadings.at(0)).toHaveTextContent(
        `taxReturnDetails.rejectedReturnDetails.fixable.multipleErrors.title`
      );
      expect(subHeadings.at(1)).toHaveTextContent(
        `taxReturnDetails.rejectedReturnDetails.fixable.multipleErrors.title`
      );
      expect(editReturnLink).toBeInTheDocument();
      expect(otherWaysToFileLink).not.toBeInTheDocument();
    });
  });

  describe(`unfixable reject codes`, () => {
    it(`renders correctly with one unfixable reject code`, () => {
      // given:
      const submissionStatus = {
        status: FEDERAL_RETURN_STATUS.REJECTED,
        translationKey: `status.rejected`,
        rejectionCodes: [
          {
            MeFErrorCode: `S2-F1040-147`,
            TranslationKey: `mefErrors.123-unfixable`,
            MeFDescription: `a description of the error`,
          },
        ],
        createdAt: new Date().toISOString(),
      };

      // when:
      const { heading, subHeadings, queryForEditReturnLink, queryForFindOtherWaysToFileLink } =
        renderRejectedReturnDetails({
          taxReturn,
          submissionStatus,
        });

      const editReturnLink = queryForEditReturnLink();
      const otherWaysToFileLink = queryForFindOtherWaysToFileLink();

      //then:
      expect(heading).toHaveTextContent(`taxReturnDetails.rejectedReturnDetails.unfixable.heading`);
      expect(subHeadings.length).toEqual(2);
      expect(subHeadings.at(0)).toHaveTextContent(`taxReturnDetails.rejectedReturnDetails.errorCode`);
      expect(editReturnLink).not.toBeInTheDocument();
      expect(otherWaysToFileLink).toBeInTheDocument();
      expect(otherWaysToFileLink).toHaveClass(`usa-button`);
    });

    it(`renders correctly with multiple reject codes where at least one is unfixable`, () => {
      // given:
      const submissionStatus = {
        status: FEDERAL_RETURN_STATUS.REJECTED,
        translationKey: `status.rejected`,
        rejectionCodes: [
          {
            MeFErrorCode: `F8962-070`,
            TranslationKey: `mefErrors.123-unfixable-one`,
            MeFDescription: `a description of the error`,
          },
          {
            MeFErrorCode: `123-unfixable-two`,
            TranslationKey: `mefErrors.123-unfixable-two`,
            MeFDescription: `a description of the error`,
          },
        ],
        createdAt: new Date().toISOString(),
      };

      // when:
      const { heading, subHeadings, queryForEditReturnLink, queryForFindOtherWaysToFileLink } =
        renderRejectedReturnDetails({
          taxReturn,
          submissionStatus,
        });

      const editReturnLink = queryForEditReturnLink();
      const otherWaysToFileLink = queryForFindOtherWaysToFileLink();

      //then:
      expect(heading).toHaveTextContent(`taxReturnDetails.rejectedReturnDetails.unfixable.heading`);
      expect(subHeadings.length).toEqual(4);
      expect(subHeadings.at(0)).toHaveTextContent(
        `taxReturnDetails.rejectedReturnDetails.unfixable.findAnotherWayToFile.heading`
      );
      expect(editReturnLink).not.toBeInTheDocument();
      expect(otherWaysToFileLink).toBeInTheDocument();
    });
  });
});

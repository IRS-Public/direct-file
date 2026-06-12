import { i18n } from 'i18next';
import { StateProfile } from '../types/StateProfile.js';
import {
  DAY_WHEN_UNABLE_TO_FILE_MA,
  DAY_WHEN_UNABLE_TO_RESUBMIT,
  DAY_WHEN_UNABLE_TO_FILE_FEDERAL,
  END_OF_FILING_DEADLINE,
  END_OF_PERFECTION_DEADLINE,
} from '../constants/taxConstants.js';

export const formatAsDateTimeString = (locale: string, date?: Date) => {
  const _date = date || new Date();

  return `${_date.toLocaleDateString(locale, {
    month: `2-digit`,
    day: `2-digit`,
    year: `numeric`,
  })} ${_date.toLocaleTimeString(locale, {
    hour12: false,
  })}`;
};

export const formatAsContentDate = (date: Date, i18n: i18n) =>
  date.toLocaleDateString(i18n.language, {
    month: `long`,
    day: `numeric`,
    year: `numeric`,
  });

export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
export const getDaysBetween = (first: Date, second: Date) => {
  return (second.getTime() - first.getTime()) / MILLISECONDS_PER_DAY;
};

export const getFullDaysBetween = (first: Date, second: Date) => {
  return Math.floor(getDaysBetween(first, second));
};

export const buildCustomFilingDeadlineDate = (
  customFilingDeadline: NonNullable<StateProfile[`customFilingDeadline`]>
) => {
  return new Date(new Date(customFilingDeadline).setFullYear(new Date().getFullYear()));
};

export const isPostFederalFilingDeadline = (now: Date) => {
  const currentTime = now.getTime();
  return currentTime >= END_OF_FILING_DEADLINE.getTime();
};

export const isBeforeEndOfPerfectionDeadline = (now: Date) => {
  const currentTime = now.getTime();
  return currentTime < END_OF_PERFECTION_DEADLINE.getTime();
};

export const isBetweenFilingDeadlineAndPerfectionDeadline = (date: Date) => {
  return isPostFederalFilingDeadline(date) && isBeforeEndOfPerfectionDeadline(date);
};

export const isBeforeStdDeadline = (now: Date) => {
  const currentTime = now.getTime();
  return currentTime < DAY_WHEN_UNABLE_TO_FILE_FEDERAL.getTime();
};

export const isPostDeadlineButBeforeMassachussettsDeadline = (now: Date) => {
  const currentTime = now.getTime();
  return currentTime >= DAY_WHEN_UNABLE_TO_FILE_FEDERAL.getTime() && currentTime < DAY_WHEN_UNABLE_TO_FILE_MA.getTime();
};

export const isPostStateFilingDeadline = (now: Date) => {
  const currentTime = now.getTime();
  return currentTime >= DAY_WHEN_UNABLE_TO_FILE_MA.getTime();
};

export const isPostResubmissionDeadline = (now: Date) => {
  const currentTime = now.getTime();
  return currentTime >= DAY_WHEN_UNABLE_TO_RESUBMIT.getTime();
};

export const isBeforeResubmissionDeadline = (now: Date) => {
  const currentTime = now.getTime();
  return currentTime < DAY_WHEN_UNABLE_TO_RESUBMIT.getTime();
};

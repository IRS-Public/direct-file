import homer from '../../../../../../backend/src/main/resources/dataimportservice/mocks/homer.json';
import marge from '../../../../../../backend/src/main/resources/dataimportservice/mocks/marge.json';
import lisa from '../../../../../../backend/src/main/resources/dataimportservice/mocks/lisa.json';
import lisaKnockout from '../../../../../../backend/src/main/resources/dataimportservice/mocks/lisa_knockout.json';
import bart from '../../../../../../backend/src/main/resources/dataimportservice/mocks/bart.json';
import sean from '../../../../../../backend/src/main/resources/dataimportservice/mocks/sean.json';
import abe from '../../../../../../backend/src/main/resources/dataimportservice/mocks/abe.json';
import grandma from '../../../../../../backend/src/main/resources/dataimportservice/mocks/grandma.json';
import milhouse from '../../../../../../backend/src/main/resources/dataimportservice/mocks/milhouse.json';
import sideshowbob from '../../../../../../backend/src/main/resources/dataimportservice/mocks/sideshowbob.json';
import krusty from '../../../../../../backend/src/main/resources/dataimportservice/mocks/krusty.json';
import margeWithOnlySadiSuccess from '../../../../../../backend/src/main/resources/dataimportservice/mocks/marge_with_only_sadi_success.json';
import ned from '../../../../../../backend/src/main/resources/dataimportservice/mocks/ned.json';
import december27 from '../../../../../../backend/src/main/resources/dataimportservice/mocks/december27.json';
import kent from '../../../../../../backend/src/main/resources/dataimportservice/mocks/kent.json';
import jon from '../../../../../../backend/src/main/resources/dataimportservice/mocks/jon.json';
import margeWithSpaces from '../../../../../../backend/src/main/resources/dataimportservice/mocks/marge__simpson.json';
import w2ParseError from '../../../../../../backend/src/main/resources/dataimportservice/mocks/w2_parse_error.json';
import carly from '../../../../../../backend/src/main/resources/dataimportservice/mocks/carly.json';
import w2_with_decimal_values from '../../../../../../backend/src/main/resources/dataimportservice/mocks/w2_with_decimal_values.json';
import maude from '../../../../../../backend/src/main/resources/dataimportservice/mocks/maude.json';
import rod from '../../../../../../backend/src/main/resources/dataimportservice/mocks/rod.json';

import { DataImportProfile } from './dataImportProfileTypes.js';
import { DataImportRootResponseSchema } from './schema/DataImportServiceResponse.js';
import { processPopulateResult } from './processPopulateResult.js';
import { getDataImportDefaultRolloutBehavior } from '../../../constants/pageConstants.js';

export type DataImportTestingProfileID =
  | 'marge'
  | 'homer'
  | 'abe'
  | `sean`
  | `grandma`
  | `lisa`
  | `lisa_knockout`
  | `bart`
  | `milhouse`
  | `sideshowbob`
  | `krusty`
  | `marge_with_only_sadi`
  | `maude`
  | `ned`
  | `december27`
  | `kent`
  | `jon`
  | `marge_with_extra_spaces`
  | `w2_parse_error`
  | `carly`
  | `w2_with_decimal_values`
  | `rod`;

export const testDataImportProfileConfig: Record<DataImportTestingProfileID, () => DataImportProfile> = {
  homer: () => processPopulateResult(DataImportRootResponseSchema.parse(homer), getDataImportDefaultRolloutBehavior()),
  marge: () => processPopulateResult(DataImportRootResponseSchema.parse(marge), getDataImportDefaultRolloutBehavior()),
  abe: () => processPopulateResult(DataImportRootResponseSchema.parse(abe), getDataImportDefaultRolloutBehavior()),
  sean: () => processPopulateResult(DataImportRootResponseSchema.parse(sean), getDataImportDefaultRolloutBehavior()),
  grandma: () =>
    processPopulateResult(DataImportRootResponseSchema.parse(grandma), getDataImportDefaultRolloutBehavior()),
  bart: () => processPopulateResult(DataImportRootResponseSchema.parse(bart), getDataImportDefaultRolloutBehavior()),
  lisa: () => processPopulateResult(DataImportRootResponseSchema.parse(lisa), getDataImportDefaultRolloutBehavior()),
  lisa_knockout: () =>
    processPopulateResult(DataImportRootResponseSchema.parse(lisaKnockout), getDataImportDefaultRolloutBehavior()),
  milhouse: () =>
    processPopulateResult(DataImportRootResponseSchema.parse(milhouse), getDataImportDefaultRolloutBehavior()),
  sideshowbob: () =>
    processPopulateResult(DataImportRootResponseSchema.parse(sideshowbob), getDataImportDefaultRolloutBehavior()),
  kent: () => processPopulateResult(DataImportRootResponseSchema.parse(kent), getDataImportDefaultRolloutBehavior()),
  krusty: () =>
    processPopulateResult(DataImportRootResponseSchema.parse(krusty), getDataImportDefaultRolloutBehavior()),
  marge_with_only_sadi: () =>
    processPopulateResult(
      DataImportRootResponseSchema.parse(margeWithOnlySadiSuccess),
      getDataImportDefaultRolloutBehavior()
    ),
  ned: () => processPopulateResult(DataImportRootResponseSchema.parse(ned), getDataImportDefaultRolloutBehavior()),
  december27: () =>
    processPopulateResult(DataImportRootResponseSchema.parse(december27), getDataImportDefaultRolloutBehavior()),
  jon: () => processPopulateResult(DataImportRootResponseSchema.parse(jon), getDataImportDefaultRolloutBehavior()),
  marge_with_extra_spaces: () =>
    processPopulateResult(DataImportRootResponseSchema.parse(margeWithSpaces), getDataImportDefaultRolloutBehavior()),
  w2_parse_error: () =>
    processPopulateResult(DataImportRootResponseSchema.parse(w2ParseError), getDataImportDefaultRolloutBehavior()),
  carly: () => processPopulateResult(DataImportRootResponseSchema.parse(carly), getDataImportDefaultRolloutBehavior()),
  w2_with_decimal_values: () =>
    processPopulateResult(
      DataImportRootResponseSchema.parse(w2_with_decimal_values),
      getDataImportDefaultRolloutBehavior()
    ),
  maude: () => processPopulateResult(DataImportRootResponseSchema.parse(maude), getDataImportDefaultRolloutBehavior()),
  rod: () => processPopulateResult(DataImportRootResponseSchema.parse(rod), getDataImportDefaultRolloutBehavior()),
};

function getProfileID(inputProfileID: string | string[] | unknown): DataImportTestingProfileID {
  if (typeof inputProfileID === `string` && inputProfileID in testDataImportProfileConfig) {
    return inputProfileID as DataImportTestingProfileID;
  }

  return `marge`;
}

export function getProfileForClientsideIntercept(): DataImportProfile {
  const inputProfileID = sessionStorage.getItem(`x-data-import-profile`);
  const profileID = getProfileID(inputProfileID);
  const storedDob = sessionStorage.getItem(`df_dob_override`);
  const profile = testDataImportProfileConfig[profileID]();

  // eslint-disable-next-line eqeqeq
  if (storedDob && profile.data.aboutYouBasic.state == `success`) {
    profile.data.aboutYouBasic.payload.dateOfBirth = storedDob.substring(0, 10);
  }

  return profile;
}

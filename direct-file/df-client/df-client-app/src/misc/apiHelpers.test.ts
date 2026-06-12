import { formatAndAppendHeaders, SM_UNIVERSALID, XFF_HEADER, TID_HEADER } from './apiHelpers.js';
import { v4 as uuidv4 } from 'uuid';
import { vi } from 'vitest';

const {
  VITE_SADI_AUTH_ID,
  VITE_SADI_XFF_HEADER,
  VITE_SADI_TID_HEADER,
  mockIsDev,
  mockGetViteSadiAuthId,
  mockGetViteSadiXffHeader,
  mockGetViteSadiTidHeader,
} = vi.hoisted(() => {
  const VITE_SADI_AUTH_ID = `00000000-0000-0000-0000-000000000000`;
  const VITE_SADI_XFF_HEADER = `VITE_SADI_XFF_HEADER`;
  const VITE_SADI_TID_HEADER = `11111111-1111-1111-1111-111111111111`;
  return {
    VITE_SADI_AUTH_ID,
    VITE_SADI_XFF_HEADER,
    VITE_SADI_TID_HEADER,
    mockIsDev: vi.fn(() => true),
    mockGetViteSadiAuthId: vi.fn(() => VITE_SADI_AUTH_ID),
    mockGetViteSadiXffHeader: vi.fn(() => VITE_SADI_XFF_HEADER),
    mockGetViteSadiTidHeader: vi.fn(() => VITE_SADI_TID_HEADER),
  };
});

vi.mock(`../env/envHelpers`, async (importOriginal) => {
  const original = importOriginal();

  return {
    ...original,
    isDev: mockIsDev,
    getViteSadiAuthId: mockGetViteSadiAuthId,
    getViteSadiXffHeader: mockGetViteSadiXffHeader,
    getViteSadiTidHeader: mockGetViteSadiTidHeader,
  };
});

describe(`apiHelpers`, () => {
  afterEach(() => {
    localStorage.clear();
  });

  it(`adds the VITE_SADI_AUTH_ID as ${SM_UNIVERSALID}`, () => {
    // when:
    const headers = formatAndAppendHeaders({});

    // then:
    expect(headers).toHaveProperty(`Content-Type`, `application/json`);
    expect(headers).toHaveProperty(SM_UNIVERSALID, VITE_SADI_AUTH_ID);
  });

  it(`Overrides the ${SM_UNIVERSALID} from localstorage when preauthUuid is set`, () => {
    // given:
    const preauthUuid = uuidv4();
    localStorage.setItem(`preauthUuid`, preauthUuid);

    // when:
    const headers = formatAndAppendHeaders({});

    // then:
    expect(headers).toHaveProperty(`Content-Type`, `application/json`);
    expect(headers).toHaveProperty(SM_UNIVERSALID, preauthUuid);
  });

  it(`adds the VITE_VITE_SADI_XFF_HEADER as ${XFF_HEADER}`, () => {
    // when:
    const headers = formatAndAppendHeaders({});

    // then:
    expect(headers).toHaveProperty(`Content-Type`, `application/json`);
    expect(headers).toHaveProperty(XFF_HEADER, VITE_SADI_XFF_HEADER);
  });

  it(`adds the VITE_VITE_SADI_TID_HEADER as ${TID_HEADER}`, () => {
    // when:
    const headers = formatAndAppendHeaders({});

    // then:
    expect(headers).toHaveProperty(`Content-Type`, `application/json`);
    expect(headers).toHaveProperty(TID_HEADER, VITE_SADI_TID_HEADER);
  });
});

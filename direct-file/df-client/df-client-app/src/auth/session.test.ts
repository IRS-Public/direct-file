import { sessionStorageMock } from '../test/mocks/mockFunctions.js';
import { SessionClock } from './session.js';
import { vi } from 'vitest';

const SessionManagerMock = {
  closeAlert: vi.fn(),
  alertUser: vi.fn(),
  warnUser: vi.fn(),
};

vi.stubGlobal(`location`, {});
vi.stubGlobal(`sessionManager`, SessionManagerMock);
vi.stubGlobal(`sessionStorage`, sessionStorageMock);
vi.stubGlobal(`fetch`, vi.fn());

describe(`session clock`, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it(`initializes correctly`, () => {
    const clock = new SessionClock();
    expect(clock.nineMinutes).toEqual(540000);
    expect(clock.fiveMinutes).toEqual(300000);
    expect(clock.timer).toBeNull();
    expect(clock.alertAt).toEqual(0);
    expect(clock.autoLogoutDisabled).toBeFalsy();
  });

  it(`can start a timer`, () => {
    const clock = new SessionClock();
    const spy = vi.spyOn(clock, `warnUser`);
    clock.start();
    // expect timeout to be approximately nine minutes
    const delta = clock.alertAt - (Date.now() + 540000);
    expect(delta).toBeLessThanOrEqual(0);
    // expect `warnUser` to be called after timeout
    vi.runAllTimers();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it(`can clear user data and send user to logout url`, () => {
    const clock = new SessionClock();
    window.location.href = `about:blank`;
    sessionStorage.setItem(`email`, `testValue`);
    expect(sessionStorage.getItem(`email`)).toBe(`testValue`);
    expect(window.location.href).toEqual(`about:blank`);
    clock.terminate();
    expect(window.location.href).toEqual(`undefined`);
    expect(sessionStorage.getItem(`email`)).toBe(undefined);
  });

  it(`can reset the timer`, () => {
    const clock = new SessionClock();
    const spy = vi.spyOn(clock, `warnUser`);
    const clear = vi.spyOn(window, `clearTimeout`);
    // fake the timer, to avoid calling `start()`
    clock.timer = setTimeout(() => null, 540000);
    clock.reset();
    // expect old timers to be cleared, if any
    expect(clear).toHaveBeenCalledTimes(1);
    // expect timeout to be approximately nine minutes
    const delta = clock.alertAt - (Date.now() + 540000);
    expect(delta).toBeLessThanOrEqual(0);
    // expect user alert to be closed
    expect(window.sessionManager.closeAlert).toHaveBeenCalledTimes(1);
    // expect `warnUser` to be called after timeout
    vi.runAllTimers();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it(`can send user to logout url automatically if they ignore the warning`, () => {
    const clock = new SessionClock();
    const spy = vi.spyOn(clock, `terminate`);
    clock.alertAt = Date.now();
    clock.warnUser();
    // expect user alert to be opened
    expect(window.sessionManager.warnUser).toHaveBeenCalledTimes(1);
    // expect timeout to be approximately five minutes
    const delta = clock.alertAt - (Date.now() + 300000);
    expect(delta).toBeLessThanOrEqual(0);
    // expect `terminate` to be called after timeout
    vi.runAllTimers();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it(`can log out user if first timer failed to keep accurate time`, () => {
    const clock = new SessionClock();
    const spy = vi.spyOn(clock, `alertUser`);
    clock.alertAt = Date.now() - 300001;
    clock.warnUser();
    // expect `alertUser` to be called
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it(`can call the api to extend the session`, () => {
    const clock = new SessionClock();
    clock.extend();
    expect(window.fetch).toHaveBeenCalledTimes(1);
  });

  it(`can send user to logout url automatically if they ignore the alert`, () => {
    const clock = new SessionClock();
    const spy = vi.spyOn(clock, `terminate`);
    clock.alertAt = Date.now();
    clock.alertUser();
    // expect user alert to be opened
    expect(window.sessionManager.alertUser).toHaveBeenCalledTimes(1);
    // expect timeout to be approximately five minutes
    const delta = clock.alertAt - (Date.now() + 300000);
    expect(delta).toBeLessThanOrEqual(0);
    // expect `terminate` to be called after timeout
    vi.runAllTimers();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

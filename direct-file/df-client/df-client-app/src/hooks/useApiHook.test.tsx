import { act, render, renderHook, waitFor, screen } from '@testing-library/react';
import { mockUseTranslation, sessionStorageMock } from '../test/mocks/mockFunctions.js';
import { Mock } from 'vitest';
import { fetchPdf, interceptor, isTranslateable, read, save, useFetchPdf, useRead, useSave } from './useApiHook.js';
import Home from '../components/Home.js';
import { facts, taxreturnsError } from '../test/mocks/mockData.js';
import { Fetch, TaxReturn } from '../types/core.js';
import { wrapComponent } from '../test/helpers.js';
import { SessionClock } from '../auth/session.js';
import { ReadError } from '../misc/apiHelpers.js';
import { TaxReturnsContextProvider } from '../context/TaxReturnsContext.js';
import { SystemAlertContextProvider } from '../context/SystemAlertContext/SystemAlertContext.js';
import { taxReturnFetch } from '../redux/slices/tax-return/taxReturnFetch.js';

import { Provider } from 'react-redux';
import { store } from '../redux/store.js';
import { fetchTaxReturns } from '../redux/slices/tax-return/taxReturnSlice.js';
import { vi } from 'vitest';

vi.mock(`../redux/slices/tax-return/taxReturnFetch.js`, () => ({
  taxReturnFetch: vi.fn(), // Mock the function
}));

const fakeFetch = vi.fn();
global.fetch = fakeFetch;
global.open = vi.fn();
global.URL.createObjectURL = vi.fn(() => `http://VITE_BACKEND_URL/pdf`);
const setData = vi.fn();
const setLoading = vi.fn();
const setSuccess = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createFetchResponse({ data = [{ facts }], status = 200, contentType, url, body }: any = {}) {
  return {
    status,
    json: data
      ? async () => data
      : async () => {
          throw { message: `mock error message: bad json` };
        },
    blob: async () => `fake-pdf`,
    success: status === 200,
    ok: status === 200,
    headers: {
      get: vi.fn(() => contentType ?? `application/json`),
    },
    url: (url ?? `VITE_BACKEND_URL/example`) as unknown as URL,
    body,
  };
}
Object.defineProperty(window, `sessionStorage`, {
  value: sessionStorageMock,
});

vi.mock(`./../auth/session`, () => {
  const SessionClock = vi.fn();
  SessionClock.prototype.start = vi.fn();
  SessionClock.prototype.reset = vi.fn();
  SessionClock.prototype.alertUser = vi.fn();
  return { SessionClock };
});

vi.mock(`react-i18next`, () => ({
  useTranslation: mockUseTranslation,
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
  Trans: ({ children }: never) => children,
}));

describe(`interceptor`, () => {
  /**
   * interceptor:
   *    when initialized, calls sessionClock
   *    returns a fetch function
   *    when the fetch function is called, resets session timers and does error handling
   */

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test(`initializes correctly`, () => {
    expect(SessionClock).toHaveBeenCalledTimes(0);
    const int = interceptor(fakeFetch as unknown as Fetch);
    expect(SessionClock).toHaveBeenCalledTimes(1);
    expect((SessionClock as Mock).mock.instances[0].start).toHaveBeenCalledTimes(1);
    expect(typeof int).toEqual(`function`);
  });

  test(`returns a response`, async () => {
    fakeFetch.mockResolvedValue(createFetchResponse({ contentType: `application/pdf` }));
    const int = interceptor(fakeFetch as unknown as Fetch);
    const actual = await int(`VITE_BACKEND_URL/example` as unknown as URL);
    expect(actual.ok).toBe(true);
  });

  test(`returns a promise that resolves to data if content type is application/json`, async () => {
    fakeFetch.mockResolvedValue(createFetchResponse());
    const int = interceptor(fakeFetch as unknown as Fetch);
    const actual = await int(`VITE_BACKEND_URL/example` as unknown as URL);
    const data = await actual.json();
    expect(data).toMatchObject([{ facts }]);
  });

  test(`alerts user when session may have been terminated`, async () => {
    fakeFetch.mockResolvedValue(createFetchResponse({ contentType: `text/html` }));
    const int = interceptor(fakeFetch as unknown as Fetch);
    expect((SessionClock as Mock).mock.instances[0].alertUser).toHaveBeenCalledTimes(0);
    await int(`${import.meta.env.VITE_BACKEND_URL}example` as unknown as URL);
    expect((SessionClock as Mock).mock.instances[0].alertUser).toHaveBeenCalledTimes(1);
  });

  test(`resets session timer when backend is called`, async () => {
    fakeFetch.mockResolvedValue(createFetchResponse({ url: `${import.meta.env.VITE_BACKEND_URL}example` }));
    const int = interceptor(fakeFetch as unknown as Fetch);
    expect((SessionClock as Mock).mock.instances[0].reset).toHaveBeenCalledTimes(0);
    await int(`${import.meta.env.VITE_BACKEND_URL}example` as unknown as URL);
    expect((SessionClock as Mock).mock.instances[0].reset).toHaveBeenCalledTimes(1);
  });

  test(`does not reset session timer when non-backend api is called`, () => {
    fakeFetch.mockResolvedValue(createFetchResponse({ url: `https://somethingelse/example` }));
    const int = interceptor(fakeFetch as unknown as Fetch);
    expect((SessionClock as Mock).mock.instances[0].reset).toHaveBeenCalledTimes(0);
    int(`https://somethingelse/example` as unknown as URL);
    expect((SessionClock as Mock).mock.instances[0].reset).toHaveBeenCalledTimes(0);
  });

  test(`navigates to error page when email is not on the allowlist`, async () => {
    fakeFetch.mockResolvedValue(
      createFetchResponse({ data: { message: `EMAIL_NOT_ON_ALLOWLIST` }, status: 403, body: true })
    );
    window.location.pathname = `/`;
    const int = interceptor(fakeFetch as unknown as Fetch);
    expect(window.location.pathname).toEqual(`/`);
    try {
      await int(`VITE_BACKEND_URL/example` as unknown as URL);
    } catch (error) {
      expect(error).toMatchObject({ message: `EMAIL_NOT_ON_ALLOWLIST`, status: 403 });
    }
    expect(window.location.pathname).toEqual(`/not-permitted`);
  });

  test(`navigates to error page when pilot is closed to new users`, async () => {
    fakeFetch.mockResolvedValue(
      createFetchResponse({ data: { message: `ENROLLMENT_WINDOW_CLOSED` }, status: 403, body: true })
    );
    window.location.pathname = `/`;
    const int = interceptor(fakeFetch as unknown as Fetch);
    expect(window.location.pathname).toEqual(`/`);
    try {
      await int(`VITE_BACKEND_URL/example` as unknown as URL);
    } catch (error) {
      expect(error).toMatchObject({ message: `ENROLLMENT_WINDOW_CLOSED`, status: 403 });
    }
    expect(window.location.pathname).toEqual(`/access-limited`);
  });

  test(`throws when PII service is being flaky`, async () => {
    fakeFetch.mockResolvedValue(createFetchResponse({ data: { message: `PII_SERVICE_ERROR` }, status: 401 }));
    const int = interceptor(fakeFetch as unknown as Fetch);
    try {
      await int(`VITE_BACKEND_URL/example` as unknown as URL);
    } catch (error) {
      expect(error).toMatchObject({ message: `PII_SERVICE_ERROR`, status: 401 });
    }
  });

  test(`throws on network errors`, async () => {
    fakeFetch.mockRejectedValue({ message: `FAKE NETWORK ERROR` });
    const int = interceptor(fakeFetch as unknown as Fetch);
    try {
      await int(`VITE_BACKEND_URL/example` as unknown as URL);
    } catch (error) {
      expect(error).toMatchObject({ message: `FAKE NETWORK ERROR` });
    }
  });
});

describe(`read()`, () => {
  /**
   * read:
   *    a wrapper around fetch for making API calls to the backend
   */

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test(`calls fetch with expected headers, queryParams, and URL`, async () => {
    fakeFetch.mockResolvedValue(createFetchResponse());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual: any = await read<object>(`VITE_BACKEND_URL/example`, {
      headers: { mockHeader: `mock-value` },
      queryParams: `?something=true&other=false`,
      hooks: { setData, setLoading, setSuccess },
    });
    expect(fakeFetch).toBeCalledTimes(1);
    expect(fakeFetch).toBeCalledWith(`VITE_BACKEND_URL/example?something=true&other=false`, {
      headers: {
        'Content-Type': `application/json`,
        mockHeader: `mock-value`,
      },
      method: `GET`,
    });
    expect(actual).toStrictEqual([{ facts }]);
    expect(setData.mock.calls).toStrictEqual([[[{ facts }]]]);
    expect(setLoading.mock.calls).toStrictEqual([[true], [false]]);
    expect(setSuccess.mock.calls).toStrictEqual([[true]]);
  });

  test(`handles network errors`, async () => {
    fakeFetch.mockRejectedValue({ message: `FAKE NETWORK ERROR` });
    try {
      await read(`VITE_BACKEND_URL/example`, { hooks: { setData, setLoading, setSuccess } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error).toBeInstanceOf(ReadError);
      expect(error.message).toBe(`Network error`);
      expect(error.cause.message).toBe(`FAKE NETWORK ERROR`);
      expect(setData.mock.calls).toStrictEqual([]);
      expect(setLoading.mock.calls).toStrictEqual([[true], [false]]);
      expect(setSuccess.mock.calls).toStrictEqual([[false]]);
    }
  });

  test(`handles non-200 error codes`, async () => {
    fakeFetch.mockResolvedValue(createFetchResponse({ status: 404 }));
    try {
      await read(`VITE_BACKEND_URL/example`, { hooks: { setData, setLoading, setSuccess } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error).toBeInstanceOf(ReadError);
      expect(error.message).toBe(`Response was not successful`);
      expect(error.status).toBe(404);
      expect(setData.mock.calls).toStrictEqual([]);
      expect(setLoading.mock.calls).toStrictEqual([[true], [false]]);
      expect(setSuccess.mock.calls).toStrictEqual([[false]]);
    }
  });

  test(`handles bad json`, async () => {
    fakeFetch.mockResolvedValue(createFetchResponse({ data: null }));
    try {
      await read(`VITE_BACKEND_URL/example`, { hooks: { setData, setLoading, setSuccess } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error).toBeInstanceOf(ReadError);
      expect(error.message).toBe(`Failed to parse JSON response`);
      expect(error.cause.message).toBe(`mock error message: bad json`);
      expect(setData.mock.calls).toStrictEqual([]);
      expect(setLoading.mock.calls).toStrictEqual([[true], [false]]);
      expect(setSuccess.mock.calls).toStrictEqual([[false]]);
    }
  });
});

describe(`useRead()`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test(`gives expected results`, async () => {
    const taxReturnsUrl = `VITE_BACKEND_URL/taxreturns`;
    (global.fetch as Mock).mockResolvedValue(createFetchResponse());
    const { result } = renderHook(() => useRead<TaxReturn[]>(taxReturnsUrl));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.success).toBe(true));
    await waitFor(() => expect(result.current.data).toStrictEqual([{ facts }]));
  });

  test(`handles network errors`, async () => {
    const taxReturnsUrl = `VITE_BACKEND_URL/taxreturns`;
    (global.fetch as Mock).mockRejectedValue({ message: `FAKE NETWORK ERROR` });
    const { result } = renderHook(() => useRead<TaxReturn[]>(taxReturnsUrl));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.success).toBe(false));
    await waitFor(() => expect(result.current.data).toBe(undefined));
  });

  test(`handles non-200 error codes`, async () => {
    const taxReturnsUrl = `VITE_BACKEND_URL/taxreturns`;
    (global.fetch as Mock).mockResolvedValue(createFetchResponse({ data: taxreturnsError, status: 404 }));
    const { result } = renderHook(() => useRead<TaxReturn[]>(taxReturnsUrl));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.success).toBe(false));
    await waitFor(() => expect(result.current.data).toBe(undefined));
  });
});

describe(`GET /taxreturns`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test(`/taxreturns was successful `, async () => {
    (taxReturnFetch as Mock).mockReturnValue([]);
    await act(async () => {
      render(
        wrapComponent(
          <Provider store={store}>
            <SystemAlertContextProvider>
              <TaxReturnsContextProvider>
                <Home />
              </TaxReturnsContextProvider>
            </SystemAlertContextProvider>
          </Provider>
        )
      );
    });
    expect(await screen.findByTestId(`gridContainer`)).toBeInTheDocument();
  });

  test(`/taxreturns was unsuccessful`, async () => {
    (taxReturnFetch as Mock).mockImplementation(async () => {
      throw new ReadError(`Response was not successful`, 501);
    });

    // Because we already succesfully rendered once in a previous spec, we won't automatically refresh
    // returns.
    store.dispatch(fetchTaxReturns());
    await act(async () => {
      render(
        wrapComponent(
          <Provider store={store}>
            <SystemAlertContextProvider>
              <TaxReturnsContextProvider>
                <Home />
              </TaxReturnsContextProvider>
            </SystemAlertContextProvider>
          </Provider>
        )
      );
    });
    expect(await screen.findByTestId(`system-alert`)).toBeInTheDocument();
  });
});

describe(`save()`, () => {
  /**
   * save:
   *    a wrapper around fetch for making API calls to the backend
   */

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test(`calls fetch with expected headers, queryParams, and URL`, async () => {
    fakeFetch.mockResolvedValue(createFetchResponse({ body: {} }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual: any = await save<object>(`VITE_BACKEND_URL/example`, {
      headers: { mockHeader: `mock-value` },
    });
    expect(fakeFetch).toBeCalledTimes(1);
    expect(fakeFetch).toBeCalledWith(`VITE_BACKEND_URL/example`, {
      headers: {
        'Content-Type': `application/json`,
        mockHeader: `mock-value`,
      },
      method: `POST`,
    });
    expect(actual[0].facts).toStrictEqual(facts);
  });

  test(`handles network errors`, async () => {
    fakeFetch.mockRejectedValue({ message: `FAKE NETWORK ERROR` });
    try {
      await save(`VITE_BACKEND_URL/example`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error).toBeInstanceOf(ReadError);
      expect(error.message).toBe(`Network error`);
      expect(error.cause.message).toBe(`FAKE NETWORK ERROR`);
    }
  });

  test(`handles non-200 error codes by throwing if the body is not json`, async () => {
    fakeFetch.mockResolvedValue(createFetchResponse({ status: 404, contentType: `not application/json`, data: null }));
    try {
      await save(`VITE_BACKEND_URL/example`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error.status).toBe(404);
      expect(error.message).toBe(`Response was not successful`);
    }
  });

  test(`handles non-200 error codes by returning the json body, if valid`, async () => {
    fakeFetch.mockResolvedValue(
      createFetchResponse({
        status: 404,
        data: {
          status: `BAD_REQUEST`,
          message: `400 BAD_REQUEST "Something ain't right"`,
        },
      })
    );
    try {
      await save(`VITE_BACKEND_URL/example`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error.status).toBe(`BAD_REQUEST`);
    }
  });

  test(`error responses with an apiErrorKey are returned and considered translateable`, async () => {
    fakeFetch.mockResolvedValue(
      createFetchResponse({
        status: 404,
        data: {
          apiErrorKey: `some.key`,
        },
      })
    );
    try {
      await save(`VITE_BACKEND_URL/example`);
    } catch (error: unknown) {
      const translateable = isTranslateable(error);
      expect(translateable).toBeTruthy();
      translateable
        ? expect(error.apiErrorKey).toBe(`some.key`)
        : fail(
            `this statement is only reached if the previous expect were to fail.
            I just wrote the test this way so that we'd have a TS compilation check for
            isTranslateable usage in a unit test file`
          );
    }
  });

  test(`handles bad json`, async () => {
    fakeFetch.mockResolvedValue(createFetchResponse({ data: null, body: true }));
    const actual = await save(`VITE_BACKEND_URL/example`);
    expect(actual).toBeUndefined();
  });
});

describe(`useSave()`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test(`gives expected results`, async () => {
    const taxReturnsUrl = `VITE_BACKEND_URL/taxreturns`;
    (global.fetch as Mock).mockResolvedValue(createFetchResponse());
    const { result } = renderHook(() => useSave<TaxReturn[]>(taxReturnsUrl));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.success).toBe(false));
    await waitFor(() => expect(result.current.data).toStrictEqual(undefined));
    act(() => {
      result.current.save();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.success).toBe(true));
    await waitFor(() => expect(result.current.data).toStrictEqual([{ facts }]));
  });

  test(`handles network errors`, async () => {
    const taxReturnsUrl = `VITE_BACKEND_URL/taxreturns`;
    (global.fetch as Mock).mockRejectedValue({ message: `FAKE NETWORK ERROR` });
    const { result } = renderHook(() => useSave<TaxReturn[]>(taxReturnsUrl));
    act(() => {
      result.current.save();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.success).toBe(false));
    await waitFor(() => expect(result.current.data).toBe(undefined));
  });

  test(`handles non-200 error codes`, async () => {
    const taxReturnsUrl = `VITE_BACKEND_URL/taxreturns`;
    (global.fetch as Mock).mockResolvedValue(createFetchResponse({ data: taxreturnsError, status: 404 }));
    const { result } = renderHook(() => useSave<TaxReturn[]>(taxReturnsUrl));
    act(() => {
      result.current.save();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.success).toBe(false));
    await waitFor(() => expect(result.current.data).toBe(undefined));
  });
});

describe(`fetchPdf()`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test(`calls fetch with expected headers and URL`, async () => {
    fakeFetch.mockResolvedValue(createFetchResponse({ contentType: `application/pdf` }));
    await fetchPdf(`VITE_BACKEND_URL/example`, {
      hooks: { setLoading, setSuccess },
    });
    expect(fakeFetch).toBeCalledTimes(1);
    expect(fakeFetch).toBeCalledWith(`VITE_BACKEND_URL/example`, {
      headers: { 'Content-Type': `application/pdf` },
      method: `POST`,
    });
    expect(global.URL.createObjectURL).toBeCalledTimes(1);
    expect(global.open).toBeCalledTimes(1);
    expect(global.open).toBeCalledWith(`http://VITE_BACKEND_URL/pdf`);
    expect(setLoading.mock.calls).toStrictEqual([[true], [false]]);
    expect(setSuccess.mock.calls).toStrictEqual([[true]]);
  });

  test(`handles network errors`, async () => {
    fakeFetch.mockRejectedValue({ message: `FAKE NETWORK ERROR` });
    try {
      await fetchPdf(`VITE_BACKEND_URL/example`, {
        hooks: { setLoading, setSuccess },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error).toBeInstanceOf(ReadError);
      expect(error.message).toBe(`Network error`);
      expect(error.cause.message).toBe(`FAKE NETWORK ERROR`);
      expect(setLoading.mock.calls).toStrictEqual([[true], [false]]);
      expect(setSuccess.mock.calls).toStrictEqual([[false]]);
    }
  });

  test(`handles non-200 error codes`, async () => {
    fakeFetch.mockResolvedValue(createFetchResponse({ status: 404 }));
    try {
      await fetchPdf(`VITE_BACKEND_URL/example`, {
        hooks: { setLoading, setSuccess },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error).toBeInstanceOf(ReadError);
      expect(error.message).toBe(`Response was not successful`);
      expect(error.status).toBe(404);
      expect(setLoading.mock.calls).toStrictEqual([[true], [false]]);
      expect(setSuccess.mock.calls).toStrictEqual([[false]]);
    }
  });
});

describe(`useFetchPdf()`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test(`gives expected results`, async () => {
    (global.fetch as Mock).mockResolvedValue(createFetchResponse({ contentType: `application/pdf` }));
    const { result } = renderHook(() => useFetchPdf());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.success).toBe(false));
    act(() => {
      result.current.fetchPdf(`1234`);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.success).toBe(true));
  });

  test(`handles network errors`, async () => {
    (global.fetch as Mock).mockRejectedValue({ message: `FAKE NETWORK ERROR` });
    const { result } = renderHook(() => useFetchPdf());
    act(() => {
      result.current.fetchPdf(`1234`);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.success).toBe(false));
  });

  test(`handles non-200 error codes`, async () => {
    (global.fetch as Mock).mockResolvedValue(createFetchResponse({ data: taxreturnsError, status: 404 }));
    const { result } = renderHook(() => useFetchPdf());
    act(() => {
      result.current.fetchPdf(`1234`);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.success).toBe(false));
  });
});

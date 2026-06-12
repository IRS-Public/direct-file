import { renderHook, act } from '@testing-library/react';
import useNetworkConnectionStatus from './useNetworkConnectionStatus.js';
import App from '../App.js';
import { renderWithTranslationProvider } from '../test/test-utils.js';
import { vi } from 'vitest';

const intervalTime = 50;
const initialStatus = { online: true, prevOnlineStatus: true };
describe(`useNetworkConnectionStatus`, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  test(`updates online status when offline`, async () => {
    vi.spyOn(navigator, `onLine`, `get`).mockReturnValue(false);
    const { result } = renderHook(() => useNetworkConnectionStatus(initialStatus, intervalTime));

    await act(() => {
      renderWithTranslationProvider(<App />);
      vi.advanceTimersByTime(intervalTime * 2);
    });
    expect(result.current.online).toBe(false);
  });

  test(`updates online status when back online`, async () => {
    vi.spyOn(navigator, `onLine`, `get`).mockReturnValueOnce(false);
    vi.spyOn(navigator, `onLine`, `get`).mockReturnValue(true);

    const { result } = renderHook(() => useNetworkConnectionStatus(initialStatus, intervalTime));
    await act(() => {
      renderWithTranslationProvider(<App />);
      vi.advanceTimersByTime(intervalTime * 2);
    });

    expect(result.current.online).toBe(true);
  });
});

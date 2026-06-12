import { render, screen } from '@testing-library/react';
import { within } from '@testing-library/dom';
import { createRef } from 'react';
import { ModalRef } from '@trussworks/react-uswds';
import TransferInfoModal, { TransferInfoModalProps } from './TransferInfoModal.js';
import { v4 as uuidv4 } from 'uuid';
import { userEvent } from '@testing-library/user-event';
import { InterceptingFactGraph } from '../../../factgraph/InterceptingFactGraph.js';
import { vi } from 'vitest';

const mockFetchPdf = vi.fn();
const { mockUseFetchPdf, mockI18n, mockUseFactGraph } = vi.hoisted(() => ({
  mockUseFetchPdf: () => ({ fetchPdf: mockFetchPdf, loading: false }),
  mockI18n: { language: `en` },
  mockUseFactGraph: vi.fn(() => ({
    factGraph: new InterceptingFactGraph(),
  })),
}));
vi.mock(`../../../hooks/useApiHook`, () => ({
  useFetchPdf: mockUseFetchPdf,
}));
vi.mock(`react-i18next`, async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: (args: Parameters<typeof actual.useTranslation>) => ({
      ...actual.useTranslation(...args),
      i18n: mockI18n,
    }),
  };
});
vi.mock(`../../../factgraph/FactGraphContext`, () => ({
  useFactGraph: mockUseFactGraph,
}));

const defaultProps: TransferInfoModalProps = {
  modalRef: createRef<ModalRef>(),
  taxReturnUuid: uuidv4(),
};

describe(`TransferInfoModal`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const renderStatusInfoModal = (props: TransferInfoModalProps) => {
    render(<TransferInfoModal {...props} />);

    const modal = screen.getByRole(`dialog`);
    const heading = within(modal).getByRole(`heading`);
    const downloadPdfButton = within(modal).getByRole(`button`, { name: `downloadPdfButtonText` });
    const modalCloseButton = within(modal).getByRole(`button`, { name: `Close this window` });

    return { modal, heading, downloadPdfButton, modalCloseButton };
  };

  it(`Renders without error`, () => {
    const { modal, heading, downloadPdfButton, modalCloseButton } = renderStatusInfoModal(defaultProps);

    expect(modal).toHaveClass(`is-hidden`);
    expect(heading).toHaveTextContent(`heading`);
    expect(downloadPdfButton).toHaveTextContent(`downloadPdfButtonText`);
    expect(modalCloseButton).toBeInTheDocument();
  });

  it(`Calls the pdf endpoint when the download button is clicked`, async () => {
    const user = userEvent.setup();

    const { downloadPdfButton } = renderStatusInfoModal(defaultProps);

    expect(mockFetchPdf).not.toHaveBeenCalled();

    await user.click(downloadPdfButton);

    expect(mockFetchPdf).toHaveBeenCalledTimes(1);
    expect(mockFetchPdf).toHaveBeenCalledWith(defaultProps.taxReturnUuid);
  });
});

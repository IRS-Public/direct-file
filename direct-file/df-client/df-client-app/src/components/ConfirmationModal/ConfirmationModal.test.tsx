/* eslint-disable max-len */
import { render, screen } from '@testing-library/react';
import { initI18n } from '../../i18n.js';
import ConfirmationModal from './ConfirmationModal.js';
import { vi } from 'vitest';

const i18next = await initI18n();
i18next.addResourceBundle(`test`, `translation`, {
  fields: {
    '/formW2s': {
      deleteControl: {
        text: `<LinkModal1>Remove this W2 from your tax return</LinkModal1>`,
        LinkModal1: {
          header: `Are you sure you want to remove this W2 from your tax return?`,
          body: [
            {
              p: `This can't be undone.`,
            },
          ],
        },
      },
    },
  },
});
i18next.changeLanguage(`test`);

const mockHandleConfirm = vi.fn();
const mockHandleCancel = vi.fn();

describe(`ConfirmationModal`, () => {
  const i18nKey = `fields./formW2s.deleteControl`;

  it(`renders text with a modal link`, () => {
    render(<ConfirmationModal handleConfirm={() => undefined} collectionId={null} i18nKey={i18nKey} />);
    expect(screen.getByRole(`button`, { name: `Remove this W2 from your tax return` })).toBeInTheDocument();
  });

  it(`renders the text content inside body`, async () => {
    render(<ConfirmationModal handleConfirm={() => undefined} collectionId={null} i18nKey={i18nKey} />);
    expect(
      await screen.findByRole(`heading`, { name: `Are you sure you want to remove this W2 from your tax return?` })
    ).toBeInTheDocument();
    expect(screen.getByText(/This can't be undone./)).toBeInTheDocument();
  });

  it(`renders a decorative icon to the opener with 'icon' prop`, () => {
    render(<ConfirmationModal handleConfirm={() => undefined} collectionId={null} i18nKey={i18nKey} icon='Delete' />);
    expect(screen.getByRole(`img`, { hidden: true })).toBeInTheDocument();
  });

  // TODO: get coverage of these modals via e2e testing in Cypress or something like that
  // alternatively, figure out how to mock tabbable with vitest
  // Error: Your focus-trap must have at least one container with at least one tabbable node in it at all times
  it.skip(`calls handleConfirm when the confirmation button is clicked`, async () => {
    render(<ConfirmationModal handleConfirm={mockHandleConfirm} collectionId={null} i18nKey={i18nKey} />);
    screen.getByRole(`button`, { name: `Remove this W2 from your tax return` }).click(); // launch modal
    (await screen.findByRole(`button`, { name: `Remove this W2 from your tax return` })).click(); // click confirm
    expect(mockHandleConfirm).toHaveBeenCalledTimes(1);
  });

  // TODO: get coverage of these modals via e2e testing in Cypress or something like that
  // alternatively, figure out how to mock tabbable with vitest
  // Error: Your focus-trap must have at least one container with at least one tabbable node in it at all times
  it.skip(`calls handleCancel when the cancel button is clicked`, async () => {
    render(
      <ConfirmationModal
        handleConfirm={() => undefined}
        handleCancel={mockHandleCancel}
        collectionId={null}
        i18nKey={i18nKey}
      />
    );
    screen.getByRole(`button`, { name: `Remove this W2 from your tax return` }).click(); // launch modal
    (await screen.findByRole(`button`, { name: `Cancel` })).click(); // click cancel
    expect(mockHandleCancel).toHaveBeenCalledTimes(1);
  });
});

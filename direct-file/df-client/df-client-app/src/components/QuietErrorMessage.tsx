import type { ErrorMessage } from '@trussworks/react-uswds';
import classnames from 'classnames';
import React from 'react';

/**
 * Stylistically identical to trusswork's ErrorMessage component, but without the alert role
 */
type Props = {
  children: React.ReactNode;
  className: string;
  id: string;
}
export const QuietErrorMessage: typeof ErrorMessage = ({ children, className, id }: Props) => {
  const classes = classnames(`usa-error-message`, className);

  return (
    <span data-testid='errorMessage' className={classes} id={id}>
      {children}
    </span>
  );
};

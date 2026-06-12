import { FC, PropsWithChildren } from 'react';
import { Icon } from '@trussworks/react-uswds';
// mysterious linter error, but the build is fine
// eslint-disable-next-line import/no-unresolved
import classNames from 'classnames';
import styles from './IconDisplay.module.scss';
import { useTranslation } from 'react-i18next';

/* USWDS Icons can be found at https://designsystem.digital.gov/components/icon/
 * or https://trussworks.github.io/react-uswds/?path=/docs/components-icons-individual */
export type IconName = Exclude<keyof typeof Icon, 'prototype'>;

export type IconDisplayProps = PropsWithChildren<
  {
    name: IconName;
    className?: string;
    style?: React.CSSProperties;
    i18nKey?: string;
    isCentered?: boolean;
  } & any
>;

/* we can pass in className and bare style props, which will be merged with the styles from the module,
for example: <IconDisplay name="Construction" size={6} className="custom-style" style={{ color: 'red' }} /> */
const IconDisplay: FC<IconDisplayProps> = ({ name, className, style, i18nKey, isCentered, ...props }) => {
  const IconComponent = Icon[name];
  const { t } = useTranslation();
  const label = i18nKey ? t(`${i18nKey}`) : undefined;
  const isAriaHidden = label ? false : true;

  const combinedClassName = classNames(`${styles.icon}`, className, { [styles.centered]: isCentered });

  return (
    <IconComponent
      aria-label={label}
      aria-hidden={isAriaHidden}
      className={combinedClassName}
      style={style}
      {...props}
    />
  );
};

export default IconDisplay;

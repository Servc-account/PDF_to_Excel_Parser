import './Button.scss';
import { Tooltip } from '../Tooltip/Tooltip';
import { useState } from 'react';
import { Svgicon } from '../Svgicon/Svgicon';

export type ButtonProps = {
  children?: JSX.Element | JSX.Element[] | string | null,
  className?: string,
  'data-test'?: string,
  dataTest?: string,
  disabled?: boolean,
  icon?: 'left' | 'no' | 'only' | 'right',
  iconClassName?: string,
  iconColor?: string,
  iconHoveredColor?: string,
  iconid?: string,
  isLoading?: boolean,
  loadingSpinnerId?: string,
  onClick?: (event?: React.MouseEvent<HTMLElement>) => void,
  size?: 'bigger-medium' | 'large' | 'medium' | 'normal' | 'small',
  squared?: boolean,
  submit?: boolean,
  text?: string,
  tooltip?: JSX.Element | JSX.Element[] | string,
  tooltipWrapperClass?: string,
  type?:
  'black' | 'green' | 'fms-main' | 'grey' | 'light-main' | 'main' | 'outline-grey' | 'outline-main' | 'red' | 'total-black' | 'transparent-grey' | 'transparent' | 'white-main' | 'white',
};

const defaultProps: ButtonProps = {
  size: 'medium',
  type: 'main',
};

export const Button = ({
  children,
  className,
  dataTest,
  disabled,
  icon,
  iconClassName,
  iconColor,
  iconHoveredColor,
  iconid,
  isLoading,
  loadingSpinnerId,
  onClick,
  size = defaultProps.size,
  squared,
  submit,
  text,
  tooltip,
  tooltipWrapperClass,
  type = defaultProps.type,
  ...props
}: ButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  let buttonCss = [
    type,
    size,
  ].join(' ');
  if (squared) {
    buttonCss += ' squared';
  }

  if (icon === 'only') {
    buttonCss += ` w-${size}`;
  }

  if (isLoading) {
    buttonCss += ' loading disabled';
  } else if (disabled) {
    buttonCss += ' disabled';
  }

  // eslint-disable-next-line eslint-rules/no-direct-jsx-assignment
  const spinner =
    <div className={`spinner-svg icon ${size} left`}>
      <Svgicon id={loadingSpinnerId || 'other-11f'} />
    </div>;

  const renderIcon = (position: 'left' | 'only' | 'right') => {
    if (isLoading) {
      return (
        <div
          className={`spinner-svg icon ${position}`}
        >
          <Svgicon id={loadingSpinnerId || 'other-11f'} />
        </div>
      );
    } else {
      return (
        <div
          className={[
            'icon',
            iconClassName || size,
            position,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Svgicon
            className={position === 'only' ? '' : `icon ${size}`}
            color={isHovered && iconHoveredColor ? iconHoveredColor : iconColor}
            id={iconid}
          />
        </div>
      );
    }
  };

  return (
    <div className={`tooltip-wrapper grey flex w-full justify-center ${tooltipWrapperClass}`}>
      {tooltip && <Tooltip>{tooltip}</Tooltip>}
      <button
        className={[
          'servc-button',
          buttonCss,
          className,
        ]
          .filter(Boolean)
          // eslint-disable-next-line id-length
          .map((i) => (i as string).trim())
          .join(' ')}
        data-test={dataTest}
        disabled={disabled || isLoading}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        type={submit ? 'submit' : 'button'}
        {...props}
      >
        {(icon === 'no' || icon === undefined) && isLoading && spinner}
        {icon === 'left' && renderIcon('left')}
        {icon === 'only' && renderIcon('only')}
        {text}
        {children}
        {icon === 'right' && renderIcon('right')}
      </button>
    </div>
  );
};

import './Checkbox.scss';
import { clsx } from 'clsx';
import { Svgicon } from '../Svgicon/Svgicon';
import React from 'react';

type CheckboxProps = {
  addClass?: string,
  checkboxClassName?: string,
  disabled?: boolean,
  id?: string,
  // works only whith selected = true
  intermediate?: boolean,
  isGreen?: boolean,
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void,
  readOnly?: boolean,
  selected?: boolean,
  text?: string,
};

// eslint-disable-next-line import/no-named-as-default-member
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ addClass,
    checkboxClassName,
    disabled = false,
    id,
    intermediate = false,
    isGreen = false,
    onChange,
    readOnly = false,
    selected,
    text = '',
    ...props }, ref) => {
    return (
      <div className={clsx('checkbox-container', addClass, { green: isGreen })}>
        <input checked={selected} id={id} onChange={onChange} readOnly={readOnly} ref={ref} type='checkbox' {...props} disabled={disabled} />
        <div className={clsx('checkbox', checkboxClassName)}>
          <Svgicon id={intermediate ? 'check-circle-1f' : 'check-2f'} />
        </div>
        {text ?
          <div className='checkbox-text'>{text}</div> :
          null}
      </div>
    );
  },
);

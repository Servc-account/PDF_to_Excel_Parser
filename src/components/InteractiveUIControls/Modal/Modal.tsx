import './Modal.scss';
import { Svgicon } from '../Svgicon/Svgicon';
import { type CSSProperties,
  useEffect } from 'react';

export type ModalProps = {
  children?: JSX.Element | JSX.Element[] | string,
  className?: string[] | string,
  onSubmit?: () => void,
  onToggle?: (value: boolean) => void,
  showCloseIcon?: boolean,
  size?: 'fit-content' | 'l' | 'm' | 's' | 'xs',
  style?: CSSProperties,
  toggle?: boolean,
};

export const Modal = ({
  children,
  className,
  onSubmit,
  onToggle = () => {},
  showCloseIcon = false,
  size = 'fit-content',
  style,
  toggle = true,
}: ModalProps) => {
  let classes = '';
  if (className) {
    classes = Array.isArray(className) ? className.join(' ') : className;
  }

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onToggle(false);
      }
    };

    const handleEnterKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && onSubmit) {
        event.preventDefault();
        onSubmit();
      }
    };

    if (toggle) {
      document.addEventListener('keydown', handleEscapeKey);
      document.addEventListener('keydown', handleEnterKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('keydown', handleEnterKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onToggle,
    toggle,
  ]);

  if (!toggle) {
    return null;
  }

  return (
    <div className={`modal-window ${classes}`} style={style || {}}>
      <div className='modal-container'>
        <div className={`modal-card size-${size}`}>
          {showCloseIcon &&
            <div className='close-circle' onClick={() => onToggle(false)}>
              <div className='svg-close'>
                <Svgicon color='black' id='close-1f' />
              </div>
            </div>
          }
          {children}
        </div>
      </div>
    </div>
  );
};

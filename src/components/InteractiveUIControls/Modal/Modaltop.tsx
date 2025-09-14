import './Modal.scss';
import { Button } from '../Button/Button';
import { type ReactNode } from 'react';

type ModalTopProps = {
  back?: () => void,
  centred?: boolean,
  children?: ReactNode,
  // new back button
  greyLine?: boolean,
  subtitle?: string | undefined,
  title?: string,
  // new divider line in top modal
};

export const ModalTop = ({
  back,
  centred = false,
  children,
  greyLine = false,
  subtitle,
  title,
}: ModalTopProps) => {
  return (
    <div className={`modal-top ${centred ? 'centred' : ''}`}>
      {back &&
        <Button
          icon='left'
          iconid='arrow-left-1f'
          onClick={back}
          size='small'
          text='Back'
          type='light-main'
        />
      }
      <div className='title-container'>
        {title ?
          <div className='text-title-3 font-[500]' data-test={`modal-${title}`}>
            {title}
          </div>
          :
          children
        }
        {subtitle &&
          <div className='text-font-3 text-black-700'>{subtitle}</div>
        }
      </div>
      {greyLine && <hr className='grey-line' />}
    </div>
  );
};

import './Modal.scss';
import { Button,
  type ButtonProps } from '../Button/Button';

type ModalBottomProps = {
  leftButton?: string,
  leftButtonProps?: ButtonProps,
  onApply: () => void,
  onToggle?: (value: boolean) => void,
  rightButton?: string,
  rightButtonProps?: ButtonProps,
  submit?: boolean,
};

export const ModalBottom = ({
  leftButton = 'Cancel',
  leftButtonProps,
  onApply,
  onToggle,
  rightButton = 'Apply',
  rightButtonProps,
}: ModalBottomProps) => {
  return (
    <div className='modal-bottom'>
      <div className='button-container'>
        {leftButton && onToggle &&
          <Button
            className={leftButtonProps?.className}
            dataTest={
              leftButtonProps?.dataTest || 'data-test-left-modal-button'
            }
            disabled={leftButtonProps?.disabled}
            isLoading={leftButtonProps?.isLoading}
            loadingSpinnerId={leftButtonProps?.loadingSpinnerId}
            onClick={() => onToggle(false)}
            size={leftButtonProps?.size || 'medium'}
            squared={leftButtonProps?.squared}
            text={leftButton}
            type={leftButtonProps?.type || 'light-main'}
          />
        }
        {onApply &&
          <Button
            className={rightButtonProps?.className}
            dataTest={
              rightButtonProps?.dataTest || 'data-test-right-modal-button'
            }
            disabled={rightButtonProps?.isLoading || rightButtonProps?.disabled}
            isLoading={rightButtonProps?.isLoading}
            loadingSpinnerId={rightButtonProps?.loadingSpinnerId}
            onClick={() => onApply()}
            size={rightButtonProps?.size || 'medium'}
            squared={rightButtonProps?.squared}
            submit={rightButtonProps?.submit}
            text={rightButton}
            type={rightButtonProps?.type || 'main'}
          />
        }
      </div>
    </div>
  );
};

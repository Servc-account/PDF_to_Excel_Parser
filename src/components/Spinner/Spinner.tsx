import style from './Spinner.module.scss';
import { clsx } from 'clsx';

type SpinnerProps = {
  styles?: string,
};

const Spinner = ({ styles }: SpinnerProps) => {
  return (
    <div className={clsx(style.spinnerOverlay, styles)}>
      <div className={style.spinnerContainer} />
    </div>
  );
};

export { Spinner };

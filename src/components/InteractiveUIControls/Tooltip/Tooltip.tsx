type Props = {
  children?: JSX.Element | JSX.Element[] | string,
};

export const Tooltip = ({children}: Props) => {
  return (
    <div className='legend-tooltip'>
      <div className='tooltip-body'>{children}</div>
    </div>
  );
};

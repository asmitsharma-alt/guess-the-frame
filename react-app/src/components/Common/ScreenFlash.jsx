import React from 'react';

export const ScreenFlash = ({ isFlashing }) => {
  return (
    <div className={`screen-flash ${isFlashing ? 'go' : ''}`} id="screenFlash" />
  );
};

export default ScreenFlash;

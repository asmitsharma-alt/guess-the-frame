const fs = require('fs');
const path = require('path');

const rawPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'Common', 'svg-defs.raw.html');
const outPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'Common', 'SvgIcons.jsx');

const raw = fs.readFileSync(rawPath, 'utf8');
const content = `import React from 'react';

const svgDefs = ${JSON.stringify(raw)};

export const SvgIcons = () => (
  <div
    aria-hidden="true"
    style={{ display: 'none' }}
    dangerouslySetInnerHTML={{ __html: svgDefs }}
  />
);

export const SvgIcon = ({ name, className = 'svg-icon', ...props }) => (
  <svg className={className} {...props}>
    <use href={'#' + name} />
  </svg>
);

export default SvgIcons;
`;

fs.writeFileSync(outPath, content, 'utf8');
fs.unlinkSync(rawPath);
console.log('SvgIcons.jsx generated successfully!');

const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'style.css');

try {
  let css = fs.readFileSync(cssPath, 'utf8');
  const oldRule = 'bottom:-44px!important';
  const newRule = 'bottom:-68px!important';

  if (css.includes(oldRule)) {
    css = css.replace(oldRule, newRule);
    fs.writeFileSync(cssPath, css);
  }
} catch (error) {
  console.error('Cube position patch failed:', error.message);
}

require('./server-original.js');

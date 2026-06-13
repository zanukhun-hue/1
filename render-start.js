const fs = require('fs');

const file = 'style.css';

try {
  let css = fs.readFileSync(file, 'utf8');
  css = css.replace('bottom:-44px!important', 'bottom:-68px!important');
  fs.writeFileSync(file, css);
} catch (error) {
  console.error('Style patch failed:', error.message);
}

require('./server.js');

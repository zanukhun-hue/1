const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'style.css');

const timelineCss = String.raw`

/* AE vertical timeline v2 */
body[data-page="home"] main:before{
  content:""!important;
  position:absolute!important;
  top:104px!important;
  bottom:auto!important;
  left:18px!important;
  width:112px!important;
  height:390px!important;
  z-index:1!important;
  pointer-events:none!important;
  opacity:1!important;
  border:1px solid rgba(255,255,255,.10)!important;
  border-radius:20px!important;
  background:
    linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.03)) padding-box,
    repeating-linear-gradient(180deg,rgba(255,255,255,.10) 0 1px,transparent 1px 38px),
    linear-gradient(90deg,transparent 0 31px,rgba(59,130,246,.95) 31px 33px,transparent 33px 100%),
    radial-gradient(circle at 32px 18px,rgba(59,130,246,.95) 0 5px,transparent 6px),
    rgba(8,10,18,.54)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 24px 70px rgba(0,0,0,.24)!important;
  backdrop-filter:blur(16px)!important;
  clip-path:none!important;
}
body[data-page="home"] main:after{
  content:""!important;
  position:absolute!important;
  top:158px!important;
  bottom:auto!important;
  left:54px!important;
  width:74px!important;
  height:250px!important;
  z-index:2!important;
  pointer-events:none!important;
  opacity:1!important;
  background:
    linear-gradient(90deg,rgba(99,102,241,.98),rgba(139,92,246,.82)) 0 0/55px 16px no-repeat,
    linear-gradient(90deg,rgba(147,197,253,.95),rgba(99,102,241,.60)) 10px 38px/62px 16px no-repeat,
    linear-gradient(90deg,rgba(110,231,183,.92),rgba(45,212,191,.55)) 2px 76px/48px 16px no-repeat,
    linear-gradient(90deg,rgba(245,158,11,.92),rgba(239,68,68,.62)) 16px 114px/56px 16px no-repeat,
    linear-gradient(90deg,rgba(99,102,241,.78),rgba(255,255,255,.18)) 6px 152px/44px 16px no-repeat,
    linear-gradient(90deg,rgba(45,212,191,.75),rgba(99,102,241,.36)) 20px 190px/52px 16px no-repeat!important;
  filter:drop-shadow(0 8px 14px rgba(0,0,0,.22))!important;
  clip-path:none!important;
  box-shadow:none!important;
}
.page-hero-home:before{
  content:"00s\A 02s\A 04s\A 06s\A 08s\A 10s"!important;
  white-space:pre!important;
  position:absolute!important;
  left:30px!important;
  top:150px!important;
  z-index:3!important;
  pointer-events:none!important;
  font-family:JetBrains Mono,monospace!important;
  font-size:.58rem!important;
  line-height:38px!important;
  font-weight:800!important;
  color:rgba(169,179,201,.82)!important;
  opacity:1!important;
  letter-spacing:.02em!important;
}
.page-hero-home:after{
  content:"TIMELINE\A TRACKS\A LAYERS\A AE"!important;
  white-space:pre!important;
  position:absolute!important;
  left:24px!important;
  top:112px!important;
  z-index:3!important;
  pointer-events:none!important;
  font-family:JetBrains Mono,monospace!important;
  font-size:.54rem!important;
  line-height:1.55!important;
  font-weight:900!important;
  color:rgba(99,102,241,.92)!important;
  opacity:.88!important;
  letter-spacing:.08em!important;
}
@media(max-width:980px){
  body[data-page="home"] main:before,
  body[data-page="home"] main:after,
  .page-hero-home:before,
  .page-hero-home:after{display:none!important}
}
`;

try {
  let css = fs.readFileSync(cssPath, 'utf8');
  css = css.replace('bottom:-44px!important', 'bottom:-68px!important');

  if (!css.includes('/* AE vertical timeline v2 */')) {
    css += timelineCss;
  }

  fs.writeFileSync(cssPath, css);
} catch (error) {
  console.error('Visual patch failed:', error.message);
}

require('./server-original.js');

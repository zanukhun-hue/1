const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'style.css');

const timelineCss = String.raw`

/* AE vertical scroll timeline v3 */
body[data-page="home"] main{
  overflow:hidden!important;
}
body[data-page="home"] main:before{
  content:""!important;
  position:absolute!important;
  top:92px!important;
  bottom:0!important;
  left:18px!important;
  width:118px!important;
  height:auto!important;
  z-index:1!important;
  pointer-events:none!important;
  opacity:1!important;
  border:1px solid rgba(255,255,255,.10)!important;
  border-radius:22px!important;
  background:
    linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.025)) padding-box,
    linear-gradient(90deg,transparent 0 34px,rgba(59,130,246,.92) 34px 36px,transparent 36px 100%),
    repeating-linear-gradient(180deg,rgba(255,255,255,.13) 0 1px,transparent 1px 42px),
    repeating-linear-gradient(180deg,rgba(99,102,241,.16) 0 24px,transparent 24px 84px),
    rgba(8,10,18,.50)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 24px 80px rgba(0,0,0,.25)!important;
  backdrop-filter:blur(16px)!important;
  clip-path:none!important;
}
body[data-page="home"] main:after{
  content:""!important;
  position:absolute!important;
  top:126px!important;
  bottom:auto!important;
  left:55px!important;
  width:74px!important;
  height:calc(100% - 150px)!important;
  z-index:2!important;
  pointer-events:none!important;
  opacity:1!important;
  background:
    linear-gradient(90deg,rgba(99,102,241,.98),rgba(139,92,246,.74)) 0 0/56px 16px repeat-y,
    linear-gradient(90deg,rgba(147,197,253,.95),rgba(99,102,241,.55)) 13px 42px/62px 16px repeat-y,
    linear-gradient(90deg,rgba(110,231,183,.92),rgba(45,212,191,.50)) 3px 84px/48px 16px repeat-y,
    linear-gradient(90deg,rgba(245,158,11,.92),rgba(239,68,68,.58)) 18px 126px/56px 16px repeat-y,
    linear-gradient(90deg,rgba(99,102,241,.76),rgba(255,255,255,.16)) 7px 168px/44px 16px repeat-y!important;
  background-size:56px 252px,62px 252px,48px 252px,56px 252px,44px 252px!important;
  filter:drop-shadow(0 8px 14px rgba(0,0,0,.22))!important;
  clip-path:inset(0 0 100% 0)!important;
  box-shadow:none!important;
  transform-origin:top!important;
  animation:aeTimelineScrollReveal linear both!important;
  animation-timeline:scroll(root block)!important;
  animation-range:0 82%!important;
}
.page-hero-home:before{
  content:"00s\A 02s\A 04s\A 06s\A 08s\A 10s\A 12s\A 14s\A 16s\A 18s\A 20s\A 22s"!important;
  white-space:pre!important;
  position:absolute!important;
  left:30px!important;
  top:136px!important;
  z-index:3!important;
  pointer-events:none!important;
  font-family:JetBrains Mono,monospace!important;
  font-size:.58rem!important;
  line-height:42px!important;
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
  top:104px!important;
  z-index:3!important;
  pointer-events:none!important;
  font-family:JetBrains Mono,monospace!important;
  font-size:.54rem!important;
  line-height:1.55!important;
  font-weight:900!important;
  color:rgba(99,102,241,.92)!important;
  opacity:.90!important;
  letter-spacing:.08em!important;
}
@keyframes aeTimelineScrollReveal{
  0%{clip-path:inset(0 0 100% 0);opacity:.35}
  16%{opacity:.82}
  100%{clip-path:inset(0 0 0 0);opacity:1}
}
@supports not (animation-timeline:scroll()){
  body[data-page="home"] main:after{
    clip-path:none!important;
    animation:aeTimelineFallback 4.8s ease-in-out infinite alternate!important;
  }
  @keyframes aeTimelineFallback{
    0%{opacity:.42;transform:translateY(-10px)}
    100%{opacity:1;transform:translateY(10px)}
  }
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
  css = css.replace(/\n\/\* AE vertical timeline v2 \*\/[\s\S]*$/g, '');
  css = css.replace(/\n\/\* AE vertical scroll timeline v3 \*\/[\s\S]*$/g, '');
  css += timelineCss;

  fs.writeFileSync(cssPath, css);
} catch (error) {
  console.error('Visual patch failed:', error.message);
}

require('./server-original.js');

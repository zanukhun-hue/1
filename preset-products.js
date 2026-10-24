'use strict';
const PRICE_STARS = 100;
const BOT_URL = 'https://t.me/null_object_ae_bot';
const PACKS = Object.freeze([
  {id:'shakes',title:'Шейки и движения',count:41},
  {id:'color',title:'Цветокоррекция',count:18},
  {id:'distortion',title:'Искажения',count:12},
  {id:'glow',title:'Свечение и свет',count:10},
  {id:'text',title:'Текстовые эффекты',count:9},
  {id:'frames',title:'1 Frame эффекты',count:8},
  {id:'speed',title:'Скорость и замедление',count:6},
  {id:'glitch',title:'Glitch и CRT',count:5},
  {id:'effects',title:'Другие эффекты',count:4}
].map(p=>Object.freeze({...p,zip:p.id+'.zip'})));
const COMMANDS = [
  {command:'start',description:'Открыть магазин пресетов'},
  {command:'packs',description:'9 наборов по 100 Stars'},
  {command:'myorders',description:'Мои покупки и повторная выдача'},
  {command:'help',description:'Как купить и установить пресеты'},
  {command:'paysupport',description:'Помощь с оплатой и выдачей'},
  {command:'terms',description:'Условия покупки'}
];
function telegramLink(raw,id) {
  if(!PACKS.some(p=>p.id===id))return null;
  const m=String(raw||BOT_URL).match(/^https:\/\/t\.me\/([a-zA-Z][a-zA-Z0-9_]{4,31})(?:\/|\?|$)/);
  return m?'https://t.me/'+m[1]+'?start=pack_'+id:null;
}
module.exports={PRICE_STARS,BOT_URL,PACKS,COMMANDS,telegramLink};

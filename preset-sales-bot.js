'use strict';

/**
 * Digital After Effects preset store for the EXISTING Telegram moderation bot.
 * Purchases in Telegram use Telegram Stars (XTR); never accept screenshots
 * or client callbacks as proof of payment.
 *
 * Required in Render:
 * TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_CHAT_ID
 * SUPABASE_URL, SUPABASE_ADMIN_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 * PRESET_PRICE_STARS (integer, no implicit FX conversion from RUB)
 * Supabase PRIVATE bucket: paid-presets
 * Supabase SQL: preset-sales-schema.sql
 *
 * Paid ZIPs must NOT be committed to public Git or exposed under /assets.
 */
const crypto = require('crypto');

const PACKS = Object.freeze([
  {id:'shakes', title:'Шейки и движения', count:41, zip:'01_SHAKES_149_RUB.zip'},
  {id:'color', title:'Цветокоррекция', count:18, zip:'02_COLOR_149_RUB.zip'},
  {id:'distortion', title:'Искажения', count:12, zip:'03_DISTORTION_149_RUB.zip'},
  {id:'glow', title:'Свечение и свет', count:10, zip:'04_GLOW_149_RUB.zip'},
  {id:'text', title:'Текстовые эффекты', count:9, zip:'05_TEXT_149_RUB.zip'},
  {id:'frames', title:'1 Frame эффекты', count:8, zip:'06_ONE_FRAME_149_RUB.zip'},
  {id:'speed', title:'Скорость и замедление', count:6, zip:'07_SPEED_149_RUB.zip'},
  {id:'glitch', title:'Glitch и CRT', count:5, zip:'08_GLITCH_149_RUB.zip'},
  {id:'effects', title:'Другие эффекты', count:4, zip:'09_EFFECTS_149_RUB.zip'}
]);
const PACK_BY_ID = new Map(PACKS.map(p => [p.id, p]));
const tgEscape = s => String(s).replace(/[\r\n]/g, ' ').slice(0, 150);
const storageBucket = 'paid-presets';

function createPresetSales({telegramApi, site, supabase, supabaseRequest}) {
  let usernameCache = '';
  const starPrice = () => {
    const price = Number(process.env.PRESET_PRICE_STARS);
    return Number.isSafeInteger(price) && price > 0 && price <= 10000 ? price : 0;
  };
  const configured = () => Boolean(site.tgBotToken && supabase.url && supabase.adminKey && starPrice());
  async function send(chatId, text, reply_markup) {
    return telegramApi('sendMessage', {chat_id:chatId, text, disable_web_page_preview:true, ...(reply_markup ? {reply_markup} : {})});
  }
  function packButtons() {
    return {inline_keyboard:PACKS.map(p => ([{text:p.title+' ('+p.count+')',callback_data:'presets:view:'+p.id}]))};
  }
  function menuButtons(pack) {
    return {inline_keyboard:[
      [{text:'⭐ Оплатить набор',callback_data:'presets:buy:'+pack.id}],
      [{text:'← Все наборы',callback_data:'presets:list'}]
    ]};
  }
  async function showPack(chatId,id) {
    const p = PACK_BY_ID.get(id);
    if (!p) return send(chatId, 'Набор не найден. Введите /packs');
    const cost = starPrice();
    return send(chatId,'🎬 '+p.title+'\n\nВнутри: '+p.count+' пресетов .ffx для After Effects.\n'+(cost ? 'Цена в Telegram: '+cost+' ⭐ Stars.' : 'Оплата пока не настроена.')+'\n\nПосле успешной оплаты бот автоматически пришлёт ZIP с набором. Некоторые эффекты требуют установленных плагинов.',menuButtons(p));
  }
  function parsePayload(value) {
    const m = /^pack:([a-z]+):([0-9]{1,20}):([a-f0-9]{16})$/.exec(String(value||''));
    return m && PACK_BY_ID.has(m[1]) ? {id:m[1],userId:m[2]} : null;
  }
  function privateUrl(zip) {
    return supabase.url+'/storage/v1/object/'+storageBucket+'/'+encodeURIComponent(zip);
  }
  function privateHeaders() {
    return {apikey:supabase.adminKey,Authorization:'Bearer '+supabase.adminKey};
  }
  async function fileReady(pack) {
    if (!supabase.url || !supabase.adminKey) return false;
    const response = await fetch(privateUrl(pack.zip),{headers:{...privateHeaders(),Range:'bytes=0-0'}});
    if (response.body) await response.body.cancel().catch(()=>{});
    return response.ok;
  }
  async function invoice(chatId,userId,id) {
    const pack = PACK_BY_ID.get(id);
    if (!pack) return send(chatId,'Набор не найден.');
    if (!configured()) return send(chatId,'Оплата пока не подключена. Автор настраивает магазин.');
    if (!(await fileReady(pack))) return send(chatId,'Этот набор ещё загружается в защищённое хранилище. Попробуйте позже.');
    const payload = 'pack:'+pack.id+':'+userId+':'+crypto.randomBytes(8).toString('hex');
    return telegramApi('sendInvoice',{
      chat_id:chatId,
      title:pack.title.slice(0,32),
      description:pack.count+' авторских пресетов .ffx для Adobe After Effects. Выдача ZIP после оплаты.',
      payload,
      provider_token:'',
      currency:'XTR',
      prices:[{label:pack.title,amount:starPrice()}],
      start_parameter:'pack_'+pack.id
    });
  }
  async function onPrecheckout(query) {
    const p = parsePayload(query.invoice_payload);
    const valid = p && String(query.from.id)===p.userId && configured() &&
      query.currency==='XTR' && query.total_amount===starPrice();
    let ok=Boolean(valid);
    if (ok) {
      try {ok=await fileReady(PACK_BY_ID.get(p.id));} catch (_) {ok=false;}
    }
    return telegramApi('answerPreCheckoutQuery',{
      pre_checkout_query_id:query.id,
      ok,
      ...(ok?{}:{error_message:'Оплата пока недоступна. Попробуйте позже.'})
    });
  }
  async function saveOrder(charge,userId,chatId,packId,stars) {
    const row={telegram_payment_charge_id:charge,telegram_user_id:Number(userId),chat_id:Number(chatId),pack_id:packId,amount_stars:stars,status:'paid'};
    await supabaseRequest('preset_sales_orders?on_conflict=telegram_payment_charge_id',{
      method:'POST',
      headers:{'Content-Type':'application/json','Prefer':'resolution=ignore-duplicates,return=minimal'},
      body:JSON.stringify(row)
    },true);
    const rows=await supabaseRequest('preset_sales_orders?telegram_payment_charge_id=eq.'+encodeURIComponent(charge)+'&select=*',{},true);
    if (!Array.isArray(rows)||rows.length!==1) throw Error('Sale not persisted');
    if (String(rows[0].telegram_user_id)!==String(userId)||rows[0].pack_id!==packId) throw Error('Charge ID collision');
    return rows[0];
  }
  async function updateOrder(charge,patch) {
    return supabaseRequest('preset_sales_orders?telegram_payment_charge_id=eq.'+encodeURIComponent(charge),{
      method:'PATCH',
      headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify(patch)
    },true);
  }
  async function sendArchive(chatId,pack) {
    const result=await fetch(privateUrl(pack.zip),{headers:privateHeaders()});
    if (!result.ok) throw Error('Private ZIP unavailable ('+result.status+')');
    const bytes=Buffer.from(await result.arrayBuffer());
    // Bot API multipart upload limit is 50 MB; reserve room for overhead.
    if (!bytes.length||bytes.length>45*1024*1024) throw Error('ZIP exceeds safe Telegram size limit');
    const data=new FormData();
    data.append('chat_id',String(chatId));
    data.append('caption','✅ Оплаченный набор: '+pack.title+'\n'+pack.count+' пресетов для After Effects. Приятного монтажа!');
    data.append('document',new Blob([bytes],{type:'application/zip'}),pack.zip);
    const response=await fetch('https://api.telegram.org/bot'+site.tgBotToken+'/sendDocument',{method:'POST',body:data});
    const answer=await response.json().catch(()=>({}));
    if (!response.ok||!answer.ok) throw Error('Telegram sendDocument failed: '+String(answer.description||response.status));
    return answer.result?.document?.file_id||null;
  }
  async function deliverOrder(order) {
    const pack=PACK_BY_ID.get(order.pack_id);
    if (!pack) throw Error('Unknown pack for order');
    if (order.status==='delivered') return;
    const fileId=await sendArchive(order.chat_id,pack);
    await updateOrder(order.telegram_payment_charge_id,{status:'delivered',telegram_file_id:fileId,delivered_at:new Date().toISOString()});
  }
  async function onPayment(message) {
    const pay=message.successful_payment,p=parsePayload(pay?.invoice_payload);
    if (!p || String(message.from?.id)!==p.userId || pay.currency!=='XTR' || !(Number.isSafeInteger(pay.total_amount)&&pay.total_amount>0) ||
      !/^[A-Za-z0-9_-]{1,250}$/.test(String(pay.telegram_payment_charge_id||''))) {
      throw Error('Invalid successful_payment payload');
    }
    let order = await saveOrder(pay.telegram_payment_charge_id,p.userId,message.chat.id,p.id,pay.total_amount);
    if (order.status==='delivered') return;
    try {
      await deliverOrder(order);
      if (site.tgChatId) await send(site.tgChatId,'💰 Оплачен набор: '+PACK_BY_ID.get(p.id).title+'\n'+pay.total_amount+' ⭐\nПокупатель ID: '+p.userId+'\nСтатус: ZIP отправлен.');
    } catch (error) {
      console.error('Preset delivery failed:',error.message);
      await updateOrder(order.telegram_payment_charge_id,{status:'delivery_failed'}).catch(()=>{});
      await send(message.chat.id,'✅ Платёж получен, но автоматическая выдача задерживается. Ваш заказ сохранён; напишите /myorders для повторной выдачи.').catch(()=>{});
      if (site.tgChatId) await send(site.tgChatId,'⚠️ Ошибка выдачи пресета '+p.id+'\nCharge: '+pay.telegram_payment_charge_id+'\nUser: '+p.userId+'\nДля повторной отправки: /deliver '+pay.telegram_payment_charge_id).catch(()=>{});
    }
  }
  async function myOrders(chatId,userId) {
    if (!supabase.url||!supabase.adminKey) return send(chatId,'История заказов временно недоступна.');
    const rows=await supabaseRequest('preset_sales_orders?telegram_user_id=eq.'+encodeURIComponent(userId)+'&select=telegram_payment_charge_id,pack_id,status,telegram_file_id,chat_id&order=created_at.desc&limit=20',{},true);
    if (!rows?.length) return send(chatId,'Пока нет оплаченных наборов. Выбери набор командой /packs.');
    const buttons=rows.map((r,i)=>[{text:(PACK_BY_ID.get(r.pack_id)?.title||r.pack_id)+' · '+(r.status==='delivered'?'✅':'⏳'),callback_data:'presets:again:'+i}]);
    // Short-lived per-user list is intentionally not used: callback's index may get stale.
    const result=rows.map(r=>(PACK_BY_ID.get(r.pack_id)?.title||r.pack_id)+': '+(r.status==='delivered'?'выдан ✅':'ожидает выдачи ⚠️')).join('\n');
    await send(chatId,'Твои заказы:\n\n'+result+'\n\nДля повторной выдачи напиши /get <название категории>, например /get shakes.');
  }
  async function redeliver(chatId,userId,id) {
    if (!PACK_BY_ID.has(id)) return send(chatId,'Неизвестный набор. Пример: /get shakes');
    const rows=await supabaseRequest('preset_sales_orders?telegram_user_id=eq.'+encodeURIComponent(userId)+'&pack_id=eq.'+encodeURIComponent(id)+'&select=*&order=created_at.desc&limit=1',{},true);
    if (!rows?.length) return send(chatId,'Оплаченный заказ на этот набор не найден.');
    const order=rows[0];
    if(order.telegram_file_id){
      await telegramApi('sendDocument',{chat_id:chatId,document:order.telegram_file_id,caption:'Твой набор '+PACK_BY_ID.get(id).title});
      return;
    }
    try {
      await deliverOrder({...order,chat_id:chatId});
    } catch(error) {
      if(site.tgChatId) await send(site.tgChatId,'⚠️ Не удалась повторная выдача заказа '+order.telegram_payment_charge_id+'\n'+error.message).catch(()=>{});
      await send(chatId,'Повторная выдача временно недоступна. Напиши /paysupport.');
    }
  }
  async function support(message,details) {
    if (details && site.tgChatId){
      await send(site.tgChatId,'🆘 Поддержка по оплате от '+message.from.id+'\n'+tgEscape(details));
      return send(message.chat.id,'Сообщение о проблеме передано администратору.');
    }
    return send(message.chat.id,'По вопросам оплаты и выдачи: /paysupport <описание проблемы>. Не присылай данные карты.');
  }
  async function handle(update,isAdmin) {
    const chatId=update.message?.chat?.id??update.callback_query?.message?.chat?.id;
    if(update.pre_checkout_query){await onPrecheckout(update.pre_checkout_query);return true;}
    if(update.message?.successful_payment){await onPayment(update.message);return true;}
    const msg=update.message;
    if(msg?.chat?.type==='private' && typeof msg.text==='string') {
      const raw=msg.text.trim(),base=raw.split(/\s+/)[0].split('@')[0].toLowerCase(),arg=raw.slice(raw.indexOf(' ')+1).trim();
      if(base==='/start' && (!isAdmin || /^pack_[a-z]+$/.test(arg))) {
        if(/^pack_[a-z]+$/.test(arg)) return showPack(msg.chat.id,arg.slice(5)).then(()=>true);
        await send(msg.chat.id,'Привет! Это магазин авторских пресетов Null-Object-AE. Выбирай набор для After Effects:',packButtons());
        return true;
      }
      if(base==='/packs'){await send(msg.chat.id,'Выбирай набор:',packButtons());return true;}
      if(base==='/get'){await redeliver(msg.chat.id,msg.from.id,arg.toLowerCase());return true;}
      if(base==='/myorders'){await myOrders(msg.chat.id,msg.from.id);return true;}
      if(base==='/paysupport'){await support(msg,arg.replace(/^\/paysupport\s*/i,''));return true;}
    }
    if(isAdmin && msg?.text?.startsWith('/deliver ')){
      const charge=msg.text.split(/\s+/)[1]||'';
      if(!/^[A-Za-z0-9_-]{1,250}$/.test(charge)){await send(msg.chat.id,'Неверный ID платежа.');return true;}
      const rows=await supabaseRequest('preset_sales_orders?telegram_payment_charge_id=eq.'+encodeURIComponent(charge)+'&select=*',{},true);
      if(!rows?.length){await send(msg.chat.id,'Заказ не найден.');return true;}
      try {
        await deliverOrder(rows[0]);
        await send(msg.chat.id,'✅ Повторная выдача выполнена.');
      } catch(e) {await send(msg.chat.id,'Ошибка повторной выдачи: '+tgEscape(e.message));}
      return true;
    }
    const cb=update.callback_query;
    if(cb && cb.message?.chat?.type==='private' && typeof cb.data==='string' && cb.data.startsWith('presets:')){
      if(String(cb.from.id)!==String(cb.message.chat.id)){await telegramApi('answerCallbackQuery',{callback_query_id:cb.id,text:'Открой бота в личных сообщениях',show_alert:true});return true;}
      const [,action,id]=cb.data.split(':');
      await telegramApi('answerCallbackQuery',{callback_query_id:cb.id});
      if(action==='list') await send(cb.message.chat.id,'Выбирай набор:',packButtons());
      else if(action==='view') await showPack(cb.message.chat.id,id);
      else if(action==='buy') await invoice(cb.message.chat.id,cb.from.id,id);
      return true;
    }
    return false;
  }
  async function username() {
    const env=String(process.env.TELEGRAM_BOT_USERNAME||'').trim().replace(/^@/,'');
    if(/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(env)) return env;
    if(usernameCache) return usernameCache;
    if(!site.tgBotToken) throw Error('TELEGRAM_BOT_TOKEN missing');
    const bot=await telegramApi('getMe',{});
    if(!bot?.is_bot||!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(bot.username||'')) throw Error('Invalid Telegram bot username');
    usernameCache=bot.username;
    return usernameCache;
  }
  async function deepLink(id) {
    if (!PACK_BY_ID.has(id)) return null;
    return 'https://t.me/'+(await username())+'?start=pack_'+id;
  }
  return {handle,deepLink,PACKS};
}
module.exports={createPresetSales,PACKS};

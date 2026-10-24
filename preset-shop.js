'use strict';
const crypto = require('node:crypto');
const {PACKS, PRICE_STARS, BOT_URL, telegramLink} = require('./preset-products');
const packs = new Map(PACKS.map(p=>[p.id,p]));
const menu = {inline_keyboard:[
  [{text:'🎬 Выбрать набор',callback_data:'presets:list'}],
  [{text:'📦 Мои покупки',callback_data:'presets:orders'}],
  [{text:'Помощь с покупкой',callback_data:'presets:help'}]
]};
const terms = 'Набор стоит '+PRICE_STARS+' ⭐ Telegram Stars. После подтверждения платежа бот отправит ZIP с файлами .ffx для After Effects. Некоторым пресетам нужны дополнительные плагины; состав указан на сайте. Повторная выдача доступна в «Мои покупки». По вопросам оплаты, выдачи и возврата: /paysupport <описание>. Поддержку по этому заказу оказывает магазин, а не Telegram.';
function createPresetSales({telegramApi, site, supabase, supabaseRequest}) {
  const flights = new Map();
  const clearedKeyboards = new Set();
  const configured = () => Boolean(site.tgBotToken && supabase.url && supabase.adminKey);
  const query = (path,options={}) => supabaseRequest(path,{signal:AbortSignal.timeout(3000),...options},true);
  const send = (chat_id,text,reply_markup=menu) => telegramApi('sendMessage',{chat_id,text,reply_markup,disable_web_page_preview:true});
  const json = (body,prefer='return=representation') => ({method:'POST',headers:{'Content-Type':'application/json',Prefer:prefer},body:JSON.stringify(body)});
  const patch = body => ({...json(body),method:'PATCH'});
  function rememberKeyboard(chatId) {
    if(clearedKeyboards.size>=5000)clearedKeyboards.clear();
    clearedKeyboards.add(String(chatId));
  }
  async function clearKeyboard(chatId) {
    if(clearedKeyboards.has(String(chatId)))return;
    await send(chatId,'Магазин пресетов · старое меню убрано.',{remove_keyboard:true});
    rememberKeyboard(chatId);
  }
  const chargePath = charge => 'preset_sales_orders?telegram_payment_charge_id=eq.'+encodeURIComponent(charge);
  async function list(chatId) {
    return send(chatId,'9 наборов авторских пресетов для After Effects. Каждый — '+PRICE_STARS+' ⭐. Выбери нужный:',{
      inline_keyboard:[...PACKS.map(p=>[{text:p.title+' · '+p.count+' шт. · '+PRICE_STARS+' ⭐',callback_data:'presets:view:'+p.id}]),...menu.inline_keyboard.slice(1)]
    });
  }
  async function showPack(chatId,id) {
    const p=packs.get(id);if(!p)return list(chatId);
    return send(chatId,p.title+'\n'+p.count+' файлов .ffx · '+PRICE_STARS+' ⭐\n\nПосле оплаты пришлю ZIP. Для некоторых эффектов нужны плагины.',{inline_keyboard:[
      [{text:'Купить за '+PRICE_STARS+' ⭐',callback_data:'presets:buy:'+id}],
      [{text:'Посмотреть состав',url:(site.url||'https://null-object-ae.onrender.com')+'/presets#pack-'+id}],
      [{text:'← Все наборы',callback_data:'presets:list'}]
    ]});
  }
  const privateUrl = pack => supabase.url+'/storage/v1/object/paid-presets/'+pack.zip;
  const privateHeaders = () => ({apikey:supabase.adminKey,Authorization:'Bearer '+supabase.adminKey});
  async function fileReady(pack) {
    if(!pack)return false;
    const response=await fetch(privateUrl(pack),{headers:{...privateHeaders(),Range:'bytes=0-0'},signal:AbortSignal.timeout(3000)});
    if(response.body)await response.body.cancel().catch(()=>{});
    return response.ok;
  }
  async function invoice(chatId,userId,id) {
    const p=packs.get(id);if(!p)return list(chatId);
    if(!configured())return send(chatId,'Магазин готовится к открытию. Оплата пока недоступна.');
    if(!await fileReady(p))return send(chatId,'Этот набор ещё загружается в магазин. Оплата появится, когда архив будет готов.');
    const payload='pack:'+id+':'+userId+':'+crypto.randomBytes(12).toString('hex');
    await query('preset_sales_invoices',json({payload,pack_id:id,telegram_user_id:userId,chat_id:chatId,amount_stars:PRICE_STARS,terms_version:'stars-v1',expires_at:new Date(Date.now()+3600000).toISOString()},'return=minimal'));
    return telegramApi('sendInvoice',{chat_id:chatId,title:p.title.slice(0,32),description:p.count+' пресетов .ffx для After Effects. ZIP после оплаты.',payload,provider_token:'',currency:'XTR',prices:[{label:p.title,amount:PRICE_STARS}],start_parameter:'pack_'+id});
  }
  async function invoiceFor(payload) {
    if(!/^pack:[a-z]+:\d{1,20}:[a-f0-9]{24}$/.test(String(payload||'')))return null;
    const rows=await query('preset_sales_invoices?payload=eq.'+encodeURIComponent(payload)+'&select=*');
    return rows?.length===1?rows[0]:null;
  }
  async function precheckout(q) {
    let ok=false;
    try {
      if(configured()&&q.currency==='XTR'){
        const invoice=await invoiceFor(q.invoice_payload);
        if(invoice&&String(invoice.telegram_user_id)===String(q.from.id)&&invoice.amount_stars===q.total_amount&&Date.parse(invoice.expires_at)>Date.now()){
          const [ready,orders]=await Promise.all([fileReady(packs.get(invoice.pack_id)),query('preset_sales_orders?invoice_payload=eq.'+encodeURIComponent(invoice.payload)+'&select=telegram_payment_charge_id')]);
          ok=ready&&orders.length===0;
        }
      }
    }catch(_){ok=false;}
    return telegramApi('answerPreCheckoutQuery',{pre_checkout_query_id:q.id,ok,...(ok?{}:{error_message:'Оплата недоступна или счёт устарел. Открой набор и создай новый счёт.'})});
  }
  async function sendArchive(chatId,pack,fileId) {
    if(fileId){await telegramApi('sendDocument',{chat_id:chatId,document:fileId,caption:'Твой набор «'+pack.title+'»'});return fileId;}
    const response=await fetch(privateUrl(pack),{headers:privateHeaders(),signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('Private ZIP unavailable');
    const bytes=Buffer.from(await response.arrayBuffer());
    if(!bytes.length||bytes.length>45*1024*1024)throw Error('ZIP size unsupported');
    const form=new FormData();form.append('chat_id',String(chatId));form.append('caption','Твой набор «'+pack.title+'». Спасибо за покупку!');form.append('document',new Blob([bytes],{type:'application/zip'}),pack.zip);
    const result=await fetch('https://api.telegram.org/bot'+site.tgBotToken+'/sendDocument',{method:'POST',body:form,signal:AbortSignal.timeout(30000)});
    const data=await result.json();if(!result.ok||!data.ok||!data.result?.document?.file_id)throw Error('Telegram ZIP delivery failed');
    return data.result.document.file_id;
  }
  async function deliver(order,again=false) {
    const charge=order.telegram_payment_charge_id;
    if(flights.has(charge))return flights.get(charge);
    const work=(async()=>{
      if(order.status==='refunded')return;
      if(order.status==='delivered'){
        if(again)await sendArchive(order.chat_id,packs.get(order.pack_id),order.telegram_file_id);
        return;
      }
      const stale=encodeURIComponent(new Date(Date.now()-300000).toISOString());
      const rows=await query(chargePath(charge)+'&or=(status.in.(paid,delivery_failed),and(status.eq.delivering,updated_at.lt.'+stale+'))',patch({status:'delivering',updated_at:new Date().toISOString()}));
      if(!rows?.length){if(again)await send(order.chat_id,'Архив уже отправляется. Если он не появится, повтори запрос через несколько минут.');return;}
      try{
        const fileId=await sendArchive(order.chat_id,packs.get(order.pack_id));
        await query(chargePath(charge)+'&status=eq.delivering',patch({status:'delivered',telegram_file_id:fileId,delivered_at:new Date().toISOString(),updated_at:new Date().toISOString()}));
      }catch(error){
        await query(chargePath(charge)+'&status=eq.delivering',patch({status:'delivery_failed',updated_at:new Date().toISOString()})).catch(()=>{});
        await send(order.chat_id,'Платёж сохранён, но выдача задержалась. Нажми «Мои покупки» для повторной отправки или напиши /paysupport.').catch(()=>{});
        throw error;
      }
    })();
    flights.set(charge,work);try{return await work;}finally{flights.delete(charge);}
  }
  async function payment(message) {
    const pay=message.successful_payment;
    const invoice=await invoiceFor(pay.invoice_payload);
    if(!invoice||String(message.from?.id)!==String(invoice.telegram_user_id)||String(message.chat.id)!==String(invoice.chat_id)||pay.currency!=='XTR'||pay.total_amount!==invoice.amount_stars||!pay.telegram_payment_charge_id)throw Error('Payment does not match issued invoice');
    await query('preset_sales_orders?on_conflict=telegram_payment_charge_id',json({telegram_payment_charge_id:pay.telegram_payment_charge_id,invoice_payload:invoice.payload,telegram_user_id:invoice.telegram_user_id,chat_id:invoice.chat_id,pack_id:invoice.pack_id,amount_stars:invoice.amount_stars,status:'paid'},'resolution=ignore-duplicates,return=minimal'));
    const rows=await query(chargePath(pay.telegram_payment_charge_id)+'&select=*');const order=rows?.[0];
    if(!order||order.invoice_payload!==invoice.payload||String(order.telegram_user_id)!==String(invoice.telegram_user_id)||order.amount_stars!==pay.total_amount)throw Error('Payment collision');
    await deliver(order);
  }
  async function orders(chatId,userId,id) {
    if(!configured())return send(chatId,'История покупок пока недоступна.');
    const rows=await query('preset_sales_orders?telegram_user_id=eq.'+encodeURIComponent(userId)+'&status=neq.refunded&order=created_at.desc&limit=100&select=*');
    if(id){
      const order=rows?.find(r=>r.pack_id===id);
      if(!order)return send(chatId,'Оплаченный набор не найден.');
      if(String(chatId)!==String(order.chat_id))throw Error('Order chat mismatch');
      await deliver(order,true);return;
    }
    if(!rows?.length)return send(chatId,'Здесь появятся твои оплаченные наборы. Сейчас покупок нет.');
    const owned=[...new Set(rows.map(r=>r.pack_id))];
    return send(chatId,'Твои покупки. Нажми на набор, чтобы получить архив ещё раз:',{inline_keyboard:[...owned.filter(id=>packs.has(id)).map(id=>[{text:'📦 '+packs.get(id).title,callback_data:'presets:get:'+id}]),[{text:'← Магазин',callback_data:'presets:list'}]]});
  }
  async function help(chatId){return send(chatId,'1. Выбери набор.\n2. Ознакомься с условиями и оплати '+PRICE_STARS+' ⭐.\n3. Получи ZIP и распакуй его.\n4. В After Effects: Animation → Apply Animation Preset, выбери .ffx.\n\nПовторная выдача — «Мои покупки». Проблемы с оплатой — /paysupport <описание>.');}
  async function support(message,details) {
    if(details&&site.tgChatId){
      await send(site.tgChatId,'Поддержка магазина\nПокупатель: '+message.from.id+'\n'+details.slice(0,2000),{inline_keyboard:[[{text:'Открыть профиль',url:'tg://user?id='+message.from.id}]]});
      return send(message.chat.id,'Обращение передано владельцу магазина.');
    }
    return send(message.chat.id,'Опиши проблему командой /paysupport <описание>. Контакты магазина: '+(site.url||'https://null-object-ae.onrender.com')+'/contact. Данные карты присылать не нужно.');
  }
  async function handle(update) {
    if(update.pre_checkout_query){await precheckout(update.pre_checkout_query);return true;}
    const msg=update.message;
    if(msg?.successful_payment){await payment(msg);return true;}
    if(msg?.refunded_payment){await query(chargePath(msg.refunded_payment.telegram_payment_charge_id),patch({status:'refunded',updated_at:new Date().toISOString()}));return true;}
    if(msg?.chat?.type==='private'&&typeof msg.text==='string'){
      const [command,...args]=msg.text.trim().split(/\s+/);const base=command.toLowerCase().split('@')[0];const arg=args.join(' ');
      if(base==='/start'){
        await send(msg.chat.id,'NULL—OBJECT / PRESET STORE\nАвторские пресеты для After Effects. 9 наборов по '+PRICE_STARS+' ⭐.',{remove_keyboard:true});
        rememberKeyboard(msg.chat.id);
        if(/^pack_[a-z]+$/.test(arg))await showPack(msg.chat.id,arg.slice(5));else await list(msg.chat.id);return true;
      }
      if(['/packs','/shop','/presets'].includes(base)){await list(msg.chat.id);return true;}
      if(base==='/myorders'){await orders(msg.chat.id,msg.from.id);return true;}
      if(base==='/get'){await orders(msg.chat.id,msg.from.id,arg.toLowerCase());return true;}
      if(base==='/terms'){await send(msg.chat.id,terms);return true;}
      if(base==='/paysupport'||base==='/support'){await support(msg,arg);return true;}
      if(base==='/help'){await help(msg.chat.id);return true;}
      await send(msg.chat.id,'Старые команды больше не используются. Здесь теперь магазин пресетов.',{remove_keyboard:true});await list(msg.chat.id);return true;
    }
    const cb=update.callback_query;
    if(cb&&cb.message?.chat?.type==='private'){
      if(String(cb.from.id)!==String(cb.message.chat.id)){await telegramApi('answerCallbackQuery',{callback_query_id:cb.id,text:'Открой личный чат с ботом'});return true;}
      await telegramApi('answerCallbackQuery',{callback_query_id:cb.id});
      const [prefix,action,id]=String(cb.data||'').split(':');const chatId=cb.message.chat.id;
      if(prefix!=='presets'){
        if(cb.message.message_id)await telegramApi('editMessageReplyMarkup',{chat_id:chatId,message_id:cb.message.message_id,reply_markup:{inline_keyboard:[]}}).catch(()=>{});
        await list(chatId);return true;
      }
      if(action==='list')await list(chatId);
      else if(action==='view')await showPack(chatId,id);
      else if(action==='buy'&&packs.has(id))await send(chatId,terms,{inline_keyboard:[[{text:'Принимаю условия · оплатить '+PRICE_STARS+' ⭐',callback_data:'presets:accept:'+id}],[{text:'← Назад',callback_data:'presets:view:'+id}]]});
      else if(action==='accept')await invoice(chatId,cb.from.id,id);
      else if(action==='orders')await orders(chatId,cb.from.id);
      else if(action==='get'&&packs.has(id))await orders(chatId,cb.from.id,id);
      else if(action==='help')await help(chatId);
      return true;
    }
    return false;
  }
  async function safeHandle(update) {
    try {
      const chat=update.message?.chat||update.callback_query?.message?.chat;
      const financial=update.pre_checkout_query||update.message?.successful_payment||update.message?.refunded_payment;
      const start=/^\/start(?:@\w+)?(?:\s|$)/i.test(update.message?.text||'');
      if(chat?.type==='private'&&!financial&&!start)await clearKeyboard(chat.id);
      return await handle(update);
    } catch(error) {
      // Payments must remain retryable: a failed persistence/delivery gets HTTP 500.
      if(update.pre_checkout_query||update.message?.successful_payment||update.message?.refunded_payment)throw error;
      const chat=update.message?.chat||update.callback_query?.message?.chat;
      if(chat?.type!=='private')throw error;
      await send(chat.id,'Этот раздел пока недоступен. Попробуй позже или открой /paysupport.');
      return true;
    }
  }
  return {handle:safeHandle,PACKS,deepLink:id=>telegramLink(BOT_URL,id)};
}
module.exports={createPresetSales,PACKS};

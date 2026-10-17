'use strict';
const PACKS=[
 ['shakes','Шейки и движения'],['color','Цветокоррекция'],['distortion','Искажения'],
 ['glow','Свечение и свет'],['text','Текстовые эффекты'],['frames','1 Frame эффекты'],
 ['speed','Скорость и замедление'],['glitch','Glitch и CRT'],['effects','Другие эффекты']
];
const labels=Object.fromEntries(PACKS);
const kb=(rows)=>({inline_keyboard:rows});
function telegramLink(raw,id){
 const m=String(raw||'').match(/^https:\/\/t\.me\/([a-zA-Z][a-zA-Z0-9_]{4,31})(?:\/|$)/);
 return m?'https://t.me/'+m[1]+'?start=pack_'+id:null;
}
function store({telegram,send,adminChat,api}){
 const pending=new Map();
 const productMenu=kb(PACKS.map(([id,title])=>[{text:title+' — 149 ₽',callback_data:'store:choose:'+id}]));
 async function say(chat_id,text,reply_markup){return api('sendMessage',{chat_id,text,reply_markup});}
 async function sendOrder(chatId,userId,id){
   if(!labels[id])return say(chatId,'Такого набора нет.');
   if(!adminChat)return say(chatId,'Заказы временно недоступны: администратор не настроил выдачу.');
   const token=String(userId)+'_'+id;
   pending.set(token,{chatId,userId,id});
   await say(chatId,'Вы выбрали: '+labels[id]+' (149 ₽).\n\nОплата согласовывается с магазином вне бота. После подтверждения администратор отправит ZIP сюда. Не переводите деньги без инструкций от магазина.');
   await say(adminChat,'🛒 Заказ набора\nПак: '+labels[id]+'\nКлиент Telegram ID: '+userId+'\nЦена: 149 ₽\nНомер: '+token+'\n\nПодтверждай только после проверки оплаты.',kb([[{text:'✅ Выдать ZIP',callback_data:'store:approve:'+token},{text:'❌ Отказать',callback_data:'store:reject:'+token}]]));
 }
 async function handle(update){
   if(update.message?.document && String(update.message.chat.id)===String(adminChat) && String(update.message.from.id)===String(adminChat)){
     const doc=update.message.document;
     await say(update.message.chat.id,'📦 Загружен документ: '+doc.file_name+'\\nTelegram file_id:\\n'+doc.file_id+'\\n\\nСохрани file_id в защищённой переменной PRESET_FILE_ID_КАТЕГОРИЯ на Render.');
     return true;
   }
   if(update.message?.chat?.type==='private'){
     const msg=update.message,raw=String(msg.text||'').trim();
     if(raw==='/presets'||raw==='/shop'||raw==='/start') {await say(msg.chat.id,'Магазин авторских пресетов After Effects. 9 наборов по 149 ₽. Выберите набор:',productMenu);return true}
     const match=raw.match(/^\/start\s+pack_(shakes|color|distortion|glow|text|frames|speed|glitch|effects)$/);
     if(match){await sendOrder(msg.chat.id,msg.from.id,match[1]);return true}
     if(raw==='/paysupport'||raw==='/support'){await say(msg.chat.id,'По вопросам заказов напишите в поддержку магазина через контакты на сайте.');return true}
   }
   const cb=update.callback_query;
   if(!cb||typeof cb.data!=='string'||!cb.data.startsWith('store:'))return false;
   const [_,action,...parts]=cb.data.split(':');
   const id=parts.join(':');
   const userId=cb.from.id,chatId=cb.message?.chat?.id;
   async function acknowledge(text){await api('answerCallbackQuery',{callback_query_id:cb.id,text});}
   if(action==='choose'&&labels[id]){await acknowledge('Оформляем');await sendOrder(chatId,userId,id);return true}
   if(action==='approve'||action==='reject'){
     if(String(chatId)!==String(adminChat)||String(userId)!==String(adminChat)){await acknowledge('Нет прав');return true}
     const order=pending.get(id);
     if(!order){await acknowledge('Заказ не найден или сервер перезапущен');return true}
     if(action==='reject'){pending.delete(id);await say(order.chatId,'Заказ '+labels[order.id]+' отклонён. Напишите в поддержку магазина.');await acknowledge('Отклонено');return true}
     await acknowledge('Проверяю выдачу');
     // File IDs are private Telegram file_id values obtained by the admin uploading ZIP to this bot.
     const fileId=String(process.env['PRESET_FILE_ID_'+order.id.toUpperCase()]||'');
     if(!fileId){await say(adminChat,'Для '+labels[order.id]+' не задан PRESET_FILE_ID_'+order.id.toUpperCase()+'. Файл не выдан.');return true}
     try {
       await api('sendDocument',{chat_id:order.chatId,document:fileId,caption:'Ваш набор «'+labels[order.id]+'». Спасибо за покупку!'});
       pending.delete(id);await say(adminChat,'✅ ZIP выдан покупателю '+order.userId+' ('+labels[order.id]+')');
     }catch(e){await say(adminChat,'Ошибка выдачи: '+String(e.message||e));}
     return true;
   }
   await acknowledge('Команда не найдена');return true;
 }
 return {handle,telegramLink,PACKS};
}
module.exports={store,telegramLink,PACKS};

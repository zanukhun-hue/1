'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {createPresetSales}=require('../preset-shop');
const {PACKS,PRICE_STARS}=require('../preset-products');
const root=path.resolve(__dirname,'..');
(async()=>{
  const db=new PGlite();const realFetch=global.fetch;const calls=[];
  let archiveReady=true,deliveryFails=false,uploads=0;
  try{
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public boolean);');
    const schema=fs.readFileSync(path.join(root,'preset-sales-schema.sql'),'utf8');
    await db.exec(schema);await db.exec(schema);
    for(const role of ['anon','authenticated']){
      await db.exec('set role '+role);
      for(const table of ['preset_sales_invoices','preset_sales_orders']){
        await assert.rejects(db.query('select * from '+table),e=>e.code==='42501');
        await assert.rejects(db.query('delete from '+table),e=>e.code==='42501');
      }
      await db.exec('reset role');
    }
    assert.equal((await db.query("select public from storage.buckets where id='paid-presets'")).rows[0].public,false);
    await db.exec('set role service_role');
    const request=async(raw,options={},admin)=>{
      assert.equal(admin,true);const u=new URL(raw,'https://db.test/');const table=u.pathname.slice(1);
      assert.ok(['preset_sales_invoices','preset_sales_orders'].includes(table));
      let values=[],clauses=[];
      for(const key of ['payload','invoice_payload','telegram_payment_charge_id','telegram_user_id','status']){
        if(!u.searchParams.has(key))continue;
        const [operator,...rest]=u.searchParams.get(key).split('.');values.push(rest.join('.'));
        clauses.push(key+(operator==='neq'?' <> ':' = ')+'$'+values.length);
      }
      if(u.searchParams.has('or')){
        const match=u.searchParams.get('or').match(/updated_at\.lt\.(.*?)\)\)$/);assert.ok(match);
        values.push(match[1]);clauses.push("(status in ('paid','delivery_failed') or (status='delivering' and updated_at < $"+values.length+'))');
      }
      const where=clauses.length?' where '+clauses.join(' and '):'';
      if(options.method==='POST'){
        const body=JSON.parse(options.body),keys=Object.keys(body);assert.ok(keys.every(k=>/^[a-z_]+$/.test(k)));
        const sql='insert into '+table+' ('+keys.join(',')+') values ('+keys.map((_,i)=>'$'+(i+1)).join(',')+')'+(u.searchParams.has('on_conflict')?' on conflict (telegram_payment_charge_id) do nothing':'')+' returning *';
        return (await db.query(sql,Object.values(body))).rows;
      }
      if(options.method==='PATCH'){
        const body=JSON.parse(options.body);const sets=Object.keys(body).map(k=>{values.push(body[k]);return k+'=$'+values.length;});
        return (await db.query('update '+table+' set '+sets.join(',')+where+' returning *',values)).rows;
      }
      return (await db.query('select * from '+table+where+' order by created_at desc',values)).rows;
    };
    global.fetch=async(url,options={})=>{
      if(url.startsWith('https://db.test/storage/')){
        assert.equal(options.headers.apikey,'test-key');
        if(!archiveReady)return new Response('missing',{status:404});
        return new Response(Buffer.from('PK-test-archive'),{status:200});
      }
      assert.equal(url,'https://api.telegram.org/bottest-token/sendDocument');
      assert.ok(options.body instanceof FormData);assert.ok(options.body.get('document').name.endsWith('.zip'));
      uploads++;
      return new Response(JSON.stringify(deliveryFails?{ok:false}:{ok:true,result:{document:{file_id:'paid-zip-file'}}}),{status:deliveryFails?500:200,headers:{'Content-Type':'application/json'}});
    };
    const api=async(method,data)=>{calls.push({method,data});return {message_id:calls.length,document:{file_id:'paid-zip-file'}};};
    const makeShop=()=>createPresetSales({telegramApi:api,site:{tgBotToken:'test-token',tgChatId:'999',url:'https://site.test'},supabase:{url:'https://db.test',adminKey:'test-key'},supabaseRequest:request});
    let shop=makeShop();
    const message=(text,user=123)=>({message:{text,chat:{id:user,type:'private'},from:{id:user}}});
    const callback=(data,user=123)=>({callback_query:{id:'callback',from:{id:user},message:{message_id:42,chat:{id:user,type:'private'}},data}});
    await shop.handle(message('/start'));
    assert.equal(calls[0].data.reply_markup.remove_keyboard,true);
    assert.equal(calls[1].data.reply_markup.inline_keyboard.filter(r=>r[0].callback_data.startsWith('presets:view:')).length,9);
    await shop.handle(message('/stats'));
    assert.ok(calls.some(c=>c.data.text?.includes('Старые команды')));
    await shop.handle(callback('store:approve:old'));
    assert.deepEqual(calls.find(c=>c.method==='editMessageReplyMarkup').data,{chat_id:123,message_id:42,reply_markup:{inline_keyboard:[]}});
    await shop.handle(message('/packs',789));
    assert.ok(calls.some(c=>c.data.chat_id===789&&c.data.reply_markup?.remove_keyboard),'First contact removes the old reply keyboard even without /start');
    assert.equal(uploads,0);
    await shop.handle(callback('presets:buy:shakes'));
    assert.equal(calls.filter(c=>c.method==='sendInvoice').length,0,'Terms precede invoices');
    archiveReady=false;await shop.handle(callback('presets:accept:shakes'));
    assert.equal(calls.filter(c=>c.method==='sendInvoice').length,0,'No charge for missing archive');
    archiveReady=true;await shop.handle(callback('presets:accept:shakes'));
    const bill=calls.find(c=>c.method==='sendInvoice').data;
    assert.equal(bill.currency,'XTR');assert.equal(bill.prices[0].amount,100);assert.equal(PRICE_STARS,100);
    const checkout=async(user,amount,payload=bill.payload)=>{
      await shop.handle({pre_checkout_query:{id:'checkout',from:{id:user},currency:'XTR',total_amount:amount,invoice_payload:payload}});
      return calls.filter(c=>c.method==='answerPreCheckoutQuery').at(-1).data.ok;
    };
    assert.equal(await checkout(123,100),true);assert.equal(await checkout(456,100),false);assert.equal(await checkout(123,1),false);assert.equal(await checkout(123,100,'forged'),false);assert.equal(uploads,0);
    const payment=(charge,payload=bill.payload,amount=100)=>({message:{chat:{id:123,type:'private'},from:{id:123},successful_payment:{invoice_payload:payload,currency:'XTR',total_amount:amount,telegram_payment_charge_id:charge}}});
    await assert.rejects(shop.handle(payment('wrong-price',bill.payload,1)));
    await Promise.all([shop.handle(payment('charge-1')),shop.handle(payment('charge-1'))]);
    assert.equal(uploads,1,'Concurrent duplicate payment only delivers once');
    assert.equal((await db.query('select status from preset_sales_orders')).rows[0].status,'delivered');
    shop=makeShop();await shop.handle(payment('charge-1'));assert.equal(uploads,1,'Restart preserves delivered state');
    const before=calls.filter(c=>c.method==='sendDocument').length;
    await shop.handle(callback('presets:get:shakes',456));assert.equal(calls.filter(c=>c.method==='sendDocument').length,before,'Other buyer cannot download');
    await shop.handle(callback('presets:get:shakes'));assert.equal(calls.filter(c=>c.method==='sendDocument').length,before+1,'Owner can redownload');
    await shop.handle({message:{refunded_payment:{telegram_payment_charge_id:'charge-1'}}});
    await shop.handle(callback('presets:get:shakes'));assert.equal(calls.filter(c=>c.method==='sendDocument').length,before+1,'Refunded order cannot redownload');
    await shop.handle(callback('presets:accept:color'));const second=calls.filter(c=>c.method==='sendInvoice').at(-1).data;
    deliveryFails=true;await assert.rejects(shop.handle(payment('charge-2',second.payload)));
    assert.equal((await db.query("select status from preset_sales_orders where telegram_payment_charge_id='charge-2'")).rows[0].status,'delivery_failed');
    deliveryFails=false;await shop.handle(callback('presets:get:color'));
    assert.equal((await db.query("select status from preset_sales_orders where telegram_payment_charge_id='charge-2'")).rows[0].status,'delivered');
    const rendered=require('../preset-library').render(require('../preset-library').read(root),{},root,s=>String(s),encodeURIComponent,'https://t.me/null_object_ae_bot');
    assert.ok(rendered.includes('100 ⭐'));assert.ok(!rendered.includes('149 ₽'));assert.ok(rendered.includes('null_object_ae_bot?start=pack_color'));
    assert.equal(PACKS.reduce((n,p)=>n+p.count,0),113);
    console.log('PASS: Stars invoices/terms, missing archives, buyer/price checks, duplicate payments, restart, ownership, refund access, retry, private SQL and website links');
  }finally{global.fetch=realFetch;await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {PACKS}=require('../preset-products');
(async()=>{
  const folder=process.argv[2];
  const base=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_ADMIN_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!folder||!base||!key)throw Error('Supply a private folder, SUPABASE_URL and server key via environment');
  const headers={apikey:key,Authorization:'Bearer '+key};
  for(const pack of PACKS){
    const data=await fs.readFile(path.join(folder,pack.zip));
    if(!data.length||data.length>45*1024*1024||data.readUInt16LE(0)!==0x4b50)throw Error('Invalid/oversize ZIP: '+pack.zip);
  }
  for(const pack of PACKS){
    const data=await fs.readFile(path.join(folder,pack.zip));
    const url=base+'/storage/v1/object/paid-presets/'+pack.zip;
    const response=await fetch(url,{method:'POST',headers:{...headers,'Content-Type':'application/zip','x-upsert':'true'},body:data,signal:AbortSignal.timeout(90000)});
    if(!response.ok)throw Error('Upload failed: '+pack.zip+' (HTTP '+response.status+'); run preset-sales-schema.sql first');
    const check=await fetch(url,{method:'HEAD',headers,signal:AbortSignal.timeout(10000)});
    if(!check.ok||Number(check.headers.get('content-length'))!==data.length)throw Error('Upload verification failed: '+pack.zip);
    console.log(pack.zip+': '+data.length+' bytes, verified');
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});

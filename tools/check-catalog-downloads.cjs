/* Integration checks: data identity, real routes, artwork and file destinations. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const base=process.env.CATALOG_TEST_URL||'http://localhost:4173';
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync('plugins.js','utf8'),sandbox);
const plugins=sandbox.window.AE_PLUGINS;
const images=JSON.parse(fs.readFileSync('plugin-images.json','utf8'));
const audit=JSON.parse(fs.readFileSync('assets/plugins-new/source-audit.json','utf8'));
const discovery=JSON.parse(fs.readFileSync('discovery.json','utf8'));
const byId=new Map(plugins.map(p=>[p.id,p]));
assert.equal(byId.size,plugins.length,'IDs must be unique');
assert.equal(new Set(plugins.map(p=>p.name.toLowerCase())).size,plugins.length,'Display names must be unique');
assert.equal(plugins.length,audit.totalCards);
assert.equal(plugins.filter(p=>p.updated==='24.10.2026'&&p.badge==='Новый').length,23,'23 new plugins plus one textures card');
for(const task of discovery.tasks)for(const id of task.plugins)assert.ok(byId.has(id),`Unknown task plugin: ${id}`);
assert.equal(byId.get('bokeh').name,'Fast Bokeh');
assert.equal(byId.get('maxon-looks-trapcode').name,'Magic Bullet Looks');
assert.ok(byId.has('crossphere-bokeh')&&byId.has('trapcode'));
// An unavailable old card must not rank as new because it says «Обновляется».
const sortContext={};
const sortSource=fs.readFileSync('client.js','utf8').match(/  function sortCards\([\s\S]*?(?=\r?\n  function filterCatalog)/)[0];
vm.runInNewContext(sortSource,sortContext);
const card=(name,badge,text)=>({dataset:{name,status:'available'},textContent:text,querySelector:()=>({textContent:badge})});
const old=card('A old','Эффект','Обновляется'),fresh=card('Z fresh','Новый','Новый');
assert.equal(sortContext.sortCards([old,fresh],'new')[0],fresh,'Only the badge determines new status');
const provider=url=>new URL(url).hostname==='t.me'?'telegram':'google-drive';
const direct=url=>{
  const u=new URL(url);
  if(u.hostname!=='drive.google.com')return url;
  const id=u.pathname.match(/^\/file\/d\/([^/]+)/)?.[1]||u.searchParams.get('id');
  const target=new URL('https://drive.google.com/uc');target.searchParams.set('export','download');target.searchParams.set('id',id);
  return target.href;
};
async function expectRedirect(path,target){
  const response=await fetch(base+path,{redirect:'manual'});
  assert.equal(response.status,302,path);
  assert.equal(response.headers.get('location'),target,path);
  assert.match(response.headers.get('cache-control'),/no-store/);
}
(async()=>{
  let checked=0;
  for(const plugin of plugins){
    if(plugin.status==='available'){
      await expectRedirect('/download/'+plugin.id,direct(plugin.downloadUrl));checked++;
      for(const v of plugin.versions||[]){const key=v.key||v.label.toLowerCase().replace(/[^a-z0-9]/g,'');await expectRedirect('/download/'+plugin.id+'?version='+key,direct(v.downloadUrl));checked++;}
    }
    if(plugin.updated==='24.10.2026'){
      const page=await fetch(base+'/plugin/'+plugin.id);const html=await page.text();
      assert.equal(page.status,200);assert.ok(html.includes(plugin.name),plugin.id);
      const data=JSON.parse(html.match(/<script id="workspaceData" type="application\/json">(.*?)<\/script>/s)[1]);
      const row=data.plugins.find(p=>p.id===plugin.id);assert.equal(row.downloadProvider,provider(plugin.downloadUrl));
      for(const v of plugin.versions||[]){assert.ok(html.includes(v.label));assert.ok(row.versions.length);}
      assert.ok(images[plugin.id]?.image,'Artwork missing: '+plugin.id);
      assert.ok(html.includes(images[plugin.id].image),'Rendered artwork missing: '+plugin.id);
      const art=await fetch(base+images[plugin.id].image,{method:'HEAD'});assert.equal(art.status,200,plugin.id);assert.match(art.headers.get('content-type'),/^image\//);
    }
  }
  await expectRedirect('/download/flow?version=v141',direct(byId.get('flow').versions.find(v=>v.label.includes('1.4.1')).downloadUrl));
  await expectRedirect('/download/flow?open=1',byId.get('flow').downloadUrl);
  const html=await (await fetch(base+'/plugins')).text();assert.equal((html.match(/data-plugin-card /g)||[]).length,plugins.length);
  const home=await (await fetch(base+'/')).text();assert.ok(home.includes(plugins.length+' инструментов.'));
  console.log(`PASS ${plugins.length} unique cards; ${checked+2} download/variant destinations; artwork, provider metadata, task IDs and page totals`);
})().catch(error=>{console.error(error);process.exitCode=1;});

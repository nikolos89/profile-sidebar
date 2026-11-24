import {readFile,writeFile,copyFile,mkdir,cp,stat} from 'node:fs/promises';
import {dirname,join,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';

const payload=dirname(fileURLToPath(import.meta.url));
const bundle=resolve(process.env.PROFILE_SIDEBAR_BUNDLE || join(process.env.LOCALAPPDATA||'','Programs/Antigravity/resources/web_bundle_ru'));
if(process.platform!=='win32')throw new Error('Profile Sidebar native integration currently supports Windows only.');
const pluginTarget=join(homedir(),'.gemini/config/plugins/profile-sidebar');
const installData=join(homedir(),'.gemini/antigravity/plugin_data/profile-sidebar');
const accountsPath=join(homedir(),'.gemini/config/plugins/account-switcher/sidecars/accounts/app.js');
const footerAnchor='"data-testid":"settings-button"}),l&&E.createElement(l)';
const footerReplacement='"data-testid":"settings-button"}),E.createElement(AGProfileSidebarBoundary,null,E.createElement(AGProfileSidebarSlot,null)),l&&E.createElement(l)';
const mainTag='<script src="/main.js"></script>';
const assetsTag="<link rel=\"stylesheet\" href=\"/profile-sidebar/profile-menu.css?v=1.1.3-beta.1\" />\n    <script src=\"/profile-sidebar/profile-quota.js?v=1.1.3-beta.1\"></script>\n    <script src=\"/profile-sidebar/profile-menu.js?v=1.1.3-beta.1\"></script>\n    "+mainTag;
const modelAnchor='return E.createElement("button",{ref:d,type:"button","data-testid":"model-selector-trigger",';
const modelEffect='E.useEffect(()=>{window.dispatchEvent(new Event("agp-model-change"));return()=>queueMicrotask(()=>window.dispatchEvent(new Event("agp-model-change")))},[f?.modelId,f?.label,f?.value,q,g?.isBestOfNEnabled]);';
const modelAttributes='"data-agp-model-label":f?.label??"","data-agp-model-id":f?.modelId??"","data-agp-model-multi":q||!!g?.isBestOfNEnabled,';
const accountMarker='/* AG_PROFILE_SIDEBAR_ACCOUNT_INTENT */';
const accountAddon=`\n${accountMarker}\nif (new URLSearchParams(location.search).get('accountAction') === 'add') {\n  $('addHelp').open = true;\n  requestAnimationFrame(() => $('addHelp').scrollIntoView({ block:'nearest' }));\n}\n`;
const sha=value=>createHash('sha256').update(value).digest('hex');
async function exists(path){try{await stat(path);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
function exactlyOnce(source,anchor,label){if(source.split(anchor).length!==2)throw new Error('Compatibility check failed: '+label);}
async function prepare(){
  if(!await exists(join(bundle,'main.js'))||!await exists(join(bundle,'index.html')))throw new Error('No active custom web bundle found. Profile Sidebar cannot install on a stock Antigravity App. See README compatibility requirements; no files were changed.');
  const [main,index,bridge]=await Promise.all([readFile(join(bundle,'main.js'),'utf8'),readFile(join(bundle,'index.html'),'utf8'),readFile(join(payload,'ui/native-bridge.js'),'utf8')]);
  const version=index.match(/"appVersion"\s*:\s*"([^"]+)"/)?.[1];
  if(version!=='2.34.0')throw new Error('This native hook was verified for Antigravity 2.34.0. Installed: '+(version||'unknown'));
  if(main.includes('AG_PROFILE_SIDEBAR_BRIDGE_START'))throw new Error('The native profile hook is already installed. Disable/re-enable the plugin in Customizations; restore before reinstalling.');
  exactlyOnce(main,'function Eld(){','sidebar footer component');
  exactlyOnce(main,footerAnchor,'settings footer slot');
  exactlyOnce(index,mainTag,'main script');
  exactlyOnce(main,modelAnchor,'selected model button');
  for(const dependency of ['function p6(){','function ABc(','KBc=','sB=a=>a.userStatus','function efc(){','retrieveUserQuotaSummary'])if(!main.includes(dependency))throw new Error('Native dependency is missing: '+dependency);
  const patchedMain=main.replace('function Eld(){',bridge+'\nfunction Eld(){').replace(footerAnchor,footerReplacement)
    .replace(modelAnchor,()=>modelEffect+modelAnchor+modelAttributes);
  const patchedIndex=index.replace(mainTag,assetsTag);
  const accounts=null; // Account Switcher 1.1 includes accountAction support itself.
  return {version,main,index,patchedMain,patchedIndex,accounts};
}
async function atomicText(path,text){const temporary=path+'.profile-sidebar.tmp';await writeFile(temporary,text,'utf8');const {rename}=await import('node:fs/promises');await rename(temporary,path);}
const command=process.argv[2]||'--help';
if(command==='--stage'){
  if(!process.argv[3]||!isAbsolute(process.argv[3]))throw new Error('Specify an absolute staging directory outside the plugin payload.');
  const destination=resolve(process.argv[3]);
  for(const protectedRoot of [payload,bundle,pluginTarget,installData]) {
    const normalized=resolve(protectedRoot).toLowerCase(), staged=destination.toLowerCase();
    if(staged===normalized||staged.startsWith(normalized+'\\'))throw new Error('The staging directory must be outside the plugin, installed bundle and backup directories.');
  }
  const prepared=await prepare();await mkdir(destination,{recursive:true});
  await writeFile(join(destination,'main.js'),prepared.patchedMain,'utf8');
  await writeFile(join(destination,'index.html'),prepared.patchedIndex,'utf8');
  if(prepared.accounts)await writeFile(join(destination,'accounts-app.js'),prepared.accounts.patched,'utf8');
  console.log(JSON.stringify({staged:destination,version:prepared.version,originalMainSha256:sha(prepared.main),patchedMainSha256:sha(prepared.patchedMain)}));
}else if(command==='--install'){
  const prepared=await prepare();
  const alreadyInTarget=resolve(payload)===resolve(pluginTarget);
  if(await exists(pluginTarget)&&!alreadyInTarget)throw new Error('The target plugin directory already exists; it was not overwritten.');
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const backup=join(installData,'backups',stamp);
  await mkdir(backup,{recursive:true});
  await writeFile(join(backup,'main.js'),prepared.main,'utf8');
  await writeFile(join(backup,'index.html'),prepared.index,'utf8');
  if(prepared.accounts)await writeFile(join(backup,'accounts-app.js'),prepared.accounts.original,'utf8');
  const info={schema:1,version:prepared.version,installedAt:new Date().toISOString(),bundle,backup,pluginTarget,accountsPath,
    originalMainSha256:sha(prepared.main),patchedMainSha256:sha(prepared.patchedMain),originalIndexSha256:sha(prepared.index),patchedIndexSha256:sha(prepared.patchedIndex),
    originalAccountsSha256:prepared.accounts?sha(prepared.accounts.original):null,patchedAccountsSha256:prepared.accounts?sha(prepared.accounts.patched):null};
  await mkdir(join(bundle,'profile-sidebar'),{recursive:true});
  for (const asset of ['profile-menu.js','profile-menu.css','profile-quota.js']) {
    await copyFile(join(payload,'ui',asset),join(bundle,'profile-sidebar',asset));
  }
  if(!alreadyInTarget)await cp(payload,pluginTarget,{recursive:true,errorOnExist:true,force:false});
  try{
    if(prepared.accounts)await atomicText(accountsPath,prepared.accounts.patched);
    await atomicText(join(bundle,'main.js'),prepared.patchedMain);
    await atomicText(join(bundle,'index.html'),prepared.patchedIndex);
    await writeFile(join(installData,'installation.json'),JSON.stringify(info,null,2),'utf8');
  }catch(error){
    await atomicText(join(bundle,'main.js'),prepared.main);
    await atomicText(join(bundle,'index.html'),prepared.index);
    if(prepared.accounts)await atomicText(accountsPath,prepared.accounts.original);
    throw error;
  }
  console.log(JSON.stringify({installed:pluginTarget,backup,version:prepared.version,accountsIntegration:!!prepared.accounts,backgroundProcessesAdded:0}));
}else if(command==='--restore'){
  const info=JSON.parse(await readFile(join(installData,'installation.json'),'utf8'));
  if(resolve(info.bundle)!==resolve(bundle)||resolve(info.pluginTarget)!==resolve(pluginTarget)||!resolve(info.backup).startsWith(resolve(join(installData,'backups'))+'\\'))throw new Error('Invalid installation paths; nothing was restored.');
  const currentMain=await readFile(join(bundle,'main.js'),'utf8'),currentIndex=await readFile(join(bundle,'index.html'),'utf8');
  if(sha(currentMain)!==info.patchedMainSha256||sha(currentIndex)!==info.patchedIndexSha256)throw new Error('The interface changed after installation. Automatic restore refused to overwrite newer changes.');
  await copyFile(join(info.backup,'main.js'),join(bundle,'main.js'));
  await copyFile(join(info.backup,'index.html'),join(bundle,'index.html'));
  if(info.patchedAccountsSha256&&await exists(accountsPath)){
    if(sha(await readFile(accountsPath,'utf8'))===info.patchedAccountsSha256)await copyFile(join(info.backup,'accounts-app.js'),accountsPath);
  }
  console.log(JSON.stringify({restored:true,pluginFilesKept:true,instruction:'Remove the Profile Sidebar plugin using Customizations if no longer needed; reload the app.'}));
}else{
  console.log('node install.mjs --stage ABSOLUTE_OUTPUT_DIRECTORY\nnode install.mjs --install\nnode install.mjs --restore\nNo Git, packages, services, watchers or background commands are used.');
}

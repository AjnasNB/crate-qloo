// Local composition verification only; never attaches to a user's browser.
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { launchChrome } from './tools/_cdp.mjs';
const browser=await launchChrome({args:['--allow-file-access-from-files','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
  const page=await browser.newPage({width:1920,height:1080,scale:1});
  await page.goto(pathToFileURL(fileURLToPath(new URL('index.html',import.meta.url))).href);
  const result=await page.eval('window.__ready.then(() => window.__filmReady)');
  fs.mkdirSync(new URL('qa/',import.meta.url),{recursive:true});
  fs.writeFileSync(new URL('qa/seek-check.json',import.meta.url),JSON.stringify(result,null,2));
  if(!result?.seek?.ok)throw new Error('Seek comparison failed');
  console.log(JSON.stringify(result));
}finally{await browser.close();}

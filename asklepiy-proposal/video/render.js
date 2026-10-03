const { chromium } = require('playwright');
(async()=>{
  const out=process.argv[2], FPS=30;
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p = await b.newPage({viewport:{width:1920,height:1080}});
  await p.goto('file:///home/user/steffany-bot/asklepiy-proposal/video/promo.html',{waitUntil:'load'});
  await p.evaluate(async()=>{for(let t=0;t<80;t+=2)window.renderAt(t);await document.fonts.ready;await new Promise(r=>setTimeout(r,800));});
  const D=await p.evaluate(()=>window.DURATION), N=Math.round(D*FPS); const t0=Date.now();
  for(let i=0;i<N;i++){
    await p.evaluate(t=>window.renderAt(t),i/FPS);
    await p.screenshot({path:`${out}/f${String(i).padStart(5,'0')}.jpg`,type:'jpeg',quality:92});
    if(i%150===0)console.log(i,'/',N,((Date.now()-t0)/1000).toFixed(0)+'s');
  }
  console.log('DONE',N);
  await b.close();
})();

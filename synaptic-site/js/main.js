(function(){
  var NS='http://www.w3.org/2000/svg';
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(name,attrs,parent){
    var n=document.createElementNS(NS,name);
    for(var k in attrs){n.setAttribute(k,attrs[k])}
    if(parent)parent.appendChild(n);
    return n;
  }
  function pill(g,x,y,label,fs,cls){
    var w=Math.round(label.length*fs*.62+fs*1.9),h=Math.round(fs*2.3);
    var gr=el('g',{'class':cls||''},g);
    el('rect',{x:x-w/2,y:y-h/2,width:w,height:h,rx:h/2,'class':'pill-bg'},gr);
    var t=el('text',{x:x,y:y+1,'class':'pill-t','font-size':fs},gr);
    t.textContent=label;
    return gr;
  }
  function polar(cx,cy,r,deg){var a=deg*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)]}

  /* Hero: systems orbit around the Synaptic core */
  var hero=document.getElementById('hero-vis');
  if(hero){
    var s=el('svg',{viewBox:'0 0 640 640','aria-hidden':'true'});
    var C=320;
    el('circle',{cx:C,cy:C,r:300,'class':'halo'},s);
    [250,170,100].forEach(function(r,i){el('circle',{cx:C,cy:C,r:r,'class':'ring',style:i==0?'stroke-dasharray:3 6':''},s)});
    var labels=['PMS','CRM','POS','OTA','Бронювання','Телефонія','Месенджери','Відгуки','Фінанси','SPA','Ресторан','Housekeeping'];
    var inner=[]; for(var i=0;i<6;i++){inner.push(polar(C,C,170,-60+i*60+15))}
    var lines=el('g',{},s), nodes=el('g',{},s);
    labels.forEach(function(l,i){
      var p=polar(C,C,250,-90+i*(360/labels.length));
      var d='M'+C+' '+C+' L'+p[0].toFixed(1)+' '+p[1].toFixed(1);
      var path=el('path',{d:d,'class':'dash',id:'hp'+i},lines);
      if(!reduce && i%2===0){
        var c=el('circle',{r:3.5,'class':'pk'},lines);
        var m=el('animateMotion',{dur:(3+i*.25)+'s',repeatCount:'indefinite',path:d,keyPoints:'1;0',keyTimes:'0;1',calcMode:'linear'},c);
      }
    });
    inner.forEach(function(p){el('circle',{cx:p[0],cy:p[1],r:6,'class':'core-c'},nodes)});
    labels.forEach(function(l,i){
      var p=polar(C,C,250,-90+i*(360/labels.length));
      var g=pill(nodes,p[0],p[1],l,17,'float');
      g.style.setProperty('--d',(i*.35)+'s');
    });
    el('circle',{cx:C,cy:C,r:64,fill:'none',stroke:'#2B35CC','stroke-opacity':.25,'stroke-width':10},s);
    el('circle',{cx:C,cy:C,r:54,'class':'core-c'},s);
    var t=el('text',{x:C,y:C+1,'class':'core-t','font-size':19},s);t.textContent='Synaptic';
    hero.appendChild(s);
  }

  /* Problem: scattered systems with broken links */
  var chaos=document.getElementById('chaos');
  if(chaos){
    var s2=el('svg',{viewBox:'0 0 640 560','aria-hidden':'true'});
    var pts={PMS:[80,50],OTA:[300,40],'Фінанси':[500,60],'Відгуки':[540,160],'Бронювання':[170,150],POS:[370,160],SPA:[560,260],CRM:[70,260],'Персонал':[280,265],'Месенджери':[430,360],'Ресторан':[140,400],Housekeeping:[400,490]};
    var links=[['PMS','Бронювання'],['Бронювання','OTA'],['OTA','POS'],['POS','Персонал'],['Фінанси','SPA'],['SPA','Месенджери'],['CRM','Ресторан'],['Ресторан','Housekeeping'],['Housekeeping','Месенджери'],['Фінанси','Відгуки']];
    var lg=el('g',{},s2);
    links.forEach(function(l){
      var a=pts[l[0]],b=pts[l[1]];
      // draw only the first and last 30% so the link looks broken in the middle
      var x1=a[0]+(b[0]-a[0])*.32,y1=a[1]+(b[1]-a[1])*.32,x2=b[0]-(b[0]-a[0])*.32,y2=b[1]-(b[1]-a[1])*.32;
      el('path',{d:'M'+a[0]+' '+a[1]+' L'+x1+' '+y1,'class':'dash weak'},lg);
      el('path',{d:'M'+x2+' '+y2+' L'+b[0]+' '+b[1],'class':'dash weak'},lg);
    });
    var k=0;
    for(var name in pts){var g=pill(s2,pts[name][0],pts[name][1],name,21,'float');g.style.setProperty('--d',(k++*.5)+'s')}
    chaos.appendChild(s2);
  }

  /* Solution: eight directions around the core */
  var hub=document.getElementById('hub');
  if(hub){
    var s3=el('svg',{viewBox:'0 0 560 560','aria-hidden':'true'}),H=280;
    el('circle',{cx:H,cy:H,r:262,fill:'none',stroke:'#CFD2EC','stroke-dasharray':'3 6'},s3);
    el('circle',{cx:H,cy:H,r:128,'class':'ring'},s3);
    var names=['Гість','Операції','Команда','Фінанси','Продажі','Сервіс','Маркетинг','Аналітика'];
    var ln=el('g',{},s3),nd=el('g',{},s3);
    names.forEach(function(n,i){
      var p=polar(H,H,200,-90+i*45);
      el('path',{d:'M'+H+' '+H+' L'+p[0].toFixed(1)+' '+p[1].toFixed(1),'class':'dash'},ln);
    });
    names.forEach(function(n,i){var p=polar(H,H,200,-90+i*45);pill(nd,p[0],p[1],n,18)});
    el('circle',{cx:H,cy:H,r:80,'class':'core-c'},s3);
    var t3=el('text',{x:H,y:H+1,'class':'core-t','font-size':22},s3);t3.textContent='Synaptic';
    hub.appendChild(s3);
  }

  /* Copilot: owner questions (illustrative scenarios) */
  var scenes=[
    [['Завантаження','За планом'],['Дохід і відхилення від плану','Є відхилення'],['Проблемні гості','2 потребують уваги'],['Додаткові продажі','5 можливостей'],['Операційні ризики','1 виявлено'],['Задачі','4 вже створено']],
    [['Невикористані upgrade','Є можливості на найближчі заїзди'],['Пізній виїзд та ранній заїзд','Не запропоновано частині гостей'],['Прямі звернення без відповіді','Є, відповіді підготовлено'],['Гості з ризиком не повернутися','Список підготовлено'],['Рекомендація','Запустити персональні пропозиції'],['Статус','Очікує вашого погодження']],
    [['Гість із відкритою скаргою','Потребує уваги зараз'],['Критичність','Висока'],['Відповідальний','Призначено'],['Контроль SLA','Активний'],['Якщо не вирішено','Ескалація менеджеру'],['Статус','Задачу створено']]
  ];
  var rows=document.getElementById('co-rows'),qs=document.querySelectorAll('#qs .q');
  function show(i){
    if(!rows)return; rows.innerHTML='';
    scenes[i].forEach(function(r,k){
      var d=document.createElement('div');d.className='co-row'+(reduce?'':' fade');d.style.animationDelay=(k*.06)+'s';
      var a=document.createElement('span');a.textContent=r[0];
      var b=document.createElement('b');b.textContent=r[1];
      d.appendChild(a);d.appendChild(b);rows.appendChild(d);
    });
    qs.forEach(function(q,k){q.setAttribute('aria-pressed',k===i?'true':'false')});
  }
  qs.forEach(function(q){q.addEventListener('click',function(){show(+q.dataset.i)})});
  show(0);

  /* reveal on scroll */
  var rv=document.querySelectorAll('.rv');
  if(!('IntersectionObserver' in window)||reduce){rv.forEach(function(e){e.classList.add('in')})}
  else{
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -5% 0px'});
    rv.forEach(function(e){io.observe(e)});
  }

  /* copy phone */
  document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){
    var old=b.textContent;
    function done(){b.textContent='Скопійовано';setTimeout(function(){b.textContent=old},1800)}
    try{navigator.clipboard.writeText(b.dataset.copy).then(done,function(){})}catch(e){}
  })});
})();

(function(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('.flows g,.tangle .pk,.tangle .pkl,.flow .pkf,.sx .pkx').forEach(function(g){g.remove()})}
  var rv=document.querySelectorAll('.rv,[data-io]');
  if(!('IntersectionObserver' in window)){rv.forEach(function(e){e.classList.add('in')});}
  else{
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.15,rootMargin:'0px 0px -6% 0px'});
    rv.forEach(function(e){io.observe(e)});
  }
  // counters
  var cn=document.querySelectorAll('[data-n]');
  if('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    var co=new IntersectionObserver(function(es){es.forEach(function(e){
      if(!e.isIntersecting)return; co.unobserve(e.target);
      var el=e.target,end=+el.dataset.n,sub=el.querySelector('sub'),t0=null;
      function step(t){t0=t0||t;var p=Math.min((t-t0)/1100,1),v=Math.max(1,Math.round(end*(1-Math.pow(1-p,3))));
        if(sub){el.firstChild.nodeValue=v}else{el.textContent=v}
        if(p<1)requestAnimationFrame(step)}
      requestAnimationFrame(step);
    })},{threshold:.6});
    cn.forEach(function(e){co.observe(e)});
  }
  document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){
    var v=b.dataset.copy,old=b.textContent;
    function done(){b.textContent='Скопійовано';setTimeout(function(){b.textContent=old},1800)}
    function fb(){try{var n=b.closest('.ct-row').querySelector('.ct-val'),r=document.createRange();r.selectNodeContents(n);var sl=window.getSelection();sl.removeAllRanges();sl.addRange(r);b.textContent='Виділено, скопіюйте';setTimeout(function(){b.textContent=old},2500)}catch(e){}}
    try{navigator.clipboard.writeText(v).then(done,fb)}catch(e){fb()}
  })});
})();
(function(){
  var tabs=document.querySelectorAll('.seg-t [role=tab]');
  tabs.forEach(function(t,i){t.addEventListener('click',function(){
    tabs.forEach(function(x,j){x.setAttribute('aria-selected',j===i?'true':'false');var p=document.getElementById(x.getAttribute('aria-controls'));if(p){p.hidden=j!==i;p.classList.toggle('on',j===i)}});
  })});
})();

/* Shared dropdown presentation. Native select values and change handlers remain authoritative. */
(function(){
  'use strict';
  if(window.FlexpickFilters)return;
  const controls=new Map();let counter=0,queued=false;
  function attached(select,c){
    return select.isConnected&&c.menu.isConnected&&(c.holder
      ?select.parentElement===c.label&&c.label.parentElement===c.holder&&c.menu.parentElement===c.holder
      :select.nextElementSibling===c.menu);
  }
  function dispose(select,c){
    controls.delete(select);c.events.abort();c.menu.remove();select.classList.remove('fp-filter-source');
    if(c.holder?.isConnected)c.holder.replaceWith(...c.holder.childNodes);
  }
  function optionRows(select){
    const seen=new Set();return Array.from(select.options).filter(option=>{if(option.hidden||seen.has(option.value))return false;seen.add(option.value);return true;});
  }
  function labelFor(select){
    const label=select.labels?.[0];
    return select.getAttribute('aria-label')||(label?Array.from(label.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim():'')||select.title||'Select';
  }
  function closeOthers(except){for(const {menu}of controls.values())if(menu!==except)menu.open=false;}
  function refresh(select,control){
    const selected=Array.from(select.selectedOptions).map(o=>o.textContent);
    control.summary.textContent=selected.length>1?`${selected.length} selected`:selected[0]||'No options';
    control.summary.setAttribute('aria-label',labelFor(select)+': '+control.summary.textContent);
    control.summary.setAttribute('aria-disabled',String(select.disabled));
    control.summary.tabIndex=select.disabled?-1:0;control.menu.hidden=select.hidden;
    if(select.disabled){control.menu.open=false;control.summary.title=select.id==='lvStage'?'Only the available stages in this export can be selected.':'No other options are available.';}
    else control.summary.removeAttribute('title');
  }
  function populate(select,control){
    const group=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=labelFor(select);group.append(legend);group.disabled=select.disabled;let previous='';
    for(const option of optionRows(select)){
      const groupName=option.parentElement.tagName==='OPTGROUP'?option.parentElement.label:'';
      if(groupName&&groupName!==previous){const heading=document.createElement('p');heading.className='fp-filter-group';heading.textContent=groupName;group.append(heading);previous=groupName;}
      const row=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span');
      input.type=select.multiple?'checkbox':'radio';input.name='filter-'+select.id;input.value=option.value;input.checked=option.selected;input.disabled=option.disabled||(option.parentElement.tagName==='OPTGROUP'&&option.parentElement.disabled);text.textContent=option.textContent;
      row.append(input,text);group.append(row);
    }
    control.pop.replaceChildren(group);
  }
  function mount(root=document){
    for(const [select,c]of controls)if(!attached(select,c))dispose(select,c);
    root.querySelectorAll('select').forEach(select=>{
      if(controls.has(select)||select.hidden||select.closest('.choice-menu,.msel')||select.size>1)return;
      if(!select.id)select.id='fp-filter-'+(++counter);
      const menu=document.createElement('details'),summary=document.createElement('summary'),pop=document.createElement('div');
      menu.className='fp-filter';summary.id=select.id+'Control';pop.className='fp-filter-options';menu.append(summary,pop);
      const control={menu,summary,pop,events:new AbortController()};controls.set(select,control);select.classList.add('fp-filter-source');
      const on=(node,type,handler)=>node.addEventListener(type,handler,{signal:control.events.signal});
      if(select.parentElement.tagName==='LABEL'){
        const label=select.parentElement,holder=document.createElement('div');holder.className='fp-filter-field';label.before(holder);holder.append(label,menu);
        control.holder=holder;control.label=label;
      }else select.after(menu);
      on(pop,'change',event=>{
        const input=event.target;
        if(input.tagName!=='INPUT'||input.disabled||select.disabled)return;
        const option=optionRows(select).find(o=>o.value===input.value);if(!option)return;
        if(select.multiple)option.selected=input.checked;else select.value=option.value;
        if(!select.multiple)menu.open=false;
        select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));
        if(!select.multiple)queueMicrotask(()=>document.getElementById(select.id+'Control')?.focus());
        // Change handlers may synchronously replace the select and dispose this control.
        if(controls.get(select)!==control)return;
        refresh(select,control);
      });
      on(summary,'click',event=>{if(select.disabled){event.preventDefault();return;}closeOthers(menu);if(!menu.open)populate(select,control);});
      on(summary,'keydown',event=>{if(select.disabled&&(event.key==='Enter'||event.key===' '))event.preventDefault();});
      on(menu,'toggle',()=>{if(menu.open){
        pop.style.left='0';pop.style.right='auto';pop.style.top='calc(100% + 6px)';pop.style.bottom='auto';pop.style.maxHeight='300px';
        if(pop.getBoundingClientRect().right>innerWidth-16){pop.style.left='auto';pop.style.right='0';}
        const bounds=menu.getBoundingClientRect(),below=innerHeight-bounds.bottom,above=bounds.top;
        const flip=below<Math.min(pop.scrollHeight,200)&&above>below;
        if(flip){pop.style.top='auto';pop.style.bottom='calc(100% + 6px)';}
        pop.style.maxHeight=Math.max(100,Math.min(300,(flip?above:below)-24))+'px';
      }});
      on(menu,'keydown',event=>{if(event.key==='Escape'){menu.open=false;summary.focus();}});
      on(select,'change',()=>refresh(select,control));refresh(select,control);
    });
    for(const [select,control]of controls)refresh(select,control);
  }
  function boot(){
    mount();document.addEventListener('click',event=>{for(const {menu}of controls.values())if(menu.open&&!menu.contains(event.target))menu.open=false;},true);
    new MutationObserver(records=>{
      if(queued||records.every(r=>r.target instanceof Element&&r.target.closest('.fp-filter,.choice-menu,.mselp')))return;
      queued=true;queueMicrotask(()=>{queued=false;mount();});
    }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled','selected']});
  }
  window.FlexpickFilters={mount};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

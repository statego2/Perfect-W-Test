import test from 'node:test';
import assert from 'node:assert/strict';

class MockElement {
  constructor(){this._html='';this.cache=new Map();this.listCache=new Map();this.dataset={};this.onclick=null;this.onchange=null;this.listeners={};this.style={};}
  get innerHTML(){return this._html;}
  set innerHTML(x){this._html=x;this.cache.clear();this.listCache.clear();}
  addEventListener(event,callback){this.listeners[event]=callback;}
  querySelector(selector){if(!this.cache.has(selector))this.cache.set(selector,new MockElement());return this.cache.get(selector);}
  querySelectorAll(selector){if(this.listCache.has(selector))return this.listCache.get(selector);
    let elements=[];
    if(selector==='[data-val]')elements=Array.from({length:7},(_,i)=>Object.assign(new MockElement(),{dataset:{val:String(i+1)}}));
    if(selector==='[data-rate]')elements=Array.from({length:7},(_,i)=>Object.assign(new MockElement(),{dataset:{rate:String(i+1)}}));
    if(selector==='[data-choice]')elements=['L','R','TIE','NONE','UNSURE'].map(choice=>Object.assign(new MockElement(),{dataset:{choice}}));
    this.listCache.set(selector,elements);return elements;
  }
  showModal(){}close(){}remove(){}appendChild(){}click(){}
}
test('UI end-to-end: start → 16 values → 12 ratings → 27 comparisons → results',async()=>{
  const root=new MockElement();
  globalThis.document={querySelector:selector=>selector==='#app'?root:root.querySelector(selector),body:new MockElement(),createElement:()=>new MockElement()};
  const store=new Map();
  globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
  globalThis.window={scrollTo(){}};
  await import('../app.mjs?smoke=1');
  assert.match(root.innerHTML,/Ξεκίνα το τεστ/);
  root.querySelector('#start').onclick();
  assert.match(root.innerHTML,/ΜΕΡΟΣ 1/);
  for(let i=0;i<16;i++){
    root.querySelectorAll('[data-val]')[i%7].onclick();
    root.querySelector('#nextBtn').onclick();
  }
  assert.match(root.innerHTML,/ΜΕΡΟΣ 2/);
  for(let i=0;i<12;i++){
    root.querySelectorAll('[data-rate]')[i%7].onclick();
    root.querySelector('#nextBtn').onclick();
  }
  assert.match(root.innerHTML,/ΜΕΡΟΣ 3/);
  for(let i=0;i<27;i++){
    root.querySelectorAll('[data-choice]')[i%5].onclick();
    root.querySelector('#nextBtn').onclick();
  }
  assert.match(root.innerHTML,/Η αισθητική σου,/);
  assert.match(root.innerHTML,/Αισθητικοί άξονες:/);
  const saved=JSON.parse(store.get('my-perfect-woman.beauty.v1'));
  assert.equal(saved.phase,'results');
  assert.equal(Object.keys(saved.valueAnswers).length,16);
  assert.equal(Object.keys(saved.faceRatings).length,12);
  assert.equal(Object.keys(saved.pairAnswers).length,27);
  root.querySelector('#resume').onclick();
  assert.match(root.innerHTML,/ΜΕΡΟΣ 1/);
});

'use strict';
(function(global){const KEY='mis-finanzas-v3',PREVIOUS=['mis-finanzas-v2','mis-finanzas-v1'];let handle=null;
function localRead(k){try{return localStorage.getItem(k)}catch{return null}}
function parse(s){try{const x=JSON.parse(s);if(x?.schema===3)return {...x,data:MF.normalize(x.data)}}catch{}return null}
function timeout(p,ms=3000){return Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(Error('El almacenamiento tardó demasiado')),ms))])}
async function open(){if(typeof indexedDB==='undefined')return;try{handle=await timeout(new Promise((resolve,reject)=>{const r=indexedDB.open('mis-finanzas-local',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('state'))r.result.createObjectStore('state')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Almacenamiento ocupado'))}));}catch{handle=null}}
async function read(k){if(!handle)return null;try{return await timeout(new Promise((resolve,reject)=>{const tx=handle.transaction('state','readonly'),r=tx.objectStore('state').get(k);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)}))}catch{return null}}
async function write(value){if(!handle)throw Error('No disponible');await timeout(new Promise((resolve,reject)=>{const tx=handle.transaction('state','readwrite');tx.objectStore('state').put(value,KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)}));if(await read(KEY)!==value)throw Error('No se pudo verificar el guardado')}
async function load(){await open();for(const k of [KEY,KEY+'-recovery']){const value=parse(localRead(k));if(value)return value.data;const stored=parse(await read(k));if(stored)return stored.data}await erasePrevious();return MF.fresh()}
async function erasePrevious(){try{for(const k of Object.keys(localStorage)){if(k.startsWith('mis-finanzas')&&!k.startsWith(KEY))localStorage.removeItem(k)}}catch{}if(handle){try{await timeout(new Promise((resolve,reject)=>{const tx=handle.transaction('state','readwrite'),store=tx.objectStore('state');PREVIOUS.forEach(k=>store.delete(k));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)}))}catch{}}}
async function save(data){const payload=JSON.stringify({schema:3,updatedAt:Date.now(),data:MF.normalize(data)});let localOK=false,indexOK=false;try{localStorage.setItem(KEY,payload);localOK=localStorage.getItem(KEY)===payload;if(localOK){try{localStorage.setItem(KEY+'-recovery',payload)}catch{}}}catch{}try{await write(payload);indexOK=true}catch{}if(!localOK&&!indexOK)throw Error('No se pudo guardar en este navegador. No se guardaron los cambios.');await erasePrevious();return true}

global.MFStore={load,save};if(typeof module!=='undefined')module.exports=global.MFStore;
})(globalThis);

import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Overview from '../connected/Overview';

Object.assign(globalThis,{React});

test('business dashboard shows real operational values without invented trends or ratings',()=>{
 const resource=<T,>(data:T|null)=>({data,loading:false,error:'',reload(){}});
 const html=renderToStaticMarkup(React.createElement(Overview,{
  overview:resource({branches:1,catalogue_items:3,reservations:4,orders:5,fulfilled_order_total_minor:'14500000'}),
  finance:resource({payableMinor:'320000',recoveryDebtMinor:'0'}),
  slots:resource([{id:'slot-1',active:true,capacity:12,reserved:8,ends_at:new Date(Date.now()+3600000).toISOString()}]),
  reservations:resource([{id:'reservation-1',status:'confirmed',guests:4,created_at:'2026-11-22T09:00:00.000Z'}]),
  orders:resource([{id:'order-1',status:'preparing',total_minor:'25000',currency:'NGN'}]),
  onTab(){},
 }));
 assert.match(html,/Fulfilled order value/);
 assert.match(html,/₦145,000/);
 assert.match(html,/₦3,200/);
 assert.match(html,/Scheduled capacity/);
 assert.match(html,/8 \/ 12/);
 assert.match(html,/67% booked/);
 assert.match(html,/1 confirmed reservation/);
 assert.match(html,/1 active order/);
 assert.match(html,/Recent reservations/);
 assert.match(html,/Orders in progress/);
 assert.doesNotMatch(html,/Business health|Customer rating|last week|Revenue trends|₦140,000/);
});

test('business dashboard empty states do not present unavailable data as zeroed metrics',()=>{
 const resource=<T,>(data:T|null)=>({data,loading:false,error:'',reload(){}});
 const html=renderToStaticMarkup(React.createElement(Overview,{
  overview:resource({branches:1,catalogue_items:0,reservations:0,orders:0,fulfilled_order_total_minor:'0'}),
  finance:resource({payableMinor:'0',recoveryDebtMinor:'0'}),
  slots:resource([]),
  reservations:resource([]),
  orders:resource([]),
  onTab(){},
 }));
 assert.match(html,/No active capacity is scheduled for this branch/);
 assert.match(html,/You’re all caught up/);
 assert.match(html,/No confirmed reservations for this branch yet/);
 assert.match(html,/No active orders for this branch right now/);
});

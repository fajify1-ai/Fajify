'use client';
import {State,money} from '@faji/web-ui/client';
import type {BusinessOverview,MerchantRow} from '@faji/web-ui/types';

type Resource<T>={data:T|null;loading:boolean;error:string;reload:()=>void};
type Finance={payableMinor:string;recoveryDebtMinor:string};
type Tab='Reservations'|'Orders'|'Menu'|'QR'|'Finance';

function rowDate(value?:string){
 if(!value)return 'Date not provided';
 const date=new Date(value);
 return Number.isNaN(date.getTime())?'Date not provided':new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short'}).format(date);
}

function newestFirst(items:MerchantRow[]){
 return [...items].sort((a,b)=>{
  const aTime=a.created_at?new Date(a.created_at).getTime():Number.NEGATIVE_INFINITY;
  const bTime=b.created_at?new Date(b.created_at).getTime():Number.NEGATIVE_INFINITY;
  return (Number.isNaN(bTime)?Number.NEGATIVE_INFINITY:bTime)-(Number.isNaN(aTime)?Number.NEGATIVE_INFINITY:aTime);
 });
}

export default function Overview({overview,finance,slots,reservations,orders,onTab}:{overview:Resource<BusinessOverview>;finance:Resource<Finance>;slots:Resource<MerchantRow[]>;reservations:Resource<MerchantRow[]>;orders:Resource<MerchantRow[]>;onTab:(tab:Tab)=>void}){
 const activeSlots=(slots.data??[]).filter(slot=>slot.active!==false&&(!slot.ends_at||new Date(slot.ends_at).getTime()>Date.now()));
 const capacity=activeSlots.reduce((total,slot)=>total+(Number.isFinite(slot.capacity)?Math.max(0,slot.capacity??0):0),0);
 const reserved=activeSlots.reduce((total,slot)=>total+(Number.isFinite(slot.reserved)?Math.max(0,slot.reserved??0):0),0);
 const percent=capacity?Math.min(100,Math.round(reserved/capacity*100)):0;
 const confirmed=(reservations.data??[]).filter(item=>item.status==='confirmed');
 const activeOrders=(orders.data??[]).filter(item=>['placed','accepted','preparing','ready'].includes(item.status??''));
 const recentReservations=newestFirst(confirmed).slice(0,3);
 const recentOrders=newestFirst(activeOrders).slice(0,3);

 return <section className="merchant-overview" aria-label="Business overview">
  <article className="overview-card overview-revenue">
   <div className="overview-heading">
    <div>
     <p className="overview-eyebrow">Fulfilled order value</p>
     <State loading={overview.loading} error={overview.error} retry={overview.reload}>
      {overview.data&&<p className="overview-value">{money(overview.data.fulfilled_order_total_minor)}</p>}
     </State>
     <p className="overview-caption">Total completed order value · all branches</p>
    </div>
    <button className="overview-link" onClick={()=>onTab('Finance')}>View balance <span aria-hidden="true">→</span></button>
   </div>
   <div className="overview-pair overview-balances">
    <div><p className="overview-caption">Available balance</p><State loading={finance.loading} error={finance.error} retry={finance.reload}>{finance.data&&<strong>{money(finance.data.payableMinor)}</strong>}</State></div>
    <div><p className="overview-caption">Recovery balance</p><State loading={finance.loading} error={finance.error} retry={finance.reload}>{finance.data&&<strong>{money(finance.data.recoveryDebtMinor)}</strong>}</State></div>
   </div>
  </article>

  <article className="overview-card overview-capacity-card">
   <div className="overview-heading">
    <div><h2>Scheduled capacity</h2><p className="overview-caption">Active upcoming slots · selected branch</p></div>
    <span className="overview-accent">{slots.data?`${reserved} / ${capacity}`:'—'}</span>
   </div>
   <State loading={slots.loading} error={slots.error} retry={slots.reload}>
    {activeSlots.length===0
     ? <div className="overview-empty">No active capacity is scheduled for this branch.</div>
     : <>
        <div className="overview-capacity" role="progressbar" aria-label="Reserved capacity" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{width:`${percent}%`}}/></div>
        <div className="overview-heading overview-caption"><span>{percent}% booked</span><strong>{Math.max(0,capacity-reserved)} places available</strong></div>
       </>}
   </State>
  </article>

  <section className="overview-panel overview-metrics" aria-label="Operational totals">
   <button className="overview-card overview-metric" onClick={()=>onTab('Reservations')}>
    <span className="overview-eyebrow">Reservations</span><strong className="overview-value">{overview.loading?'—':overview.data?.reservations??'—'}</strong><span className="overview-caption">Across all branches <span aria-hidden="true">→</span></span>
   </button>
   <button className="overview-card overview-metric" onClick={()=>onTab('Orders')}>
    <span className="overview-eyebrow">Orders</span><strong className="overview-value">{overview.loading?'—':overview.data?.orders??'—'}</strong><span className="overview-caption">Across all branches <span aria-hidden="true">→</span></span>
   </button>
  </section>

  <section className="overview-panel overview-tasks">
   <div className="overview-heading"><div><h2>Next tasks</h2><p className="overview-caption">Keep your branch operations moving.</p></div><span className="overview-count">{confirmed.length+activeOrders.length}</span></div>
   <State loading={reservations.loading||orders.loading} error={reservations.error||orders.error} retry={()=>{reservations.reload();orders.reload();}}>
    {confirmed.length+activeOrders.length===0
     ? <div className="overview-empty">You’re all caught up. New reservations and orders will appear here.</div>
     : <>
        {confirmed.length>0&&<button className="overview-task" onClick={()=>onTab('Reservations')}><span className="overview-task-mark" aria-hidden="true">◷</span><span><strong>{confirmed.length} confirmed {confirmed.length===1?'reservation':'reservations'}</strong><small>Review guest arrivals and check-ins</small></span><span aria-hidden="true">›</span></button>}
        {activeOrders.length>0&&<button className="overview-task" onClick={()=>onTab('Orders')}><span className="overview-task-mark" aria-hidden="true">▣</span><span><strong>{activeOrders.length} active {activeOrders.length===1?'order':'orders'}</strong><small>Review preparation and fulfilment</small></span><span aria-hidden="true">›</span></button>}
       </>}
   </State>
  </section>

  <section className="overview-panel overview-quick-actions">
   <h2>Quick actions</h2>
   <div className="overview-actions">
    {([{tab:'QR',icon:'▦',label:'Redeem ticket'},{tab:'Menu',icon:'+',label:'Add item'},{tab:'Finance',icon:'₦',label:'View finances'}] as {tab:Tab;icon:string;label:string}[]).map(item=><button className="overview-card" key={item.tab} onClick={()=>onTab(item.tab)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}
   </div>
  </section>

  <section className="overview-panel overview-list-panel">
   <div className="overview-heading"><div><h2>Recent reservations</h2><p className="overview-caption">Confirmed · selected branch</p></div><button className="overview-link" onClick={()=>onTab('Reservations')}>View all <span aria-hidden="true">→</span></button></div>
   <State loading={reservations.loading} error={reservations.error} retry={reservations.reload}>
    {recentReservations.length===0
     ? <div className="overview-empty">No confirmed reservations for this branch yet.</div>
     : recentReservations.map(item=><div className="overview-task overview-list-row" key={item.id}><span className="overview-task-mark" aria-hidden="true">◷</span><span><strong>{item.guests??1} {item.guests===1?'guest':'guests'}</strong><small>Received {rowDate(item.created_at)} · {item.id.slice(0,8)}</small></span><span className="overview-status">Confirmed</span></div>)}
   </State>
  </section>

  <section className="overview-panel overview-list-panel">
   <div className="overview-heading"><div><h2>Orders in progress</h2><p className="overview-caption">Selected branch</p></div><button className="overview-link" onClick={()=>onTab('Orders')}>View all <span aria-hidden="true">→</span></button></div>
   <State loading={orders.loading} error={orders.error} retry={orders.reload}>
    {recentOrders.length===0
     ? <div className="overview-empty">No active orders for this branch right now.</div>
     : recentOrders.map(item=><div className="overview-task overview-list-row" key={item.id}><span className="overview-task-mark" aria-hidden="true">▣</span><span><strong>{item.status?.replaceAll('_',' ')}</strong><small>{item.id.slice(0,8)} · {item.total_minor?money(item.total_minor,item.currency):'Amount unavailable'}</small></span><span className="overview-status overview-order-status">{item.status?.replaceAll('_',' ')}</span></div>)}
   </State>
  </section>
 </section>;
}

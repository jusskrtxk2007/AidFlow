import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { Activity as ActivityIcon, ArrowRight, Bell, Bike, Boxes, Check, CircleHelp, Clock3, HeartHandshake, Leaf, MapPin, Menu, Moon, Package, Plus, RotateCcw, Search, ShieldCheck, Sun, Truck, Utensils, X, Zap } from 'lucide-react';

type Zone = 'RED' | 'YELLOW' | 'GREEN';
type Donation = { id:string; donorName:string; food:string; category:string; quantity:number; unit:string; pickupLocation:string; deadline:string; status:string; compatibleNeeds:string[] };
type Rider = { id:string; name:string; capacity:number; assignedQuantity:number; status:string; availability:boolean };
type Shelter = { id:string; name:string; location:string; demand:number; stock:number; requirements:string[]; available:boolean; zone:string };
type Delivery = { id:string; donationId:string; shelterId:string; riderId:string; quantity:number; etaMinutes:number; status:string; assignmentState:string };
type EventItem = { id:string; text:string; timestamp:string; kind:string };
type Store = { donations:Donation[]; riders:Rider[]; shelters:Shelter[]; deliveries:Delivery[]; activity:EventItem[]; role:string; theme:string };

const initial:Store = {
  donations:[
    {id:'DN-104',donorName:'Juniper & Rye Bakery',food:'Sourdough loaves',category:'Bakery',quantity:34,unit:'loaves',pickupLocation:'18 Mercer Street',deadline:new Date(Date.now()+1000*60*105).toISOString(),status:'available',compatibleNeeds:['Bakery','Staples']},
    {id:'DN-103',donorName:'Market House Co-op',food:'Seasonal produce boxes',category:'Produce',quantity:22,unit:'boxes',pickupLocation:'62 Union Market',deadline:new Date(Date.now()+1000*60*150).toISOString(),status:'available',compatibleNeeds:['Produce','Fresh produce']},
    {id:'DN-102',donorName:'Cedar Table Kitchen',food:'Prepared lentil bowls',category:'Prepared meals',quantity:18,unit:'meals',pickupLocation:'West End Kitchen',deadline:new Date(Date.now()+1000*60*65).toISOString(),status:'reserved',compatibleNeeds:['Prepared meals','Meals']}
  ],
  riders:[
    {id:'RD-01',name:'Maya Chen',capacity:32,assignedQuantity:18,status:'On route',availability:true},
    {id:'RD-02',name:'Andre Lewis',capacity:40,assignedQuantity:0,status:'Available',availability:true},
    {id:'RD-03',name:'Sofia Patel',capacity:24,assignedQuantity:0,status:'Available',availability:true},
  ],
  shelters:[
    {id:'SH-01',name:'Harbor House',location:'North Wharf',demand:62,stock:13,requirements:['Produce','Bakery','Fresh produce'],available:true,zone:'North'},
    {id:'SH-02',name:'The Welcome Table',location:'Old Town',demand:48,stock:14,requirements:['Prepared meals','Meals','Bakery'],available:true,zone:'Central'},
    {id:'SH-03',name:'Willow Street Pantry',location:'East Gardens',demand:45,stock:38,requirements:['Produce','Staples'],available:true,zone:'East'},
    {id:'SH-04',name:'New Day Shelter',location:'South Quarter',demand:56,stock:22,requirements:['Prepared meals','Bakery'],available:true,zone:'South'}
  ],
  deliveries:[
    {id:'DL-208',donationId:'DN-102',shelterId:'SH-02',riderId:'RD-01',quantity:18,etaMinutes:17,status:'in transit',assignmentState:'confirmed'}
  ],
  activity:[
    {id:'EV-1',text:'Maya Chen picked up 18 prepared meals for The Welcome Table',timestamp:new Date(Date.now()-1000*60*14).toISOString(),kind:'delivery'},
    {id:'EV-2',text:'Market House Co-op listed 22 seasonal produce boxes',timestamp:new Date(Date.now()-1000*60*38).toISOString(),kind:'donation'},
    {id:'EV-3',text:'Harbor House reported low produce stock',timestamp:new Date(Date.now()-1000*60*83).toISOString(),kind:'shelter'}
  ],role:'Operations',theme:'light'
};
const STORAGE='aidflow-demo-v1';
const navigation=[['/dashboard','Operations overview',ActivityIcon],['/donors','Donors & food',Utensils],['/riders','Rider network',Bike],['/shelters','Shelters & needs',HeartHandshake],['/deliveries','Dispatch board',Truck],['/activity','Activity log',Clock3]] as const;
const id=(prefix:string)=>`${prefix}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
const fmtTime=(iso:string)=>new Date(iso).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
const minsLeft=(iso:string)=>Math.max(0,Math.round((new Date(iso).getTime()-Date.now())/60000));

function loadStore():Store {
  try { const raw=localStorage.getItem(STORAGE); if(raw) return {...initial,...JSON.parse(raw)}; } catch {}
  return initial;
}
function zoneFor(s:Shelter, incoming:number):Zone {
  const uncovered=Math.max(0,s.demand-s.stock-incoming);
  const coverage=s.demand ? (s.stock+incoming)/s.demand : 1;
  if(uncovered>=Math.max(15,s.demand*.32)) return 'RED';
  if(coverage>=.88) return 'GREEN';
  return 'YELLOW';
}
function AidFlow() {
  const [store,setStore]=useState<Store>(loadStore);
  const [path,setPath]=useLocation();
  const [mobileOpen,setMobileOpen]=useState(false);
  const [dialog,setDialog]=useState('');
  const [toast,setToast]=useState('');
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('All');
  const [notificationOpen,setNotificationOpen]=useState(false);
  const [shelterDraft,setShelterDraft]=useState<Shelter|null>(null);
  useEffect(()=>{localStorage.setItem(STORAGE,JSON.stringify(store));document.documentElement.classList.toggle('dark',store.theme==='dark')},[store]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3200);return()=>clearTimeout(t)},[toast]);
  const getIncoming=(shelterId:string)=>store.deliveries.filter(d=>d.shelterId===shelterId&&d.assignmentState!=='offered'&&d.status!=='delivered'&&d.status!=='cancelled').reduce((n,d)=>n+d.quantity,0);
  const getAllocatedTo=(shelterId:string,excludeDeliveryId?:string)=>store.deliveries.filter(d=>d.shelterId===shelterId&&d.id!==excludeDeliveryId&&d.status!=='delivered'&&d.status!=='cancelled').reduce((n,d)=>n+d.quantity,0);
  const shelters=useMemo(()=>store.shelters.map(s=>({...s,zone:zoneFor(s,store.deliveries.filter(d=>d.shelterId===s.id&&d.assignmentState!=='offered'&&d.status!=='delivered'&&d.status!=='cancelled').reduce((n,d)=>n+d.quantity,0))})),[store.shelters,store.deliveries]);
  const log=(text:string,kind='update')=>setStore(s=>({...s,activity:[{id:id('EV'),text,timestamp:new Date().toISOString(),kind},...s.activity]}));
  const notify=(text:string)=>{setToast(text);};
  const patch=(partial:Partial<Store>)=>setStore(s=>({...s,...partial}));
  const addDonation=(d:Omit<Donation,'id'|'status'|'compatibleNeeds'>)=>{
    const donation:Donation={...d,id:id('DN'),status:'available',compatibleNeeds:[d.category]};
    setStore(s=>({...s,donations:[donation,...s.donations],activity:[{id:id('EV'),text:`${d.donorName} listed ${d.quantity} ${d.unit} of ${d.food}`,timestamp:new Date().toISOString(),kind:'donation'},...s.activity]}));
    setDialog('');notify('Donation listed. Checking nearby shelter needs.');
  };
  const addRider=(name:string,capacity:number)=>{
    setStore(s=>({...s,riders:[{id:id('RD'),name,capacity,assignedQuantity:0,status:'Available',availability:true},...s.riders]}));
    log(`${name} joined the rider network`,'rider');setDialog('');notify('Rider added to the network.');
  };
  const saveShelter=(edited:Shelter)=>{
    setStore(s=>({...s,shelters:s.shelters.map(x=>x.id===edited.id?edited:x)}));
    log(`${edited.name} updated shelter needs and stock`,'shelter');setShelterDraft(null);notify('Shelter details saved.');
  };
  const dispatch=(donation:Donation,shelter:Shelter,rider:Rider,quantity:number,eta:number)=>{
    const left=minsLeft(donation.deadline);
    if(!shelter.available){notify('Dispatch blocked: shelter is currently closed.');return}
    if(!rider.availability||rider.status==='Unresponsive'){notify('Dispatch blocked: rider is not available.');return}
    if(donation.status==='reserved'||quantity<=0||quantity>donation.quantity){notify('Choose a valid quantity within the remaining donation.');return}
    if(quantity>rider.capacity-rider.assignedQuantity){notify('Dispatch blocked: rider capacity would be exceeded.');return}
    if(eta>=left){notify('Unsafe dispatch blocked: arrival would be after the food deadline.');return}
    if(!shelter.requirements.some(r=>donation.compatibleNeeds.includes(r)||donation.category===r)){notify('Food does not match this shelter’s current requirements.');return}
    const uncovered=Math.max(0,shelter.demand-shelter.stock-getAllocatedTo(shelter.id));
    if(uncovered<=0){notify('This shelter is sufficiently supplied. Choose a shelter with unmet need.');return}
    const assigned=Math.min(quantity,uncovered);
    if(assigned<quantity && !window.confirm(`Only ${assigned} ${donation.unit} meet current unmet need. Dispatch that amount?`))return;
    const delivery:Delivery={id:id('DL'),donationId:donation.id,shelterId:shelter.id,riderId:rider.id,quantity:assigned,etaMinutes:eta,status:'available',assignmentState:'offered'};
    setStore(s=>({...s,deliveries:[delivery,...s.deliveries],donations:s.donations.map(d=>d.id===donation.id?{...d,quantity:d.quantity-assigned,status:d.quantity===assigned?'reserved':'available'}:d),riders:s.riders.map(r=>r.id===rider.id?{...r,assignedQuantity:r.assignedQuantity+assigned,status:'Offer pending'}:r),activity:[{id:id('EV'),text:`${assigned} ${donation.unit} offered to ${rider.name} for ${shelter.name}`,timestamp:new Date().toISOString(),kind:'delivery'},...s.activity]}));
    notify(`Dispatch offer sent to ${rider.name}.`);setDialog('');
  };
  const acceptDelivery=(d:Delivery)=>{
    const donation=store.donations.find(x=>x.id===d.donationId), shelter=store.shelters.find(x=>x.id===d.shelterId);
    const unmet=shelter?Math.max(0,shelter.demand-shelter.stock-getAllocatedTo(shelter.id,d.id)):0;
    const rider=store.riders.find(x=>x.id===d.riderId);
    if(!shelter?.available||!donation||!rider?.availability||rider.status==='Unresponsive'||minsLeft(donation.deadline)<=d.etaMinutes||unmet<d.quantity){notify('Offer no longer passes safe-dispatch checks. Choose a fresh match.');return}
    setStore(s=>({...s,deliveries:s.deliveries.map(x=>x.id===d.id?{...x,status:'reserved',assignmentState:'accepted'}:x),riders:s.riders.map(r=>r.id===d.riderId?{...r,status:'Assigned'}:r)}));
    log(`${riderName(d.riderId)} accepted a delivery to ${shelterName(d.shelterId)}`,'delivery');notify('Rider accepted the delivery.');
  };
  const advanceDelivery=(d:Delivery)=>{
    const steps=['reserved','picked up','in transit','delivered'];const next=steps[Math.min(steps.indexOf(d.status)+1,3)];
    if(next==='delivered'){
      const donation=store.donations.find(x=>x.id===d.donationId), shelter=store.shelters.find(x=>x.id===d.shelterId), rider=store.riders.find(x=>x.id===d.riderId);
      const otherIncoming=shelter?Math.max(0,getIncoming(shelter.id)-d.quantity):0;
      const unmet=shelter?Math.max(0,shelter.demand-shelter.stock-otherIncoming):0;
      if(!shelter?.available||!donation||!rider?.availability||rider.status==='Unresponsive'||minsLeft(donation.deadline)<=0||unmet<d.quantity){notify('Handoff blocked: rider, food deadline, shelter status or current need is no longer safe. Reroute before completing.');return}
       setStore(s=>({...s,deliveries:s.deliveries.map(x=>x.id===d.id?{...x,status:'delivered',assignmentState:'complete'}:x),shelters:s.shelters.map(x=>x.id===d.shelterId?{...x,stock:Math.min(x.demand,x.stock+d.quantity)}:x),riders:s.riders.map(r=>r.id===d.riderId?{...r,assignedQuantity:Math.max(0,r.assignedQuantity-d.quantity),status:r.assignedQuantity>d.quantity?'Assigned':'Available'}:r),donations:s.donations.map(x=>x.id===d.donationId?{...x,status:x.quantity===0||(x.status==='reserved'&&x.quantity===d.quantity)?'delivered':'available'}:x)}));
      log(`${d.quantity} units delivered to ${shelterName(d.shelterId)}; stock updated`,'delivery');notify('Delivery completed safely. Shelter stock updated.');
    } else {
      setStore(s=>({...s,deliveries:s.deliveries.map(x=>x.id===d.id?{...x,status:next}:x)}));
      log(`${riderName(d.riderId)} marked delivery ${next}`,'delivery');notify(`Delivery moved to ${next}.`);
    }
  };
  const riderName=(rid:string)=>store.riders.find(r=>r.id===rid)?.name||'Unassigned rider';
  const shelterName=(sid:string)=>store.shelters.find(s=>s.id===sid)?.name||'Unknown shelter';
  const simulateRider=(rid:string)=>{
    const rider=store.riders.find(r=>r.id===rid);if(!rider)return;
    const affected=store.deliveries.find(d=>d.riderId===rid&&['reserved','picked up','in transit'].includes(d.status));
    if(affected){setStore(s=>({...s,riders:s.riders.map(r=>r.id===rid?{...r,status:'Unresponsive',availability:false}:r)}));log(`${rider.name} is unresponsive; delivery ${affected.id} needs attention`,'warning');notify('Rider unresponsive. Reassign or review the active delivery.');}
    else {setStore(s=>({...s,riders:s.riders.map(r=>r.id===rid?{...r,status:'Unresponsive',availability:false}:r)}));log(`${rider.name} marked unresponsive`,'warning');notify('Rider marked unresponsive.');}
  };
  const handleDisruption=(d:Delivery,kind:'rider'|'closure')=>{
    const r=store.riders.find(x=>x.id===d.riderId),shelter=store.shelters.find(x=>x.id===d.shelterId);
    if(kind==='rider'&&r)simulateRider(r.id);
    if(kind==='closure'&&shelter){setStore(s=>({...s,shelters:s.shelters.map(x=>x.id===shelter.id?{...x,available:false}:x)}));log(`${shelter.name} closed during transit`,'warning');}
    const candidates=shelters.filter(x=>x.id!==d.shelterId&&x.available&&x.requirements.length>0&&d.quantity<=Math.max(0,x.demand-x.stock-getIncoming(x.id)));
    const riderCandidate=store.riders.find(x=>x.id!==d.riderId&&x.availability&&x.status!=='Unresponsive'&&x.capacity-x.assignedQuantity>=d.quantity);
    const target=candidates.find(x=>x.requirements.some(req=>store.donations.find(dn=>dn.id===d.donationId)?.compatibleNeeds.includes(req)));
    if(target&& (kind==='closure'||riderCandidate)){
       setStore(prev=>({...prev,deliveries:prev.deliveries.map(x=>x.id===d.id?{...x,shelterId:target.id,riderId:kind==='rider'&&riderCandidate?riderCandidate.id:x.riderId,status:'reserved',assignmentState:'reassigned'}:x),riders:kind==='rider'&&riderCandidate?prev.riders.map(x=>x.id===r.id?{...x,assignedQuantity:Math.max(0,x.assignedQuantity-d.quantity),status:'Unresponsive'}:x.id===riderCandidate.id?{...x,assignedQuantity:x.assignedQuantity+d.quantity,status:'Assigned'}:x):prev.riders}));
      log(`Delivery ${d.id} diverted to ${target.name}${kind==='rider'&&riderCandidate?` with ${riderCandidate.name}`:''}`,'delivery');notify(`Feasible reroute found: ${target.name}.`);
    } else {setDialog('warning');notify('No safe reroute currently meets need, compatibility and capacity.');}
  };
  const updateRole=(role:string)=>{patch({role});notify(`Demo view switched to ${role}.`);};
  const resetDemo=()=>{if(!window.confirm('Reset all AidFlow demo data to its starting state?'))return;localStorage.removeItem(STORAGE);setStore(initial);notify('Demo data restored.');setPath('/dashboard')};
  const incomingFor=(sid:string)=>getIncoming(sid);
  const zones=shelters.map(s=>({...s,zone:zoneFor(s,incomingFor(s.id))}));
  const redZones=zones.filter(s=>s.zone==='RED'&&s.available);
  const filtered=<T extends object,>(list:T[]):T[]=>list.filter(x=>{
    const q=search.toLowerCase();const text=Object.values(x).flatMap(value=>Array.isArray(value)?value:[value]).join(' ').toLowerCase();
    const item=x as T&{status?:string;zone?:string};
    return (!q||text.includes(q))&&(filter==='All'||item.status===filter||item.zone===filter)
  });
  const activeDonations=store.donations.filter(d=>d.status==='available'&&d.quantity>0);
  const activeDeliveries=store.deliveries.filter(d=>d.status!=='delivered'&&d.status!=='cancelled');

  return <div className="app-shell">
    {path!=='/'&&<aside className={`sidebar ${mobileOpen?'open':''}`}>
      <div style={{display:'flex',alignItems:'center',gap:11,padding:'0 9px',marginBottom:37}}>
        <div className="brand-mark"><Leaf size={20}/></div><div><div style={{fontWeight:800,fontSize:18,letterSpacing:'-.04em'}}>AidFlow</div><div className="eyebrow" style={{fontSize:9}}>Food, in good hands</div></div>
        <button aria-label="Close menu" className="btn btn-quiet mobile-menu" style={{marginLeft:'auto',padding:7}} onClick={()=>setMobileOpen(false)}><X size={17}/></button>
      </div>
      <div className="eyebrow" style={{padding:'0 12px',marginBottom:10}}>Workspace</div>
      <nav style={{display:'grid',gap:5}}>{navigation.map(([href,label,Icon])=><Link key={href} href={href} className={`nav-link ${path===href?'active':''}`} onClick={()=>setMobileOpen(false)}><Icon size={17}/><span>{label}</span></Link>)}</nav>
      <div style={{marginTop:'auto'}}>
        <div className="panel" style={{padding:14,background:'linear-gradient(145deg,hsl(var(--card)),hsl(var(--secondary)/.7))'}}>
          <div style={{display:'flex',gap:9,alignItems:'center',marginBottom:7}}><ShieldCheck size={17} color="hsl(var(--primary))"/><span style={{fontSize:12,fontWeight:700}}>Safety checks on</span></div>
          <div style={{fontSize:11,color:'hsl(var(--muted-foreground))',lineHeight:1.55}}>Every dispatch checks freshness, fit and remaining capacity.</div>
        </div>
        <button className="btn btn-quiet" style={{width:'100%',justifyContent:'flex-start',marginTop:14,fontSize:12}} onClick={resetDemo}><RotateCcw size={15}/> Reset demo data</button>
        <div style={{padding:'12px 12px 0',fontSize:10,color:'hsl(var(--muted-foreground))'}}>AidFlow · Community pilot</div>
      </div>
    </aside>}
    <main className={path==='/'?'':'main-area'}>
      {path!=='/'&&<header className="topbar">
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <button className="btn btn-secondary mobile-menu" aria-label="Open menu" onClick={()=>setMobileOpen(true)}><Menu size={17}/></button>
          <label style={{position:'relative',display:'block',width:'min(280px,35vw)'}}><Search size={16} style={{position:'absolute',left:12,top:12,color:'hsl(var(--muted-foreground))'}}/><input aria-label="Search operations" data-testid="input-operation-search" className="field" style={{paddingLeft:36,background:'hsl(var(--card)/.72)'}} placeholder="Search your operation…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
          <select aria-label="Filter operations" className="field" style={{width:102,padding:'10px 9px',fontSize:12}} value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>available</option><option>reserved</option><option>RED</option><option>GREEN</option><option>YELLOW</option></select>
        </div>
        <div style={{display:'flex',gap:9,alignItems:'center'}}>
          <label className="eyebrow" style={{display:'flex',alignItems:'center',gap:7}}>Viewing as <select aria-label="Switch demo role" className="field" style={{width:132,padding:'9px 10px',fontSize:12,fontWeight:700}} value={store.role} onChange={e=>updateRole(e.target.value)}>{['Operations','Donor','Rider','Shelter'].map(r=><option key={r}>{r}</option>)}</select></label>
          <button className="btn btn-secondary" aria-label="Toggle theme" onClick={()=>patch({theme:store.theme==='dark'?'light':'dark'})} style={{padding:10}}>{store.theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button>
          <div style={{position:'relative'}}><button className="btn btn-secondary" aria-label="Notifications" onClick={()=>setNotificationOpen(!notificationOpen)} style={{padding:10,position:'relative'}}><Bell size={17}/><span style={{position:'absolute',right:7,top:7,width:6,height:6,borderRadius:'50%',background:'#d88760'}}/></button>{notificationOpen&&<div className="panel" style={{position:'absolute',right:0,top:48,width:260,zIndex:30,padding:15}}><div style={{fontWeight:700,fontSize:13,marginBottom:8}}>Needs your attention</div><p style={{fontSize:12,color:'hsl(var(--muted-foreground))',margin:'0 0 9px'}}>Harbor House is in a high-need zone.</p><p style={{fontSize:12,color:'hsl(var(--muted-foreground))',margin:0}}>One delivery is currently in transit.</p></div>}</div>
        </div>
      </header>}
      <Switch>
        <Route path="/"><Landing onLaunch={()=>setPath('/dashboard')} listings={store.donations.length} shelters={store.shelters.length} active={activeDeliveries.length} incoming={store.deliveries.filter(d=>d.assignmentState!=='offered'&&d.status!=='delivered'&&d.status!=='cancelled').reduce((n,d)=>n+d.quantity,0)}/></Route>
        <Route path="/dashboard"><Dashboard role={store.role} donations={activeDonations} shelters={zones} deliveries={activeDeliveries} riders={store.riders} redZones={redZones} onOpenDispatch={()=>setDialog('dispatch')} onAccept={acceptDelivery} onAdvance={advanceDelivery} /></Route>
        <Route path="/donors"><Donors role={store.role} donations={filtered(store.donations)} shelters={redZones} riders={store.riders} onCreate={()=>setDialog('donation')} onDispatch={()=>setDialog('dispatch')} /></Route>
        <Route path="/riders"><Riders role={store.role} riders={filtered(store.riders)} deliveries={store.deliveries} onAdd={()=>setDialog('rider')} onSimulate={simulateRider} onAccept={acceptDelivery} /></Route>
        <Route path="/shelters"><Shelters role={store.role} shelters={filtered(zones)} incoming={incomingFor} onEdit={setShelterDraft} onToggle={s=>{setStore(prev=>({...prev,shelters:prev.shelters.map(x=>x.id===s.id?{...x,available:!x.available}:x)}));log(`${s.name} ${s.available?'temporarily closed':'reopened'}`,'shelter');notify(s.available?'Shelter closed for dispatch.':'Shelter reopened.')}} /></Route>
        <Route path="/deliveries"><Deliveries role={store.role} deliveries={filtered(activeDeliveries.map(d=>({...d,name:shelterName(d.shelterId),status:d.status})))} raw={store.deliveries} donations={store.donations} shelters={shelters} riders={store.riders} onDispatch={()=>setDialog('dispatch')} onAccept={acceptDelivery} onAdvance={advanceDelivery} onDisrupt={handleDisruption} onReassign={d=>handleDisruption(d,'rider')} /></Route>
        <Route path="/activity"><ActivityPage items={filtered(store.activity.map(a=>({...a,name:a.text})))} raw={store.activity} /></Route>
        <Route component={()=><NotFound onHome={()=>setPath('/dashboard')}/>} />
      </Switch>
      {dialog==='donation'&&<DonationModal onClose={()=>setDialog('')} onSave={addDonation}/>}
      {dialog==='rider'&&<RiderModal onClose={()=>setDialog('')} onSave={addRider}/>}
      {dialog==='dispatch'&&<DispatchModal donations={activeDonations} shelters={zones} riders={store.riders} onClose={()=>setDialog('')} onDispatch={dispatch}/>}
      {dialog==='warning'&&<Modal title="No safe reroute found" onClose={()=>setDialog('')}><div className="notice">This delivery cannot be safely reassigned right now. Check rider capacity, shelter availability, food compatibility and remaining need before trying again.</div><div style={{display:'flex',justifyContent:'flex-end',marginTop:20}}><button className="btn btn-primary" onClick={()=>setDialog('')}>Understood</button></div></Modal>}
      {shelterDraft&&<ShelterModal shelter={shelterDraft} onClose={()=>setShelterDraft(null)} onSave={saveShelter}/>}
    </main>
    {toast&&<div className="toast-stack"><div className="toast-item" role="status">{toast}</div></div>}
  </div>;
}

function PageHead({eyebrow,title,description,action}:{eyebrow:string;title:string;description:string;action?:ReactNode}) {
  return <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:18,marginBottom:26}} className="enter"><div><div className="eyebrow" style={{marginBottom:9}}>{eyebrow}</div><h1 className="page-title">{title}</h1><p style={{margin:'9px 0 0',fontSize:14,color:'hsl(var(--muted-foreground))'}}>{description}</p></div>{action}</div>
}
function Landing({onLaunch}:{onLaunch:()=>void}) {
  return <div style={{minHeight:'100dvh',background:'linear-gradient(135deg,#f3f2e8 0%,#eff3e8 48%,#e5efe5 100%)',overflow:'hidden'}}>
    <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'25px clamp(22px,7vw,110px)'}}><div style={{display:'flex',alignItems:'center',gap:10}}><div className="brand-mark"><Leaf size={20}/></div><b style={{fontSize:19,letterSpacing:'-.04em'}}>AidFlow</b></div><button className="btn btn-primary" onClick={onLaunch}>Launch Dashboard <ArrowRight size={16}/></button></header>
    <section className="landing-hero" style={{position:'relative',padding:'clamp(45px,9vh,102px) clamp(22px,11vw,170px) 70px',minHeight:'74vh',display:'grid',gridTemplateColumns:'minmax(0,1.05fr) minmax(290px,.95fr)',alignItems:'center',gap:35}}>
      <div className="enter" style={{position:'relative',zIndex:2}}><div className="badge badge-green" style={{marginBottom:23}}><span style={{width:7,height:7,borderRadius:'50%',background:'#4f8a64'}}/> COMMUNITY FOOD, MOVING</div><h1 className="serif" style={{fontSize:'clamp(51px,7.7vw,98px)',lineHeight:.98,letterSpacing:'-.065em',fontWeight:600,maxWidth:780,margin:'0 0 25px'}}>Good Food Deserves a <span style={{color:'#477756'}}>Destination.</span></h1><p style={{fontSize:'clamp(16px,1.6vw,19px)',lineHeight:1.7,color:'#64746a',maxWidth:470,margin:'0 0 30px'}}>Connect surplus food to the people who need it — before time runs out.</p><button className="btn btn-primary" style={{padding:'14px 20px',fontSize:14}} onClick={onLaunch}>Launch Dashboard <ArrowRight size={17}/></button><div style={{display:'flex',gap:20,marginTop:33,flexWrap:'wrap'}}>{[['18','community partners'],['4.8k','meals redirected'],['24 min','typical pickup']].map(([n,l])=><div key={l}><div className="serif" style={{fontSize:24,fontWeight:600,color:'#355d43'}}>{n}</div><div style={{fontSize:11,color:'#78837a'}}>{l}</div></div>)}</div></div>
      <div style={{position:'relative',minHeight:420,display:'grid',placeItems:'center'}}><div style={{position:'absolute',width:'min(35vw,430px)',height:'min(35vw,430px)',minWidth:280,minHeight:280,borderRadius:'50%',background:'radial-gradient(circle at 37% 31%,#f8f2d9,#dce9d8 64%,#c5d9c7)',boxShadow:'inset 20px 16px 40px #ffffff85,0 25px 65px #4c70512a'}}/><div style={{position:'relative',width:'min(100%,425px)',padding:24,background:'#ffffffa8',backdropFilter:'blur(18px)',border:'1px solid #ffffffc9',borderRadius:28,boxShadow:'0 25px 70px #304b3323',transform:'rotate(-2deg)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><div><div className="eyebrow">TODAY · LIVE SNAPSHOT</div><div className="serif" style={{fontSize:24,marginTop:4}}>A little goes a long way</div></div><div className="badge badge-green">Live</div></div><div className="map-visual" style={{height:215,borderRadius:20}}><span className="zone-dot red" style={{left:'25%',top:'32%'}}/><span className="zone-dot green" style={{left:'66%',top:'27%'}}/><span className="zone-dot yellow" style={{left:'52%',top:'68%'}}/><span className="zone-dot red" style={{left:'78%',top:'66%'}}/><div style={{position:'absolute',left:'31%',top:'26%',padding:'5px 8px',borderRadius:9,background:'#ffffffdc',fontSize:10,fontWeight:700}}>Harbor House</div></div><div style={{display:'flex',justifyContent:'space-between',paddingTop:18}}><div><div className="eyebrow">NEEDS MATCHED</div><b style={{fontSize:19}}>86 portions</b></div><div><div className="eyebrow">ON THE MOVE</div><b style={{fontSize:19}}>12 deliveries</b></div><div style={{alignSelf:'center',width:43,height:43,borderRadius:14,display:'grid',placeItems:'center',background:'#e5efe5',color:'#41694c'}}><HeartHandshake size={21}/></div></div></div><div style={{position:'absolute',right:0,top:20,padding:'12px 15px',background:'#f5e8d8',borderRadius:15,boxShadow:'0 10px 25px #493b2b1a',fontSize:12,fontWeight:700,transform:'rotate(4deg)'}}>Fresh food, right on time</div></div>
    </section>
    <section style={{padding:'54px clamp(22px,11vw,170px) 70px',background:'#e9efe5'}}><div className="eyebrow">BUILT FOR THE LAST MILE</div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:30,marginTop:22}}>{[['01','See the need','Current stock and incoming deliveries shape every shelter priority.'],['02','Move with confidence','Capacity, compatibility and food deadlines are checked before dispatch.'],['03','Close the loop','Every completed handoff updates shelter stock and the next best match.']].map(([n,t,d])=><div key={n} style={{borderTop:'1px solid #bdcabb',paddingTop:15}}><div className="eyebrow">{n}</div><h2 className="serif" style={{fontSize:25,margin:'10px 0 7px'}}>{t}</h2><p style={{color:'#69766b',lineHeight:1.7,fontSize:13,maxWidth:310}}>{d}</p></div>)}</div></section>
    <footer style={{padding:'28px clamp(22px,7vw,110px)',display:'flex',justifyContent:'space-between',gap:14,color:'#758076',fontSize:12}}><span>© AidFlow Community Network</span><span>Simulated locations and travel times for demo use.</span></footer>
  </div>;
}
function Stat({label,value,detail,icon:Icon,tone='green'}:{label:string;value:string|number;detail:string;icon:typeof Leaf;tone?:string}) {
  return <div className="panel panel-hover" style={{padding:'18px 19px',minHeight:132,position:'relative',overflow:'hidden'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}><div><div className="eyebrow">{label}</div><div className="serif" style={{fontSize:33,fontWeight:600,letterSpacing:'-.04em',marginTop:9}}>{value}</div></div><div style={{width:37,height:37,borderRadius:12,display:'grid',placeItems:'center',background:tone==='peach'?'hsl(var(--accent))':'hsl(var(--secondary))',color:tone==='peach'?'#9a6040':'hsl(var(--primary))'}}><Icon size={18}/></div></div><div style={{fontSize:11,color:'hsl(var(--muted-foreground))',marginTop:5}}>{detail}</div></div>
}
function Dashboard({role,donations,shelters,deliveries,riders,redZones,onOpenDispatch,onAccept,onAdvance}:{role:string;donations:Donation[];shelters:Shelter[];deliveries:Delivery[];riders:Rider[];redZones:Shelter[];onOpenDispatch:()=>void;onAccept:(d:Delivery)=>void;onAdvance:(d:Delivery)=>void}) {
 const canOperate=role==='Operations',canRide=canOperate||role==='Rider';
 return <><PageHead eyebrow="Tuesday, community network" title="Good morning, team." description="Here’s what needs moving across the network today." action={<button className="btn btn-primary" onClick={onOpenDispatch} disabled={!canOperate} title={!canOperate?'Switch to Operations role':''}><Zap size={16}/> Start a dispatch</button>}/>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:13,marginBottom:22}}><Stat label="Food ready to move" value={donations.reduce((n,d)=>n+d.quantity,0)} detail="across available donations" icon={Package}/><Stat label="High-need shelters" value={redZones.length.toString().padStart(2,'0')} detail="require a timely match" icon={HeartHandshake} tone="peach"/><Stat label="Active deliveries" value={deliveries.length.toString().padStart(2,'0')} detail="riders on the road" icon={Truck}/><Stat label="Riders available" value={riders.filter(r=>r.availability).length} detail="capacity ready for dispatch" icon={Bike}/></div>
  <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.42fr) minmax(275px,.8fr)',gap:17,marginBottom:18}}>
   <section className="panel" style={{padding:20}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><div><div className="eyebrow">SIMULATED ZONE VIEW</div><h2 className="serif" style={{fontSize:23,margin:'5px 0 0'}}>Need, at a glance</h2></div><span className="badge badge-muted"><MapPin size={12}/> Simulated map</span></div><ZoneMap shelters={shelters}/><div style={{display:'flex',gap:16,marginTop:13,flexWrap:'wrap'}}>{[['red','High need'],['yellow','Watch'],['green','Covered']].map(([c,l])=><span key={l} style={{display:'inline-flex',alignItems:'center',gap:7,fontSize:11,color:'hsl(var(--muted-foreground))'}}><span className={`zone-dot ${c}`} style={{position:'static',border:0,width:8,height:8}}/>{l}</span>)}<span style={{marginLeft:'auto',fontSize:10,color:'hsl(var(--muted-foreground))'}}>Locations & travel times simulated</span></div></section>
   <section className="panel" style={{padding:20}}><div className="eyebrow">PRIORITY QUEUE</div><h2 className="serif" style={{fontSize:23,margin:'5px 0 15px'}}>Needs attention</h2>{redZones.length?redZones.slice(0,3).map(s=><div key={s.id} style={{padding:'12px 0',borderTop:'1px solid hsl(var(--border))',display:'flex',alignItems:'center',gap:10}}><span className="zone-dot red" style={{position:'static',border:0}}/><div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{s.name}</div><div style={{fontSize:11,color:'hsl(var(--muted-foreground))'}}>{Math.max(0,s.demand-s.stock)} portions unmet</div></div><span className="badge badge-red">{s.zone}</span></div>):<div className="notice" style={{fontSize:12}}>All open shelters are currently covered. Nice work.</div>}<div style={{marginTop:14}}><button className="btn btn-secondary" style={{width:'100%'}} onClick={onOpenDispatch}>Match food to need <ArrowRight size={15}/></button></div></section>
  </div>
   <section className="panel" style={{padding:'19px 20px',marginBottom:18}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}><div><div className="eyebrow">LIVE BOARD</div><h2 className="serif" style={{fontSize:22,margin:'5px 0 0'}}>On the move</h2></div><Link href="/deliveries" style={{fontSize:12,color:'hsl(var(--primary))',fontWeight:700,textDecoration:'none'}}>View dispatch board →</Link></div>{deliveries.length?deliveries.slice(0,3).map(d=><div key={d.id} style={{display:'flex',alignItems:'center',gap:13,borderTop:'1px solid hsl(var(--border))',padding:'13px 0',flexWrap:'wrap'}}><div style={{width:36,height:36,borderRadius:12,background:'hsl(var(--secondary))',display:'grid',placeItems:'center',color:'hsl(var(--primary))'}}><Truck size={17}/></div><div style={{flex:1,minWidth:160}}><b style={{fontSize:13}}>{d.quantity} portions → {shelters.find(s=>s.id===d.shelterId)?.name||'Shelter'}</b><div style={{fontSize:11,color:'hsl(var(--muted-foreground))'}}>Simulated ETA {d.etaMinutes} min · {d.status}</div></div>{d.assignmentState==='offered'?<button className="btn btn-secondary" disabled={!canRide} onClick={()=>onAccept(d)}>Accept offer</button>:d.status!=='delivered'&&<button className="btn btn-secondary" disabled={!canRide} onClick={()=>onAdvance(d)}>{d.status==='in transit'?'Complete handoff':'Update status'}</button>}</div>):<div style={{padding:'22px 0',color:'hsl(var(--muted-foreground))',fontSize:13}}>No active deliveries. Food is waiting to find its destination.</div>}</section>
  <div className="notice" style={{display:'flex',gap:12,alignItems:'center'}}><ShieldCheck size={20}/><div style={{fontSize:12,lineHeight:1.6}}><b>Safety is built into dispatch.</b> Every match checks donor deadline, shelter requirements and the rider’s remaining load.</div></div>
 </>;
}
function ZoneMap({shelters}:{shelters:Shelter[]}) {
 const positions=[[18,29],[66,24],[50,69],[78,66]];
 return <div className="map-visual" style={{height:250,borderRadius:16}}>{shelters.map((s,i)=>{const [x,y]=positions[i%positions.length];return <div key={s.id} style={{position:'absolute',left:`${x}%`,top:`${y}%`,display:'flex',alignItems:'center',gap:7,zIndex:2}}><span className={`zone-dot ${s.zone.toLowerCase()}`} style={{position:'static'}}/><span style={{background:'hsl(var(--card)/.88)',padding:'5px 8px',borderRadius:8,fontSize:10,fontWeight:700,boxShadow:'0 2px 8px #33443112'}}>{s.name}</span></div>})}<div style={{position:'absolute',right:14,bottom:12,fontSize:10,color:'hsl(var(--muted-foreground))'}}>Neighborhood zones · travel times simulated</div></div>;
}
function Donors({role,donations,shelters,riders,onCreate,onDispatch}:{role:string;donations:Donation[];shelters:Shelter[];riders:Rider[];onCreate:()=>void;onDispatch:()=>void}) {
 const canManage=role==='Operations'||role==='Donor',canDispatch=role==='Operations';
 return <><PageHead eyebrow="Donor network" title="Food worth sharing." description="Manage surplus listings and find the right shelter while it’s still fresh." action={<button className="btn btn-primary" onClick={onCreate} disabled={!canManage} title={!canManage?'Switch to Donor or Operations role':''}><Plus size={16}/> List a donation</button>}/>
 <div className="notice" style={{display:'flex',alignItems:'center',gap:11,marginBottom:18}}><ShieldCheck size={19}/><span style={{fontSize:12}}><b>Freshness check is active.</b> Dispatch recommendations must arrive before each listing’s deadline.</span></div>
 <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.5fr) minmax(245px,.7fr)',gap:17,alignItems:'start'}}>
   <section className="panel" style={{padding:'4px 17px'}}><div className="table-wrap"><table className="table"><thead><tr><th>Donation</th><th>Quantity</th><th>Food window</th><th>Status</th><th></th></tr></thead><tbody>{donations.map(d=><tr key={d.id}><td><b>{d.food}</b><div style={{fontSize:11,color:'hsl(var(--muted-foreground))'}}>{d.donorName} · {d.pickupLocation}</div></td><td>{d.quantity} {d.unit}</td><td><span style={{display:'inline-flex',gap:5,alignItems:'center'}}><Clock3 size={13}/>{minsLeft(d.deadline)} min</span></td><td><span className={`badge ${d.status==='available'?'badge-green':'badge-yellow'}`}>{d.status}</span></td><td><button className="btn btn-secondary" style={{padding:'8px 10px',fontSize:11}} onClick={onDispatch} disabled={!canDispatch||d.status!=='available'||d.quantity<=0} title={!canDispatch?'Switch to Operations role':''}>Match</button></td></tr>)}</tbody></table></div>{donations.length===0&&<Empty title="No food listings yet" detail="Add a donation to start matching fresh food with local needs." action={onCreate} actionText="List a donation"/>}</section>
   <section className="panel" style={{padding:19}}><div className="eyebrow">RECOMMENDED DESTINATIONS</div><h2 className="serif" style={{fontSize:22,margin:'5px 0 15px'}}>High need, nearby</h2>{shelters.length?shelters.map(s=><div key={s.id} style={{padding:'11px 0',borderTop:'1px solid hsl(var(--border))'}}><div style={{display:'flex',justifyContent:'space-between',gap:7}}><b style={{fontSize:13}}>{s.name}</b><span className="badge badge-red">RED</span></div><div style={{fontSize:11,color:'hsl(var(--muted-foreground))',marginTop:4}}>{Math.max(0,s.demand-s.stock)} portions unmet · {s.location}</div></div>):<div style={{fontSize:12,color:'hsl(var(--muted-foreground))',lineHeight:1.6}}>No red-zone shelters right now. Need reflects usable stock and confirmed incoming food.</div>}<div style={{borderTop:'1px solid hsl(var(--border))',paddingTop:13,marginTop:9,fontSize:11,color:'hsl(var(--muted-foreground))'}}>{riders.filter(r=>r.availability).length} riders available for simulated pickup routes.</div><button className="btn btn-primary" style={{width:'100%',marginTop:14}} disabled={!canDispatch} onClick={onDispatch}>Create a match <ArrowRight size={15}/></button></section>
 </div></>;
}
function Riders({role,riders,deliveries,onAdd,onSimulate,onAccept}:{role:string;riders:Rider[];deliveries:Delivery[];onAdd:()=>void;onSimulate:(id:string)=>void;onAccept:(d:Delivery)=>void}) {
 const canOperate=role==='Operations';const canRide=canOperate||role==='Rider';
 return <><PageHead eyebrow="Volunteer network" title="Ready to ride." description="See who’s available, how much they can carry and what needs a handoff." action={<button className="btn btn-primary" onClick={onAdd} disabled={!canOperate} title={!canOperate?'Switch to Operations role':''}><Plus size={16}/> Add rider</button>}/>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14}}>{riders.map(r=><article className="panel panel-hover" key={r.id} style={{padding:20}}><div style={{display:'flex',alignItems:'center',gap:12}}><div style={{width:43,height:43,borderRadius:15,background:'hsl(var(--secondary))',display:'grid',placeItems:'center',fontWeight:700,color:'hsl(var(--primary))'}}>{r.name.split(' ').map(w=>w[0]).join('')}</div><div style={{flex:1}}><b style={{fontSize:14}}>{r.name}</b><div style={{fontSize:11,color:'hsl(var(--muted-foreground))'}}>{r.status}</div></div><span className={`badge ${r.availability?'badge-green':'badge-muted'}`}>{r.availability?'Available':'Off duty'}</span></div><div style={{marginTop:22,display:'flex',justifyContent:'space-between',fontSize:11,color:'hsl(var(--muted-foreground))'}}><span>Load capacity</span><b style={{color:'hsl(var(--foreground))'}}>{r.assignedQuantity} / {r.capacity} units</b></div><div style={{height:7,background:'hsl(var(--muted))',borderRadius:9,marginTop:8,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(100,r.assignedQuantity/r.capacity*100)}%`,background:'hsl(var(--primary))',borderRadius:9}}/></div><div style={{fontSize:11,marginTop:13,color:'hsl(var(--muted-foreground))'}}>Remaining: {Math.max(0,r.capacity-r.assignedQuantity)} units</div><div style={{display:'flex',gap:8,marginTop:17}}><button className="btn btn-secondary" style={{flex:1}} onClick={()=>onSimulate(r.id)} disabled={!r.availability}>Simulate unresponsive</button><button className="btn btn-quiet" onClick={()=>onSimulate(r.id)} aria-label={`Mark ${r.name} unresponsive`}><CircleHelp size={16}/></button></div></article>)}</div>
  <section className="panel" style={{marginTop:18,padding:20}}><div className="eyebrow">OPEN OFFERS</div><h2 className="serif" style={{fontSize:22,margin:'5px 0 12px'}}>Waiting on a rider</h2>{deliveries.filter(d=>d.assignmentState==='offered').length?deliveries.filter(d=>d.assignmentState==='offered').map(d=><div key={d.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,borderTop:'1px solid hsl(var(--border))',padding:'13px 0'}}><div><b style={{fontSize:13}}>{d.quantity} units · {d.id}</b><div style={{fontSize:11,color:'hsl(var(--muted-foreground))'}}>Simulated travel {d.etaMinutes} min</div></div><button className="btn btn-primary" disabled={!canRide} title={!canRide?'Switch to Rider or Operations role':''} onClick={()=>onAccept(d)}><Check size={15}/> Accept offer</button></div>):<div style={{fontSize:12,color:'hsl(var(--muted-foreground))',padding:'10px 0'}}>No offers waiting for acceptance.</div>}</section>
 </>;
}
function Shelters({role,shelters,incoming,onEdit,onToggle}:{role:string;shelters:Shelter[];incoming:(id:string)=>number;onEdit:(s:Shelter)=>void;onToggle:(s:Shelter)=>void}) {
 const canEdit=role==='Operations'||role==='Shelter';
 return <><PageHead eyebrow="Community partners" title="Know what’s needed." description="Shelter stock and open needs determine which food moves next."/>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:15}}>{shelters.map(s=>{const uncovered=Math.max(0,s.demand-s.stock-incoming(s.id));const coverage=Math.min(100,Math.round((s.stock+incoming(s.id))/Math.max(1,s.demand)*100));return <article key={s.id} className="panel panel-hover" style={{padding:20}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}><div><div className="eyebrow">{s.zone} ZONE · {s.location}</div><h2 className="serif" style={{fontSize:23,margin:'6px 0 0'}}>{s.name}</h2></div><span className={`badge ${s.zone==='RED'?'badge-red':s.zone==='GREEN'?'badge-green':'badge-yellow'}`}>{s.zone}</span></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:20}}>{[['Need',s.demand],['Usable stock',s.stock],['Incoming',incoming(s.id)]].map(([l,v])=><div key={l} style={{background:'hsl(var(--muted)/.65)',borderRadius:12,padding:10}}><div className="eyebrow" style={{fontSize:9}}>{l}</div><b style={{fontSize:19}}>{v}</b></div>)}</div><div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginTop:17}}><span>Coverage</span><b>{coverage}% · {uncovered} unmet</b></div><div style={{height:7,background:'hsl(var(--muted))',borderRadius:9,marginTop:7,overflow:'hidden'}}><div style={{height:'100%',width:`${coverage}%`,background:s.zone==='RED'?'#ca705a':s.zone==='GREEN'?'#5e936b':'#d0a64b'}}/></div><div className="eyebrow" style={{marginTop:17}}>CURRENT REQUIREMENTS</div><div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:7}}>{s.requirements.map(r=><span key={r} className="badge badge-muted">{r}</span>)}</div><div style={{display:'flex',justifyContent:'space-between',marginTop:18,paddingTop:13,borderTop:'1px solid hsl(var(--border))'}}><button className="btn btn-secondary" disabled={!canEdit} title={!canEdit?'Switch to Shelter or Operations role':''} onClick={()=>onEdit(s)}>Edit needs & stock</button><button className={`btn ${s.available?'btn-quiet':'btn-primary'}`} disabled={!canEdit} title={!canEdit?'Switch to Shelter or Operations role':''} onClick={()=>onToggle(s)}>{s.available?'Close shelter':'Reopen'}</button></div>{!s.available&&<div style={{marginTop:10,fontSize:11,color:'#b36b56'}}>Closed to incoming deliveries</div>}</article>})}</div></>;
}
function Deliveries({role,deliveries,raw,donations,shelters,riders,onDispatch,onAccept,onAdvance,onDisrupt,onReassign}:{role:string;deliveries:{name?:string;status?:string;id:string}[];raw:Delivery[];donations:Donation[];shelters:Shelter[];riders:Rider[];onDispatch:()=>void;onAccept:(d:Delivery)=>void;onAdvance:(d:Delivery)=>void;onDisrupt:(d:Delivery,k:'rider'|'closure')=>void;onReassign:(d:Delivery)=>void}) {
 const canOperate=role==='Operations', canRide=canOperate||role==='Rider';
 const rows=deliveries.map(x=>raw.find(d=>d.id===x.id)).filter((x):x is Delivery=>!!x);
 const statusLabel=(status:string)=>status==='available'?'Offer pending':status==='reserved'?'Accepted':status;
 return <><PageHead eyebrow="Last-mile dispatch" title="Every handoff, accounted for." description="Track assignments from offer through delivery. Locations and travel times are simulated." action={<button className="btn btn-primary" onClick={onDispatch} disabled={!canOperate} title={!canOperate?'Switch to Operations role':''}><Plus size={16}/> New dispatch</button>}/>
 <div className="notice" style={{display:'flex',gap:10,alignItems:'center',marginBottom:18}}><ShieldCheck size={18}/><div style={{fontSize:12}}><b>Safe dispatch rules:</b> deadline before arrival · remaining rider capacity · open shelter · compatible food · unmet need.</div></div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,marginBottom:18}}>{[['OFFERS',raw.filter(d=>d.assignmentState==='offered').length],['ACCEPTED / MOVING',raw.filter(d=>['reserved','picked up','in transit'].includes(d.status)).length],['COMPLETED',raw.filter(d=>d.status==='delivered').length]].map(([l,v])=><div key={l} className="panel" style={{padding:15}}><div className="eyebrow">{l}</div><div className="serif" style={{fontSize:28,marginTop:4}}>{v}</div></div>)}</div>
  <div style={{display:'grid',gap:12}}>{rows.map(d=>{const donation=donations.find(x=>x.id===d.donationId),shelter=shelters.find(x=>x.id===d.shelterId),rider=riders.find(x=>x.id===d.riderId);return <article key={d.id} className="panel" style={{padding:18}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}><div style={{display:'flex',gap:12,alignItems:'center'}}><div style={{width:40,height:40,borderRadius:13,display:'grid',placeItems:'center',background:'hsl(var(--secondary))',color:'hsl(var(--primary))'}}><Truck size={18}/></div><div><div className="eyebrow">{d.id} · {donation?.food||'Food donation'}</div><h3 style={{fontSize:15,margin:'5px 0 0'}}>{d.quantity} units to {shelter?.name||'Shelter'}</h3></div></div><span className={`badge ${d.status==='in transit'?'badge-yellow':d.status==='delivered'?'badge-green':'badge-muted'}`}>{statusLabel(d.status)}</span></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(125px,1fr))',gap:12,margin:'17px 0',padding:'13px 0',borderTop:'1px solid hsl(var(--border))',borderBottom:'1px solid hsl(var(--border))'}}><Info label="Rider" value={rider?.name||'Unassigned'}/><Info label="Shelter status" value={shelter?.available?'Open':'Closed'}/><Info label="Simulated ETA" value={`${d.etaMinutes} min`}/><Info label="Food deadline" value={donation?`${minsLeft(donation.deadline)} min`:'—'}/></div><div style={{display:'flex',gap:7,flexWrap:'wrap'}}>{d.assignmentState==='offered'?<button className="btn btn-primary" disabled={!canRide} onClick={()=>onAccept(d)}><Check size={15}/> Rider accepts</button>:d.status!=='delivered'&&<button className="btn btn-primary" disabled={!canRide} onClick={()=>onAdvance(d)}>{d.status==='in transit'?'Complete safe handoff':'Advance: '+(d.status==='reserved'?'picked up':'in transit')} <ArrowRight size={14}/></button>}{d.status==='in transit'&&canOperate&&<><button className="btn btn-secondary" onClick={()=>onDisrupt(d,'rider')}>Simulate rider unresponsive</button><button className="btn btn-secondary" onClick={()=>onDisrupt(d,'closure')}>Simulate shelter closure</button><button className="btn btn-secondary" onClick={()=>onReassign(d)}>Find new rider</button></>}{d.status==='delivered'&&<span className="badge badge-green"><Check size={12}/> Shelter stock reconciled</span>}</div></article>})}{rows.length===0&&<Empty title="No active deliveries" detail="When food is matched to a rider, the handoff will appear here." action={canOperate?onDispatch:undefined} actionText="Start a dispatch"/>}</div></>;
}
function Info({label,value}:{label:string;value:string}){return <div><div className="eyebrow" style={{fontSize:9}}>{label}</div><div style={{fontSize:12,fontWeight:600,marginTop:5}}>{value}</div></div>}
function ActivityPage({items,raw}:{items:{name?:string;id:string}[];raw:EventItem[]}) {
 const rows=items.map(x=>raw.find(a=>a.id===x.id)).filter((x):x is EventItem=>!!x);
 const icon=(kind:string)=>kind==='delivery'?Truck:kind==='donation'?Package:kind==='warning'?CircleHelp:kind==='shelter'?HeartHandshake:ActivityIcon;
 return <><PageHead eyebrow="Network history" title="Small acts add up." description="A shared record of food, people and handoffs across the community."/><section className="panel" style={{padding:'8px 22px'}}>{rows.map((item,i)=>{const Icon=icon(item.kind);return <div key={item.id} style={{display:'flex',gap:14,padding:'17px 0',borderBottom:i===rows.length-1?'none':'1px solid hsl(var(--border))'}}><div style={{width:36,height:36,flexShrink:0,borderRadius:12,display:'grid',placeItems:'center',background:item.kind==='warning'?'hsl(var(--accent))':'hsl(var(--secondary))',color:'hsl(var(--primary))'}}><Icon size={16}/></div><div style={{flex:1}}><div style={{fontSize:13,lineHeight:1.5}}>{item.text}</div><div style={{fontSize:11,color:'hsl(var(--muted-foreground))',marginTop:5}}>{new Date(item.timestamp).toLocaleDateString([], {month:'short',day:'numeric'})} · {fmtTime(item.timestamp)}</div></div><span className={`badge ${item.kind==='warning'?'badge-yellow':'badge-muted'}`}>{item.kind}</span></div>})}{rows.length===0&&<div style={{padding:20}}>No activity matches your search.</div>}</section></>;
}
function Empty({title,detail,action,actionText}:{title:string;detail:string;action?:()=>void;actionText?:string}){return <div style={{textAlign:'center',padding:'38px 20px'}}><div style={{width:48,height:48,margin:'0 auto 12px',borderRadius:17,background:'hsl(var(--secondary))',display:'grid',placeItems:'center',color:'hsl(var(--primary))'}}><Boxes size={21}/></div><b style={{fontSize:14}}>{title}</b><p style={{fontSize:12,color:'hsl(var(--muted-foreground))',maxWidth:310,margin:'7px auto 15px',lineHeight:1.6}}>{detail}</p>{action&&<button className="btn btn-primary" onClick={action}>{actionText}</button>}</div>}
function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}><div><div className="eyebrow">AIDFLOW WORKSPACE</div><h2 className="serif" style={{fontSize:27,margin:'5px 0 0'}}>{title}</h2></div><button aria-label="Close dialog" className="btn btn-quiet" style={{padding:7}} onClick={onClose}><X size={18}/></button></div>{children}</section></div>}
function DonationModal({onClose,onSave}:{onClose:()=>void;onSave:(d:Omit<Donation,'id'|'status'|'compatibleNeeds'>)=>void}) {
 const [form,setForm]=useState({donorName:'',food:'',category:'Produce',quantity:'',unit:'portions',pickupLocation:'',minutes:'90'});
 const field=(key:keyof typeof form,label:string,type='text')=><label style={{display:'grid',gap:6,fontSize:11,fontWeight:700,color:'hsl(var(--muted-foreground))'}}>{label}<input required className="field" type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>;
 return <Modal title="List surplus food" onClose={onClose}><form onSubmit={e=>{e.preventDefault();onSave({donorName:form.donorName,food:form.food,category:form.category,quantity:Number(form.quantity),unit:form.unit,pickupLocation:form.pickupLocation,deadline:new Date(Date.now()+Number(form.minutes)*60000).toISOString()})}}><div style={{display:'grid',gap:13}}>{field('donorName','Donor or business')}{field('food','Food description')}<label style={{display:'grid',gap:6,fontSize:11,fontWeight:700,color:'hsl(var(--muted-foreground))'}}>Food category<select className="field" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['Produce','Bakery','Prepared meals','Dairy','Staples'].map(x=><option key={x}>{x}</option>)}</select></label><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>{field('quantity','Quantity','number')}{field('unit','Unit')}</div>{field('pickupLocation','Pickup location')}{field('minutes','Freshness window (minutes)','number')}</div><div className="notice" style={{marginTop:15,fontSize:11}}>Deadline is calculated from listing time. Simulated route arrival must be earlier.</div><div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:20}}><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary"><Plus size={15}/> Add listing</button></div></form></Modal>;
}
function RiderModal({onClose,onSave}:{onClose:()=>void;onSave:(name:string,capacity:number)=>void}) {
 const [name,setName]=useState('');const [capacity,setCapacity]=useState('24');
 return <Modal title="Add a rider" onClose={onClose}><form onSubmit={e=>{e.preventDefault();onSave(name,Number(capacity))}}><div style={{display:'grid',gap:13}}><label style={{display:'grid',gap:6,fontSize:11,fontWeight:700}}>Rider name<input className="field" required value={name} onChange={e=>setName(e.target.value)}/></label><label style={{display:'grid',gap:6,fontSize:11,fontWeight:700}}>Carrying capacity (units)<input className="field" type="number" min="1" required value={capacity} onChange={e=>setCapacity(e.target.value)}/></label></div><div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:22}}><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Add to network</button></div></form></Modal>;
}
function ShelterModal({shelter,onClose,onSave}:{shelter:Shelter;onClose:()=>void;onSave:(s:Shelter)=>void}) {
 const [draft,setDraft]=useState({...shelter,requirements:shelter.requirements.join(', ')});
 return <Modal title="Update shelter" onClose={onClose}><form onSubmit={e=>{e.preventDefault();onSave({...draft, demand:Number(draft.demand),stock:Number(draft.stock),requirements:draft.requirements.split(',').map(x=>x.trim()).filter(Boolean)})}}><div style={{display:'grid',gap:13}}><Field label="Shelter name" value={draft.name} onChange={v=>setDraft({...draft,name:v})}/><Field label="Location" value={draft.location} onChange={v=>setDraft({...draft,location:v})}/><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><Field label="Current demand" type="number" value={String(draft.demand)} onChange={v=>setDraft({...draft,demand:Number(v)})}/><Field label="Usable stock" type="number" value={String(draft.stock)} onChange={v=>setDraft({...draft,stock:Number(v)})}/></div><Field label="Food requirements (comma separated)" value={draft.requirements} onChange={v=>setDraft({...draft,requirements:v})}/><label style={{display:'flex',alignItems:'center',gap:9,fontSize:12}}><input type="checkbox" checked={draft.available} onChange={e=>setDraft({...draft,available:e.target.checked})}/> Available to receive deliveries</label></div><div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:22}}><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save shelter</button></div></form></Modal>;
}
function Field({label,value,onChange,type='text'}:{label:string;value:string;onChange:(v:string)=>void;type?:string}){return <label style={{display:'grid',gap:6,fontSize:11,fontWeight:700}}>{label}<input className="field" type={type} value={value} onChange={e=>onChange(e.target.value)}/></label>}
function DispatchModal({donations,shelters,riders,onClose,onDispatch}:{donations:Donation[];shelters:Shelter[];riders:Rider[];onClose:()=>void;onDispatch:(d:Donation,s:Shelter,r:Rider,q:number,eta:number)=>void}) {
 const [donationId,setDonationId]=useState(donations[0]?.id||'');const donation=donations.find(d=>d.id===donationId);
 const compatibleShelters=shelters.filter(s=>s.available&&donation&&s.requirements.some(r=>donation.compatibleNeeds.includes(r)||r===donation.category));
 const recommended=[...compatibleShelters].sort((a,b)=>(a.zone==='RED'?-1:0)-(b.zone==='RED'?-1:0));
 const [shelterId,setShelterId]=useState('');const [riderId,setRiderId]=useState('');const [quantity,setQuantity]=useState('');const [eta,setEta]=useState('18');
 useEffect(()=>{setShelterId(recommended[0]?.id||'');setQuantity(donation?.quantity?String(Math.min(donation.quantity,12)):'')},[donationId]);
 const currentShelter=shelters.find(s=>s.id===shelterId);const availableRiders=riders.filter(r=>r.availability&&r.status!=='Unresponsive');
 const enough=!!currentShelter&&Math.max(0,currentShelter.demand-currentShelter.stock)>0;
 return <Modal title="Build a safe match" onClose={onClose}><form onSubmit={e=>{e.preventDefault();const d=donations.find(x=>x.id===donationId),s=shelters.find(x=>x.id===shelterId),r=riders.find(x=>x.id===riderId);if(d&&s&&r)onDispatch(d,s,r,Number(quantity),Number(eta))}}>
  <div style={{display:'grid',gap:13}}><label style={{display:'grid',gap:6,fontSize:11,fontWeight:700}}>Food to move<select className="field" value={donationId} onChange={e=>setDonationId(e.target.value)}>{donations.map(d=><option key={d.id} value={d.id}>{d.food} · {d.quantity} {d.unit} remaining</option>)}</select></label>
  {donation&&<div style={{fontSize:11,color:'hsl(var(--muted-foreground))'}}>From {donation.donorName} · pickup at {donation.pickupLocation} · freshness window {minsLeft(donation.deadline)} min</div>}
  <label style={{display:'grid',gap:6,fontSize:11,fontWeight:700}}>Shelter destination<select className="field" value={shelterId} onChange={e=>setShelterId(e.target.value)}>{recommended.map(s=><option key={s.id} value={s.id}>{s.zone==='RED'?'Priority · ':''}{s.name} · {Math.max(0,s.demand-s.stock)} unmet</option>)}</select></label>
  {currentShelter&&<div className={`notice`} style={{fontSize:11}}>{currentShelter.zone==='RED'?'Recommended: high unmet need.':currentShelter.zone==='GREEN'?'Caution: shelter is sufficiently supplied.':'Moderate need; confirm the portion count.'} Stock {currentShelter.stock} + incoming is considered for current zone.</div>}
  <label style={{display:'grid',gap:6,fontSize:11,fontWeight:700}}>Rider<select className="field" value={riderId} onChange={e=>setRiderId(e.target.value)}><option value="">Choose a rider</option>{availableRiders.map(r=><option key={r.id} value={r.id}>{r.name} · {Math.max(0,r.capacity-r.assignedQuantity)} units free</option>)}</select></label>
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><label style={{display:'grid',gap:6,fontSize:11,fontWeight:700}}>Portions / units<input className="field" type="number" min="1" max={donation?.quantity} value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label style={{display:'grid',gap:6,fontSize:11,fontWeight:700}}>Simulated travel (min)<input className="field" type="number" min="1" value={eta} onChange={e=>setEta(e.target.value)}/></label></div>
  {currentShelter&&!enough&&<div className="notice" style={{fontSize:11}}>This shelter has no unmet need remaining. Dispatch will be blocked.</div>}
  <div style={{fontSize:10,color:'hsl(var(--muted-foreground))'}}>One match reserves this quantity. Repeat the flow to split a donation across feasible shelters and riders.</div></div>
  <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:20}}><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={!donation||!currentShelter||!riderId||!quantity}>Send rider offer <ArrowRight size={15}/></button></div>
 </form></Modal>;
}
function NotFound({onHome}:{onHome:()=>void}){return <div style={{padding:'10vh 20px',textAlign:'center'}}><div className="eyebrow">PAGE NOT FOUND</div><h1 className="page-title" style={{margin:'12px 0'}}>Let’s get you back on track.</h1><button className="btn btn-primary" onClick={onHome}>Go to operations</button></div>}
function App(){return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}><AidFlow/></WouterRouter>}
export default App;

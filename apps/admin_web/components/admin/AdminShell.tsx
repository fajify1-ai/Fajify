'use client';
import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {
 Activity,
 ArrowUpRight,
 Bell,
 Building2,
 ChevronDown,
 CircleHelp,
 Command,
 CreditCard,
 LayoutDashboard,
 LockKeyhole,
 LogOut,
 Menu,
 Moon,
 Search,
 Settings2,
 ShieldCheck,
 Sun,
 TriangleAlert,
 UserPlus,
 Users,
 X
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {authClient} from '@faji/web-auth/client';
import {toast} from 'sonner';
import {Button} from '../ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '../ui/dialog';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuTrigger} from '../ui/dropdown-menu';
import {Input} from '../ui/input';
import {cn} from '../../lib/cn';
import type {AdminView,Application,Payment} from './types';

type NavigationItem={id:AdminView;label:string;icon:LucideIcon;available:boolean};

const navigation:{label:string;items:NavigationItem[]}[]=[
 {label:'Overview',items:[{id:'overview',label:'Overview',icon:LayoutDashboard,available:true}]},
 {label:'Operations',items:[
  {id:'applications',label:'Business approvals',icon:Building2,available:true},
  {id:'payments',label:'Finance simulations',icon:CreditCard,available:true},
  {id:'waitlist',label:'Waitlist signups',icon:UserPlus,available:true},
  {id:'reviews',label:'Review moderation',icon:ShieldCheck,available:true},
  {id:'restrictions',label:'Marketplace restrictions',icon:LockKeyhole,available:true},
  {id:'support',label:'Support cases',icon:CircleHelp,available:true},
  {id:'incidents',label:'Incident register',icon:TriangleAlert,available:true},
  {id:'monitoring',label:'Monitoring',icon:Activity,available:true}
 ]},
 {label:'Platform',items:[
  {id:'customers',label:'Customer activity',icon:Users,available:true},
  {id:'businesses',label:'Business reports',icon:Building2,available:true},
  {id:'rides',label:'Ride reporting',icon:Activity,available:true},
  {id:'reports',label:'Platform reports',icon:ArrowUpRight,available:true},
  {id:'integrations',label:'Data consistency',icon:ShieldCheck,available:true},
  {id:'audit',label:'Audit history',icon:LockKeyhole,available:true}
 ]},
 {label:'Workspace',items:[{id:'settings',label:'Platform settings',icon:Settings2,available:false}]}
];

const viewCopy:Record<AdminView,{title:string;description:string}>={
 overview:{title:'Platform overview',description:'A clear view of the operational queues that need attention.'},
 applications:{title:'Business approvals',description:'Review submitted business applications and record an approval decision.'},
 payments:{title:'Finance simulations',description:'Review pending test payments. These controls never move real money.'},
 waitlist:{title:'Waitlist signups',description:'Review consented early-access signups. Contact data is limited to authorized administrators.'},
 reviews:{title:'Review moderation',description:'Moderate customer reviews using audited governance actions.'},
 restrictions:{title:'Marketplace restrictions',description:'Restrict or restore branches and catalogue entries with a recorded reason.'},
 support:{title:'Support cases',description:'Review customer support cases and record scoped, audited actions.'},
 incidents:{title:'Incident register',description:'Track platform incidents using API-enforced state transitions.'},
 monitoring:{title:'Monitoring',description:'Review database-derived platform health signals and alerts.'},
 customers:{title:'Customer activity',description:'Look up customer activity; each inspection is recorded in the audit history.'},
 businesses:{title:'Business reports',description:'Retrieve a verified business report by business ID.'},
 rides:{title:'Ride reporting',description:'View ride counts and verified ride totals from platform reporting.'},
 reports:{title:'Platform reports',description:'View persisted platform activity and verified finance totals.'},
 audit:{title:'Audit history',description:'Review security events and audited privileged commands.'},
 integrations:{title:'Data consistency',description:'Inspect read-only cross-domain consistency checks.'},
 settings:{title:'Platform settings',description:'Global settings do not have a connected administration API yet.'}
};

function initials(){
 return 'FA';
}

export function AdminShell({
 activeView,
 onNavigate,
 applications,
 applicationsMore,
 payments,
 paymentsMore,
 onInspectApplication,
 children
}:{
 activeView:AdminView;
 onNavigate:(view:AdminView)=>void;
 applications:Application[];
 applicationsMore:boolean;
 payments:Payment[];
 paymentsMore:boolean;
 onInspectApplication:(application:Application)=>void;
 children:ReactNode;
}){
 const [collapsed,setCollapsed]=useState(false);
 const [mobileOpen,setMobileOpen]=useState(false);
 const [searchOpen,setSearchOpen]=useState(false);
 const [query,setQuery]=useState('');
 const [theme,setTheme]=useState<'light'|'dark'>('light');
 const [signingOut,setSigningOut]=useState(false);
 const page=viewCopy[activeView];
 const navMatches=useMemo(()=>navigation.flatMap(group=>group.items).filter(item=>item.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),[query]);
 const applicationMatches=useMemo(()=>query.trim()?applications.filter(item=>item.displayName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())||item.id.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0,5):[],[applications,query]);
 const paymentMatches=useMemo(()=>query.trim()?payments.filter(item=>item.id.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0,5):[],[payments,query]);
 const pendingCount=applications.length+payments.length;
 const morePending=applicationsMore||paymentsMore;

 useEffect(()=>{
  const savedTheme=localStorage.getItem('fajify-admin-theme');
  const nextTheme=savedTheme==='dark'?'dark':'light';
  setTheme(nextTheme);
  document.documentElement.dataset.theme=nextTheme;
  setCollapsed(localStorage.getItem('fajify-admin-sidebar')==='collapsed');
  const onShortcut=(event:KeyboardEvent)=>{
   if((event.metaKey||event.ctrlKey)&&event.key.toLocaleLowerCase()==='k'){
    event.preventDefault();
    setSearchOpen(value=>!value);
   }
  };
  window.addEventListener('keydown',onShortcut);
  return ()=>window.removeEventListener('keydown',onShortcut);
 },[]);

 function navigate(view:AdminView){
  onNavigate(view);
  setMobileOpen(false);
  setSearchOpen(false);
  setQuery('');
 }

 function toggleTheme(){
  const nextTheme=theme==='light'?'dark':'light';
  setTheme(nextTheme);
  document.documentElement.dataset.theme=nextTheme;
  localStorage.setItem('fajify-admin-theme',nextTheme);
 }

 function toggleSidebar(){
  const nextCollapsed=!collapsed;
  setCollapsed(nextCollapsed);
  localStorage.setItem('fajify-admin-sidebar',nextCollapsed?'collapsed':'expanded');
 }

 async function signOut(){
  if(signingOut)return;
  setSigningOut(true);
  try{
   const result=await authClient.signOut();
   if(result.error)throw new Error('Sign out could not be completed.');
   window.location.assign('/login');
  }catch(error){
   toast.error(error instanceof Error?error.message:'Sign out could not be completed.');
   setSigningOut(false);
  }
 }

 function SidebarContents({mobile=false}:{mobile?:boolean}){
  const hideLabels=collapsed&&!mobile;
  return <>
   <div className={cn('flex h-[72px] items-center border-b',hideLabels?'justify-center px-2':'gap-3 px-5')}>
    {!hideLabels&&<div className="flex min-w-0 items-center gap-2">
     <Image className="h-auto w-[86px] shrink-0" src="/brand/fajify-logo-primary-horizontal.svg" alt="Fajify" width={86} height={32}/>
     <span className="text-[9px] font-semibold tracking-[.15em] text-muted-foreground">ADMIN</span>
    </div>}
    {hideLabels&&<Image className="h-auto w-10 shrink-0" src="/brand/fajify-logo-primary-horizontal.svg" alt="Fajify" width={40} height={15}/>}
    <Button className="ml-auto hidden lg:inline-flex" variant="ghost" size="icon-sm" aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} onClick={toggleSidebar}>
     <ChevronDown className={cn('size-4 transition-transform',collapsed?'-rotate-90':'rotate-90')}/>
    </Button>
    {!mobile&&<Button className="ml-auto lg:hidden" variant="ghost" size="icon-sm" aria-label="Close navigation" onClick={()=>setMobileOpen(false)}><X className="size-4"/></Button>}
   </div>
   <nav aria-label="Platform administration" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
    {navigation.map(group=><div key={group.label}>
     {!hideLabels&&<p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">{group.label}</p>}
     <div className="space-y-1">
      {group.items.map(item=>{
       const Icon=item.icon,active=activeView===item.id;
       return <button key={item.id} type="button" aria-current={active?'page':undefined} aria-label={hideLabels?item.label:undefined} title={hideLabels?item.label:undefined} onClick={()=>navigate(item.id)} className={cn('group flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition-colors',active?'bg-[var(--sidebar-active)] text-accent-foreground':'text-[var(--sidebar-foreground)] hover:bg-muted',!item.available&&!active&&'opacity-80')}>
        <Icon className={cn('size-[17px] shrink-0',active?'text-primary':'text-[var(--sidebar-muted)]')}/>
        {!hideLabels&&<><span className="min-w-0 flex-1 truncate">{item.label}</span>{!item.available&&<span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">Soon</span>}</>}
       </button>;
      })}
     </div>
    </div>)}
   </nav>
   {!hideLabels&&<div className="border-t p-4">
    <div className="flex gap-3 rounded-xl bg-muted/70 p-3">
     <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-card text-primary"><ShieldCheck className="size-4"/></span>
     <div className="min-w-0">
      <p className="text-xs font-semibold">Protected workspace</p>
      <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">Privileged actions require an authorized admin session.</p>
     </div>
    </div>
   </div>}
  </>;
 }

 return <div className={cn('admin-shell min-h-screen',collapsed&&'admin-shell-collapsed')}>
  <a href="#main-content" className="sr-only z-[100] rounded-md bg-card px-4 py-2 text-sm font-medium text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to main content</a>
  <aside className="admin-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-[var(--sidebar)] transition-[width] duration-200 lg:flex" data-collapsed={collapsed}>
   <SidebarContents/>
  </aside>
  <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
   <DialogContent className="left-0 top-0 flex h-dvh max-h-dvh w-[min(84vw,288px)] max-w-none translate-x-0 translate-y-0 flex-col rounded-none p-0">
    <DialogHeader className="sr-only"><DialogTitle>Platform administration navigation</DialogTitle><DialogDescription>Choose an admin workspace section.</DialogDescription></DialogHeader>
    <SidebarContents mobile/>
   </DialogContent>
  </Dialog>

  <div className="admin-main min-w-0">
   <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b bg-card/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Open navigation" className="lg:hidden" onClick={()=>setMobileOpen(true)}><Menu className="size-5"/></Button>
    <div className="hidden min-w-0 sm:block">
     <p className="truncate text-sm font-semibold">{page.title}</p>
     <p className="mt-0.5 text-xs text-muted-foreground">Fajify / Platform administration</p>
    </div>
    <Button type="button" variant="outline" className="ml-auto h-10 min-w-0 flex-1 justify-start gap-2 text-muted-foreground sm:ml-auto sm:max-w-[320px] lg:max-w-[400px]" onClick={()=>setSearchOpen(true)} aria-label="Search the admin workspace">
     <Search className="size-4 shrink-0"/>
     <span className="truncate text-sm">Search anything…</span>
     <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex"><Command className="mr-0.5 size-3"/>K</kbd>
    </Button>
    <Button type="button" variant="ghost" size="icon" aria-label={theme==='light'?'Switch to dark mode':'Switch to light mode'} onClick={toggleTheme} title={theme==='light'?'Switch to dark mode':'Switch to light mode'}>
     {theme==='light'?<Moon className="size-[18px]"/>:<Sun className="size-[18px]"/>}
    </Button>
    <DropdownMenu>
     <DropdownMenuTrigger asChild>
      <Button type="button" variant="ghost" size="icon" aria-label={`Notifications, ${morePending?'at least ':''}${pendingCount} items need attention`} className="relative">
       <Bell className="size-[18px]"/>
       {pendingCount>0&&<span className="absolute right-1 top-1 grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">{morePending?'9+':pendingCount>9?'9+':pendingCount}</span>}
      </Button>
     </DropdownMenuTrigger>
     <DropdownMenuContent align="end" className="w-[min(90vw,340px)]">
      <DropdownMenuLabel className="flex items-center justify-between"><span>Needs attention</span><BadgeCount count={pendingCount}/></DropdownMenuLabel>
      <DropdownMenuSeparator/>
      {applications.length>0&&<DropdownMenuItem onSelect={()=>navigate('applications')} className="items-start py-3">
       <Building2 className="mt-0.5 size-4 shrink-0 text-primary"/>
       <span><strong className="block font-medium">{queueCount(applications.length,applicationsMore)} business applications</strong><small className="mt-0.5 block text-muted-foreground">Open the review queue</small></span>
      </DropdownMenuItem>}
      {payments.length>0&&<DropdownMenuItem onSelect={()=>navigate('payments')} className="items-start py-3">
       <CreditCard className="mt-0.5 size-4 shrink-0 text-primary"/>
       <span><strong className="block font-medium">{queueCount(payments.length,paymentsMore)} simulated payments</strong><small className="mt-0.5 block text-muted-foreground">Open the finance queue</small></span>
      </DropdownMenuItem>}
      {!pendingCount&&<p className="px-3 py-5 text-center text-sm text-muted-foreground">No pending queue items are loaded.</p>}
     </DropdownMenuContent>
    </DropdownMenu>
    <DropdownMenu>
     <DropdownMenuTrigger asChild>
      <Button type="button" variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2" aria-label="Open administrator menu">
       <span className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{initials()}</span>
       <span className="hidden max-w-28 truncate text-left text-xs font-medium sm:block">Platform admin</span>
       <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block"/>
      </Button>
     </DropdownMenuTrigger>
     <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel><span className="block text-foreground">Platform administrator</span><span className="mt-1 block font-normal">Restricted operations access</span></DropdownMenuLabel>
      <DropdownMenuSeparator/>
      <DropdownMenuItem asChild><Link href="/account-security"><ShieldCheck className="size-4"/>Account security</Link></DropdownMenuItem>
      <DropdownMenuItem onSelect={()=>void signOut()} disabled={signingOut} className="text-destructive focus:text-destructive"><LogOut className="size-4"/>{signingOut?'Signing out…':'Sign out'}</DropdownMenuItem>
     </DropdownMenuContent>
    </DropdownMenu>
   </header>

   <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1600px] px-4 pb-12 pt-7 focus:outline-none sm:px-6 lg:px-8">
    <div className="mb-6 sm:hidden">
     <p className="text-sm font-semibold">{page.title}</p>
     <p className="mt-0.5 text-xs text-muted-foreground">Fajify / Platform administration</p>
    </div>
    <div className="mb-6 flex flex-col gap-1">
     <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{page.title}</h1>
     <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{page.description}</p>
    </div>
    {children}
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-xs text-muted-foreground">
     <span>Fajify Platform Administration</span>
     <Link href="/account-security" className="inline-flex items-center gap-1.5 rounded text-muted-foreground hover:text-foreground"><CircleHelp className="size-3.5"/>Security &amp; account settings</Link>
    </footer>
   </main>
  </div>

  <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
   <DialogContent className="top-[18vh] max-h-[70vh] max-w-xl translate-y-0 p-0" onOpenAutoFocus={event=>event.preventDefault()}>
    <DialogHeader className="sr-only"><DialogTitle>Search the admin workspace</DialogTitle><DialogDescription>Search platform navigation, business applications, and payment simulations.</DialogDescription></DialogHeader>
    <div className="flex items-center gap-3 border-b px-4 pr-12">
     <Search className="size-5 shrink-0 text-muted-foreground"/>
     <Input autoFocus aria-label="Search navigation and queue items" className="h-14 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0" placeholder="Search pages, applications, or payment IDs…" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Escape')setSearchOpen(false);if(event.key==='Enter'&&navMatches[0])navigate(navMatches[0].id);}}/>
     <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
    </div>
    <div className="max-h-[52vh] space-y-4 overflow-y-auto p-3">
     {!query.trim()?<p className="px-3 py-6 text-center text-sm text-muted-foreground">Start typing to search navigation and current queues.</p>:<>
      {!!navMatches.length&&<section aria-label="Navigation results">
       <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Pages</p>
       {navMatches.map(item=><button type="button" key={item.id} onClick={()=>navigate(item.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted">
        <item.icon className="size-4 text-muted-foreground"/><span className="flex-1">{item.label}</span>{!item.available&&<span className="text-xs text-muted-foreground">Coming soon</span>}
       </button>)}
      </section>}
      {!!applicationMatches.length&&<section aria-label="Business application results">
       <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Business applications</p>
       {applicationMatches.map(application=><button type="button" key={application.id} onClick={()=>{navigate('applications');onInspectApplication(application);}} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted">
        <Building2 className="size-4 text-muted-foreground"/><span className="min-w-0 flex-1 truncate">{application.displayName}</span><span className="max-w-32 truncate font-mono text-[10px] text-muted-foreground">{application.id}</span>
       </button>)}
      </section>}
      {!!paymentMatches.length&&<section aria-label="Payment simulation results">
       <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Payment simulations</p>
       {paymentMatches.map(payment=><button type="button" key={payment.id} onClick={()=>navigate('payments')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted">
        <CreditCard className="size-4 text-muted-foreground"/><span className="flex-1">Open simulation queue</span><span className="max-w-40 truncate font-mono text-[10px] text-muted-foreground">{payment.id}</span>
       </button>)}
      </section>}
      {!navMatches.length&&!applicationMatches.length&&!paymentMatches.length&&<p className="px-3 py-8 text-center text-sm text-muted-foreground">No results found in the current workspace.</p>}
     </>}
    </div>
    <div className="flex items-center gap-4 border-t px-4 py-2.5 text-[10px] text-muted-foreground"><span><kbd className="mr-1 rounded border px-1">↵</kbd>Open</span><span><kbd className="mr-1 rounded border px-1">⌘ K</kbd>Search</span><span className="ml-auto">Fajify Admin</span></div>
   </DialogContent>
  </Dialog>
 </div>;
}

function BadgeCount({count}:{count:number}){
 return <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 py-1 text-[10px] font-semibold text-accent-foreground">{count>99?'99+':count}</span>;
}

function queueCount(count:number,hasMore:boolean){
 return hasMore?`${count}+ pending`:`${count} pending`;
}

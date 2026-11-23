'use client';
import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {ArrowDown,ArrowUp,ArrowUpDown,ChevronLeft,ChevronRight,Download,Search,SlidersHorizontal} from 'lucide-react';
import {Badge} from '../ui/badge';
import {Button} from '../ui/button';
import {Checkbox} from '../ui/checkbox';
import {Input} from '../ui/input';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '../ui/table';
import {cn} from '../../lib/cn';

export type TableColumn<T>={
 id:string;
 header:string;
 cell:(row:T)=>ReactNode;
 sortValue?:(row:T)=>string|number;
 exportValue?:(row:T)=>string|number;
 className?:string;
};

type TableFilter<T>={
 label:string;
 options:{label:string;value:string}[];
 getValue:(row:T)=>string;
};

export function DataTable<T>({
 rows,
 columns,
 rowKey,
 searchText,
 emptyTitle,
 emptyDescription,
 actions,
 filter
}:{
 rows:T[];
 columns:TableColumn<T>[];
 rowKey:(row:T)=>string;
 searchText:(row:T)=>string;
 emptyTitle:string;
 emptyDescription:string;
 actions?:(row:T)=>ReactNode;
 filter?:TableFilter<T>;
}){
 const [query,setQuery]=useState('');
 const [filterValue,setFilterValue]=useState('all');
 const [sort,setSort]=useState<{id:string;direction:'asc'|'desc'}|null>(null);
 const [page,setPage]=useState(0);
 const [selected,setSelected]=useState<Set<string>>(()=>new Set());
 const pageSize=8;
 const filteredRows=useMemo(()=>{
  const search=query.trim().toLocaleLowerCase();
  const result=rows.filter(row=>(!search||searchText(row).toLocaleLowerCase().includes(search))&&(!filter||filterValue==='all'||filter.getValue(row)===filterValue));
  if(sort){
   const column=columns.find(item=>item.id===sort.id);
   if(column?.sortValue){
    result.sort((left,right)=>{
     const a=column.sortValue!(left),b=column.sortValue!(right);
     const comparison=typeof a==='number'&&typeof b==='number'?a-b:String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:'base'});
     return sort.direction==='asc'?comparison:-comparison;
    });
   }
  }
  return result;
 },[columns,filter,filterValue,query,rows,searchText,sort]);
 const pageCount=Math.max(1,Math.ceil(filteredRows.length/pageSize));
 const pageRows=filteredRows.slice(page*pageSize,(page+1)*pageSize);
 const pageIds=pageRows.map(rowKey);
 const allPageSelected=pageIds.length>0&&pageIds.every(id=>selected.has(id));
 const selectedRows=filteredRows.filter(row=>selected.has(rowKey(row)));

 useEffect(()=>{
  setPage(0);
  setSelected(new Set());
 },[filterValue,query]);
 useEffect(()=>{if(page>=pageCount)setPage(Math.max(0,pageCount-1));},[page,pageCount]);
 useEffect(()=>setSelected(current=>{
  const available=new Set(rows.map(rowKey));
  const next=new Set([...current].filter(id=>available.has(id)));
  return next.size===current.size?current:next;
 }),[rowKey,rows]);

 function togglePage(){
  setSelected(current=>{
   const next=new Set(current);
   if(allPageSelected)pageIds.forEach(id=>next.delete(id));
   else pageIds.forEach(id=>next.add(id));
   return next;
  });
 }

 function toggleRow(id:string){
  setSelected(current=>{
   const next=new Set(current);
   if(next.has(id))next.delete(id);else next.add(id);
   return next;
  });
 }

 function exportSelected(){
  const fields=columns.filter(column=>column.exportValue);
  if(!fields.length||!selectedRows.length)return;
  const encode=(value:string|number)=>`"${String(value).replaceAll('"','""')}"`;
  const contents=[fields.map(field=>encode(field.header)).join(','),...selectedRows.map(row=>fields.map(field=>encode(field.exportValue!(row))).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob([contents],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;
  link.download='fajify-admin-selection.csv';
  link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }

 return <div className="space-y-4">
  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
   <div className="flex flex-1 flex-wrap items-center gap-2">
    <label className="relative min-w-[220px] flex-1 lg:max-w-sm">
     <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
     <Input aria-label="Search table rows" className="pl-9" placeholder="Search this queue…" value={query} onChange={event=>setQuery(event.target.value)}/>
    </label>
    {filter&&<label className="relative flex items-center">
     <SlidersHorizontal aria-hidden="true" className="pointer-events-none absolute left-3 size-4 text-muted-foreground"/>
     <select aria-label={filter.label} className="h-10 min-w-36 appearance-none rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20" value={filterValue} onChange={event=>setFilterValue(event.target.value)}>
      <option value="all">All statuses</option>
      {filter.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
     </select>
    </label>}
   </div>
   <div className="flex min-h-9 items-center justify-between gap-3 lg:justify-end">
    <span className="text-sm text-muted-foreground" aria-live="polite">{selectedRows.length?`${selectedRows.length} selected`:`${filteredRows.length} results`}</span>
    <Button type="button" variant="outline" size="sm" disabled={!selectedRows.length} onClick={exportSelected}>
     <Download className="size-4"/><span>Export selected</span>
    </Button>
   </div>
  </div>

  {!filteredRows.length?<div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-card px-6 py-10 text-center">
   <div className="max-w-sm">
    <span className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground"><Search className="size-5"/></span>
    <h3 className="text-sm font-semibold">{query||filterValue!=='all'?'No matching records':emptyTitle}</h3>
    <p className="mt-1 text-sm leading-5 text-muted-foreground">{query||filterValue!=='all'?'Try changing your search or filter.':emptyDescription}</p>
   </div>
  </div>:<>
   <div className="rounded-xl border bg-card">
    <Table>
     <TableHeader>
      <TableRow className="hover:bg-transparent">
       <TableHead className="w-10 pl-4">
        <Checkbox aria-label={allPageSelected?'Clear selection on this page':'Select all rows on this page'} checked={allPageSelected} onChange={togglePage}/>
       </TableHead>
       {columns.map(column=><TableHead key={column.id} className={column.className} aria-sort={sort?.id===column.id?(sort.direction==='asc'?'ascending':'descending'):column.sortValue?'none':undefined}>
        {column.sortValue?<button type="button" className="inline-flex items-center gap-1.5 rounded-sm text-left hover:text-foreground" onClick={()=>setSort(current=>current?.id===column.id?{id:column.id,direction:current.direction==='asc'?'desc':'asc'}:{id:column.id,direction:'asc'})}>
         {column.header}
         {sort?.id===column.id?(sort.direction==='asc'?<ArrowUp className="size-3.5"/>:<ArrowDown className="size-3.5"/>):<ArrowUpDown className="size-3.5 opacity-50"/>}
        </button>:column.header}
       </TableHead>)}
       {actions&&<TableHead className="w-28 text-right">Actions</TableHead>}
      </TableRow>
     </TableHeader>
     <TableBody>
      {pageRows.map(row=>{
       const id=rowKey(row),checked=selected.has(id);
       return <TableRow key={id} data-state={checked?'selected':undefined}>
        <TableCell className="pl-4"><Checkbox aria-label={`Select row ${id}`} checked={checked} onChange={()=>toggleRow(id)}/></TableCell>
        {columns.map(column=><TableCell key={column.id} className={cn('max-w-[360px]',column.className)}>{column.cell(row)}</TableCell>)}
        {actions&&<TableCell className="text-right">{actions(row)}</TableCell>}
       </TableRow>;
      })}
     </TableBody>
    </Table>
   </div>
   <div className="flex flex-wrap items-center justify-between gap-3">
    <p className="text-xs text-muted-foreground">Showing {page*pageSize+1}–{Math.min((page+1)*pageSize,filteredRows.length)} of {filteredRows.length}</p>
    <div className="flex items-center gap-2">
     <span className="text-xs text-muted-foreground">Page {page+1} of {pageCount}</span>
     <Button type="button" variant="outline" size="icon-sm" aria-label="Previous page" disabled={page===0} onClick={()=>setPage(value=>Math.max(0,value-1))}><ChevronLeft className="size-4"/></Button>
     <Button type="button" variant="outline" size="icon-sm" aria-label="Next page" disabled={page+1>=pageCount} onClick={()=>setPage(value=>Math.min(pageCount-1,value+1))}><ChevronRight className="size-4"/></Button>
    </div>
   </div>
  </>}
 </div>;
}

export function StatusBadge({status}:{status:string}){
 const normalized=status.toLocaleLowerCase();
 const variant=normalized==='pending'||normalized==='queued'?'warning':normalized==='approved'||normalized==='succeeded'?'success':normalized==='rejected'||normalized==='failed'||normalized==='cancelled'?'destructive':'outline';
 return <Badge variant={variant}><span className="size-1.5 rounded-full bg-current"/>{status.replaceAll('_',' ')}</Badge>;
}

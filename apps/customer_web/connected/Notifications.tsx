"use client";
import {useState} from 'react';
import NotificationsScreen from '../webapp/screens/NotificationsScreen';
import type {NavigateFn} from '../webapp/App';
import {State,More,usePages,platform} from '@faji/web-ui/client';
import type {Schema} from '@faji/web-ui/types';
export default function Notifications({navigate}:{navigate:NavigateFn}){
 const resource=usePages<Schema<'NotificationPage'>>('customer/notifications');
 const [error,setError]=useState('');
 return <NotificationsScreen navigate={navigate} liveItems={(resource.data?.items??[]).map(item=>({id:item.id,title:item.title,body:`${item.resourceType} · ${item.status}`,time:new Date(item.createdAt).toLocaleString(),read:!!item.readAt}))} onRead={id=>{setError('');void platform(`customer/notifications/${id}/read`,{},'PUT').then(resource.reload).catch(e=>setError(e instanceof Error?e.message:'Unable to mark notification as read.'));}} status={<State loading={resource.loading} error={error||resource.error} empty={resource.data?.items.length===0} retry={resource.reload}/>} pagination={<More resource={resource}/>}/>;
}

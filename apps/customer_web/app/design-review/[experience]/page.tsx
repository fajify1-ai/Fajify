import {notFound} from 'next/navigation';
import Review from '../../../unified/Review';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{experience:string}>;searchParams:Promise<{screen?:string}>}){
 if(process.env.FAJI_DESIGN_REVIEW!=='1')notFound();
 const {experience}=await params;
 if(experience!=='customer'&&experience!=='business')notFound();
 const {screen}=await searchParams;
 return <Review business={experience==='business'} screen={screen??(experience==='business'?'dashboard':'landing')}/>;
}

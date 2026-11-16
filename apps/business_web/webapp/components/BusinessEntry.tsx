import FajifyLogo from './FajifyLogo';
import {Button} from '../../components/ui/button';
type Props={onSignIn:()=>void;onRegister:()=>void;onExplore:()=>void;onBack?:()=>void;preview?:boolean};
/** Original entry composition, shared by the retained reference and unified host. */
export default function BusinessEntry({onSignIn,onRegister,onExplore,onBack,preview=true}:Props){return <main className="business-entry min-h-screen grid lg:grid-cols-2 bg-white">
      <section className="flex flex-col justify-center gap-8 px-6 py-12 sm:px-12 lg:px-20">
        {onBack&&<button onClick={onBack} className="self-start text-sm font-semibold">← All experiences</button>}
        <FajifyLogo suffix="Business" />
        <div><h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">Your operation,<br/>clearly managed.</h1><p className="mt-5 text-base leading-7 text-[#777477]">Manage reservations, orders, availability, performance and payouts from one responsive workspace.</p></div>
        <div className="flex flex-wrap gap-3"><Button onClick={onSignIn}>Sign in to Business</Button><Button variant="outline" onClick={onRegister}>Register your business</Button></div>
        <Button variant="ghost" className="self-start" onClick={onExplore}>{preview?'Explore merchant demo →':'Business workspace →'}</Button>
      </section>
      <img src="/reference/d2aaaff55cdcccab.jpg" alt="Restaurant prepared for service" className="h-80 w-full object-cover lg:h-screen" />
    </main>;}

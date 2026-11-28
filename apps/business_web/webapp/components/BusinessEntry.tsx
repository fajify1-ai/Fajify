import FajifyLogo from './FajifyLogo';
import {Button} from '../../components/ui/button';
type Props={onSignIn:()=>void;onRegister:()=>void;onExplore:()=>void;onBack?:()=>void;preview?:boolean};
/** Original entry composition, shared by the retained reference and unified host. */
export default function BusinessEntry({onSignIn,onRegister,onExplore,onBack,preview=true}:Props){return <main className="business-entry min-h-screen grid lg:grid-cols-2 bg-white">
      <section className="flex flex-col justify-center gap-8 px-6 py-12 sm:px-12 lg:px-20">
        {onBack&&<button onClick={onBack} className="self-start text-sm font-semibold">← All experiences</button>}
        <FajifyLogo suffix="Business" compact />
        <div><h1 className="text-4xl font-black tracking-tight leading-tight">Your operation,<br/>clearly managed.</h1><p className="mt-5 text-sm leading-6 text-[#777477]">Manage reservations, orders, availability, performance and payouts from one responsive workspace.</p></div>
        <div className="flex flex-wrap gap-3"><Button size="sm" onClick={onSignIn}>Sign in to Business</Button><Button size="sm" variant="outline" onClick={onRegister}>Register your business</Button></div>
        <Button variant="ghost" className="self-start" onClick={onExplore}>{preview?'Explore merchant demo →':'Business workspace →'}</Button>
      </section>
      <img src="/reference/d2aaaff55cdcccab.jpg" alt="Restaurant prepared for service" className="h-80 w-full object-cover lg:h-screen" />
    </main>;}

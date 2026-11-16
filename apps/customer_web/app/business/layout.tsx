import type {ReactNode} from 'react';
/** CSS boundary only: keep the original merchant component geometry intact. */
export default function Layout({children}:{children:ReactNode}){return <div data-business-experience style={{display:'contents'}}>{children}</div>}

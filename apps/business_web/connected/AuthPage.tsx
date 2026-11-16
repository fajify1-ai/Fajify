import type { ReactNode } from 'react';
import { AuthForm } from '@faji/web-auth/form';
import FajifyLogo from '../webapp/components/FajifyLogo';
export function AuthPage({mode}:{mode:'login'|'register'|'recover'|'reset'|'phone'|'phone-reset'}) { return <AuthShell><AuthForm mode={mode}/></AuthShell> }
export function AuthShell({children}:{children:ReactNode}) { return <div className="auth-design"><div className="auth-art"><img src="/reference/d2aaaff55cdcccab.jpg" alt="Illustrative Fajify dining experience"/><p>We simplify the planning. You enjoy the moments.</p></div><section className="auth-body"><a href="/" aria-label="Fajify homepage"><FajifyLogo suffix="Business" /></a>{children}</section></div> }

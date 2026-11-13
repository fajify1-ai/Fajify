import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { config, operatorHome } from '../lib/config';
import { sessionCookie, sessions } from '../lib/session';

const messages: Record<string, string> = {
  expired: 'Your session expired. Sign in again with MFA to continue.',
  forbidden: 'Faji Admin requires a platform administrator account with recent MFA.',
  failed: 'Sign-in could not be completed. Start a new sign-in and complete the Keycloak prompts.',
  unavailable: 'The sign-in service is temporarily unavailable. Try again shortly.',
};

export default async function Page({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const auth = (await searchParams).auth;
  const store = await cookies();
  if (!auth && await sessions.get(store.get(sessionCookie)?.value)) redirect(operatorHome);
  let available = true;
  try {
    config();
  } catch {
    available = false;
  }

  return (
    <main className="signin" id="main">
      <div className="signin-panel">
        <h1>Sign in to Faji Admin</h1>
        <p>Use your operator account and complete multi-factor authentication to access the operations console.</p>
        {!available ? (
          <p role="alert">Admin sign-in is unavailable. Contact your deployment operator.</p>
        ) : (
          <>
            {typeof auth === 'string' && Object.hasOwn(messages, auth) && <p role="alert">{messages[auth]}</p>}
            <form action="/auth/login" method="post">
              <button className="primary">Sign in with Keycloak</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

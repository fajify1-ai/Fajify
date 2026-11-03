#!/usr/bin/env python3
"""Disposable, loopback-only infrastructure. No Tailscale mutation or existing volumes."""
import argparse
import json
import os
from pathlib import Path
import re
import secrets
import socket
import subprocess
import tempfile
import time
import urllib.request

REPO = Path(__file__).resolve().parents[2]
MARKER = 'fajify-device-acceptance-v1'


def run(args, **kw):
    return subprocess.run(args, check=True, **kw)


def port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')
    path.chmod(0o600)


def plan(host):
    if not re.fullmatch(r'[a-z0-9-]+\.[a-z0-9-]+\.ts\.net', host):
        raise ValueError('Use the Ubuntu node MagicDNS name (node.tailnet.ts.net)')
    origin = 'https://' + host
    ports = []
    while len(ports) < 4:
        candidate = port()
        if candidate not in ports:
            ports.append(candidate)
    suffix = secrets.token_hex(6)
    return {'marker': MARKER, 'project': 'faji-device-' + suffix, 'database': 'fajify_m2_test_device_' + suffix,
            'origin': origin, 'repo': str(REPO),
            'ports': dict(zip(['edge', 'admin', 'appdb', 'mail'], ports)),
            'passwords': {key: secrets.token_hex(24) for key in ['identity', 'app', 'runtime', 'admin']}}


def compose(c, state):
    p, pw = c['ports'], c['passwords']
    def postgres(image, password, db, network):
        return {'image': image, 'environment': {'POSTGRES_PASSWORD': password, 'POSTGRES_DB': db},
                'tmpfs': ['/var/lib/postgresql/data:rw,noexec,nosuid,size=1024m'],
                'networks': [network],
                'healthcheck': {'test': ['CMD-SHELL', 'pg_isready -U postgres'], 'interval': '3s', 'timeout': '3s', 'retries': 60}}
    appdb = postgres('postgis/postgis:16-3.5', pw['app'], c['database'], 'application')
    appdb['ports'] = [f"127.0.0.1:{p['appdb']}:5432"]
    return {'name': c['project'], 'services': {
        'identitydb': postgres('postgres:16-bookworm', pw['identity'], 'faji_device_identity', 'identity'),
        'appdb': appdb,
        'mail': {'image': 'axllent/mailpit:v1.27', 'networks': ['identity'],
                 'ports': [f"127.0.0.1:{p['mail']}:8025"]},
        'keycloak': {'image': 'quay.io/keycloak/keycloak:26.8.1',
                     'command': ['start', '--import-realm'],
                     'environment': {'KC_DB': 'postgres', 'KC_DB_URL': 'jdbc:postgresql://identitydb:5432/faji_device_identity',
                                     'KC_DB_USERNAME': 'postgres', 'KC_DB_PASSWORD': pw['identity'],
                                     'KC_BOOTSTRAP_ADMIN_USERNAME': 'device_admin', 'KC_BOOTSTRAP_ADMIN_PASSWORD': pw['admin'],
                                     'KC_HOSTNAME': c['origin'], 'KC_HTTP_ENABLED': 'true', 'KC_PROXY_HEADERS': 'xforwarded',
                                     'JAVA_OPTS_APPEND': '-Xms128m -Xmx512m'},
                     'depends_on': {'identitydb': {'condition': 'service_healthy'}},
                     'networks': ['identity'], 'ports': [f"127.0.0.1:{p['admin']}:8080"],
                     'volumes': [f'{state}/realm.json:/opt/keycloak/data/import/faji.json:ro']},
        'api': {'image': 'node:22-bookworm-slim', 'working_dir': '/repo/apps/api',
                'command': ['node', 'dist/main.js'], 'volumes': [f'{REPO}:/repo:ro'], 'networks': ['application'],
                'environment': {'NODE_ENV': 'test', 'PORT': '3001', 'LOG_LEVEL': 'error',
                    'FAJI_DATABASE_URL': f"postgresql://faji_device_runtime:{pw['runtime']}@appdb:5432/{c['database']}",
                    'KEYCLOAK_ISSUER': c['origin'] + '/realms/faji', 'KEYCLOAK_AUDIENCE': 'faji-api',
                    'REDIS_URL': 'redis://127.0.0.1:6379', 'S3_ENDPOINT': 'http://127.0.0.1:9000', 'S3_BUCKET': 'device-unused'},
                'depends_on': {'appdb': {'condition': 'service_healthy'}}, 'profiles': ['api']},
        'edge': {'image': 'nginx:1.28-alpine', 'networks': ['identity', 'application'],
                 'ports': [f"127.0.0.1:{p['edge']}:8080"],
                 'volumes': [f'{state}/nginx.conf:/etc/nginx/conf.d/default.conf:ro'], 'profiles': ['api']}
    }, 'networks': {'identity': {}, 'application': {}}}


def initialize(host):
    c = plan(host)
    state = Path(tempfile.mkdtemp(prefix='fajify-device-'))
    state.chmod(0o700)
    write(state / 'state.json', c)
    realm = json.loads((REPO / 'infrastructure/keycloak/realm-faji-m2.json').read_text())
    realm['sslRequired'] = 'external'
    realm['smtpServer'] = {'host': 'mail', 'port': '1025', 'from': 'no-reply@fajify.invalid',
                           'ssl': 'false', 'starttls': 'false', 'auth': 'false'}
    for client in realm['clients']:
        if client['clientId'] in ['faji-customer-mobile', 'faji-business-mobile']:
            client.setdefault('attributes', {})['post.logout.redirect.uris'] = client['redirectUris'][0]
    # Container runs as a non-root UID; directory 0700 keeps files host-private.
    write(state / 'realm.json', realm)
    (state / 'realm.json').chmod(0o644)
    write(state / 'compose.json', compose(c, state))
    (state / 'nginx.conf').write_text('''server {
 listen 8080;
 access_log off;
 error_log /dev/stderr crit;
 location /api/ { proxy_pass http://api:3001; }
 location /realms/faji/ {
   proxy_pass http://keycloak:8080;
   proxy_set_header Host HOSTNAME;
   proxy_set_header X-Forwarded-Host HOSTNAME;
   proxy_set_header X-Forwarded-Proto https;
   proxy_set_header X-Forwarded-Port 443;
   proxy_set_header X-Forwarded-For $remote_addr;
 }
 location /resources/ { proxy_pass http://keycloak:8080; }
 location / { return 404; }
}
'''.replace('HOSTNAME', host))
    (state / 'nginx.conf').chmod(0o644)
    write(state / 'customer.json', {
        'FAJI_CUSTOMER_NATIVE_AUTH_ENABLED': 'true', 'FAJI_CUSTOMER_OIDC_ISSUER': c['origin'] + '/realms/faji',
        'FAJI_CUSTOMER_API_ORIGIN': c['origin'], 'FAJI_CUSTOMER_OIDC_CLIENT_ID': 'faji-customer-mobile',
        'FAJI_CUSTOMER_OIDC_REDIRECT_URI': 'com.faji.customer:/oauth/callback',
        'FAJI_CUSTOMER_OIDC_POST_LOGOUT_REDIRECT_URI': 'com.faji.customer:/oauth/callback',
        'FAJI_CUSTOMER_OIDC_SCOPES': 'openid profile email'})
    write(state / 'business.json', {'APP_ENV': 'development', 'USE_MOCK_SERVICES': 'false',
        'OIDC_ISSUER': c['origin'] + '/realms/faji', 'API_BASE_URL': c['origin'],
        'OIDC_CLIENT_ID': 'faji-business-mobile', 'OIDC_REDIRECT_URI': 'com.faji.business:/oauth/callback'})
    print(state)


def load(state):
    state = state.resolve()
    if state.is_symlink() or state.stat().st_uid != os.getuid() or state.stat().st_mode & 0o077:
        raise ValueError('State directory must be owned by current user and mode 0700')
    c = json.loads((state / 'state.json').read_text())
    if c.get('marker') != MARKER or not re.fullmatch('faji-device-[a-f0-9]{12}', c.get('project', '')):
        raise ValueError('Not an acceptance state directory')
    if c['repo'] != str(REPO):
        raise ValueError('Use the same worktree that initialized this state')
    if c.get('database') != 'fajify_m2_test_device_' + c['project'].removeprefix('faji-device-'):
        raise ValueError('Unexpected disposable database name')
    # Refuse edited Compose input, including added volumes, ports or privileged services.
    if json.loads((state / 'compose.json').read_text()) != compose(c, state):
        raise ValueError('Compose configuration drift; initialize a new state')
    return c


def docker(state, c, *args, **kw):
    return run(['docker', 'compose', '-p', c['project'], '-f', str(state / 'compose.json'), *args], **kw)


def wait_http(url):
    for attempt in range(450):
        try:
            with urllib.request.urlopen(url, timeout=3) as response:
                if response.status == 200:
                    return
        except Exception:
            pass
        if attempt % 15 == 0:
            print('Waiting for disposable service...', flush=True)
        time.sleep(2)
    raise RuntimeError('Service not ready in 900 seconds; inspect local restricted logs')


def up(state, c):
    if (state / 'started').exists():
        raise ValueError('Already started; down and initialize a new state for a clean run')
    run(['docker', 'compose', 'version'], stdout=subprocess.DEVNULL)
    version = subprocess.check_output(['pnpm', '--version'], text=True).strip()
    if version != '9.15.9':
        raise ValueError('pnpm 9.15.9 required; use corepack enable && corepack prepare pnpm@9.15.9 --activate')
    (state / 'started').touch(mode=0o600)
    try:
        docker(state, c, 'up', '-d', '--wait', 'identitydb', 'appdb', 'mail', 'keycloak')
        wait_http(f"http://127.0.0.1:{c['ports']['admin']}/realms/faji/.well-known/openid-configuration")
        pw = c['passwords']
        # Input pipe keeps secrets out of argv and shell history. Fresh cluster only.
        docker(state, c, 'exec', '-T', 'appdb', 'psql', '-U', 'postgres', '-d', c['database'], '-v', 'ON_ERROR_STOP=1',
               input=f"CREATE ROLE faji_device_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '{pw['runtime']}';\nREVOKE CONNECT ON DATABASE {c['database']} FROM PUBLIC;\nGRANT CONNECT ON DATABASE {c['database']} TO faji_device_runtime;\nCOMMENT ON DATABASE {c['database']} IS 'fajify:m2:disposable';\n", text=True, stdout=subprocess.DEVNULL)
        env = {**os.environ, 'FAJI_DATABASE_URL': f"postgresql://postgres:{pw['app']}@127.0.0.1:{c['ports']['appdb']}/{c['database']}"}
        run(['pnpm', '--filter', '@faji/database', 'migrate'], cwd=REPO, env=env)
        docker(state, c, 'exec', '-T', 'appdb', 'psql', '-U', 'postgres', '-d', c['database'], '-v', 'ON_ERROR_STOP=1',
               input='REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO faji_device_runtime; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO faji_device_runtime; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO faji_device_runtime;', text=True, stdout=subprocess.DEVNULL)
        run(['node', str(REPO / 'tooling/device-acceptance/live.mjs'), 'seed', str(state)], cwd=REPO)
        docker(state, c, '--profile', 'api', 'up', '-d', 'api', 'edge')
        with (state / 'image-evidence.txt').open('w') as evidence:
            docker(state, c, '--profile', 'api', 'images', stdout=evidence)
        (state / 'image-evidence.txt').chmod(0o600)
        print('Loopback services ready. Private HTTPS is a separate explicit step:')
        print(f"python3 tooling/device-acceptance/harness.py serve --state {state}")
        print('Use only on a node with no existing Serve/Funnel config; see README. No private endpoint configured automatically.')
    except Exception:
        docker(state, c, '--profile', 'api', 'down', '--remove-orphans')
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['init', 'up', 'serve', 'database', 'down', 'check'])
    parser.add_argument('--hostname')
    parser.add_argument('--state', type=Path)
    args = parser.parse_args()
    if args.action == 'init':
        initialize(args.hostname or '')
        return
    if not args.state:
        parser.error('--state required')
    state = args.state.resolve()
    c = load(state)
    if args.action == 'up':
        if subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=REPO).strip():
            raise ValueError('Commit tracked changes before starting a reproducible run')
        write(state / 'source.json', {'commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip()})
        up(state, c)
    elif args.action == 'database':
        env = {**os.environ, 'FAJI_DISPOSABLE_DATABASE': c['database'],
               'FAJI_DATABASE_URL': f"postgresql://postgres:{c['passwords']['app']}@127.0.0.1:{c['ports']['appdb']}/{c['database']}",
               'FAJI_RUNTIME_DATABASE_URL': f"postgresql://faji_device_runtime:{c['passwords']['runtime']}@127.0.0.1:{c['ports']['appdb']}/{c['database']}"}
        run(['pnpm', '--filter', '@faji/api', 'test:database'], cwd=REPO, env=env)
        write(state / 'database-results.json', {'result': 'PASS', 'source': json.loads((state / 'source.json').read_text())['commit'], 'scope': 'API database suite; no device acceptance claimed'})
    elif args.action == 'serve':
        if not (state / 'started').exists():
            raise ValueError('Start this isolated project before configuring Serve')
        status = json.loads(subprocess.check_output(['tailscale', 'status', '--json']))
        if 'https://' + status['Self']['DNSName'].rstrip('.') != c['origin']:
            raise ValueError('State hostname must match this Tailscale node')
        existing = json.loads(subprocess.check_output(['tailscale', 'serve', 'status', '--json']))
        if existing:
            raise ValueError('Existing Serve/Funnel configuration; use a dedicated node, do not reset it')
        run(['tailscale', 'serve', '--bg', '--https=443', f"http://127.0.0.1:{c['ports']['edge']}"])
        current = json.loads(subprocess.check_output(['tailscale', 'serve', 'status', '--json']))
        if any(current.get('AllowFunnel', {}).values()):
            raise ValueError('Public Funnel prohibited')
        write(state / 'serve.json', current)
        print('Private HTTPS ready; only permitted tailnet peers can connect')
    elif args.action == 'down':
        if (state / 'serve.json').exists():
            current = json.loads(subprocess.check_output(['tailscale', 'serve', 'status', '--json']))
            if current != json.loads((state / 'serve.json').read_text()):
                raise ValueError('Serve config changed; inspect before cleanup, preserving other services')
            run(['tailscale', 'serve', '--https=443', 'off'])
            (state / 'serve.json').rename(state / 'serve-stopped.json')
        docker(state, c, '--profile', 'api', 'down', '--remove-orphans')
        print('Only this generated project stopped; tmpfs databases destroyed. State retained privately for evidence; generated credentials expire with these databases.')
    else:
        source = json.loads((state / 'source.json').read_text())['commit']
        if source != subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip() or subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=REPO).strip():
            raise ValueError('Source changed since startup; start a fresh run')
        current = json.loads(subprocess.check_output(['tailscale', 'serve', 'status', '--json']))
        if not (state / 'serve.json').exists() or current != json.loads((state / 'serve.json').read_text()) or any(current.get('AllowFunnel', {}).values()):
            raise ValueError('Expected private Serve configuration required')
        run(['node', str(REPO / 'tooling/device-acceptance/live.mjs'), 'check', str(state)], cwd=REPO)

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # External errors may include URLs/credentials; details stay out of terminal evidence.
        print('BLOCKED:', str(error) if isinstance(error, ValueError) else type(error).__name__ + ' (review prerequisites and restricted local logs)')
        raise SystemExit(1)

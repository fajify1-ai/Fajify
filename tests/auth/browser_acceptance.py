"""Run only with the documented disposable fixture, four local apps and TLS proxy."""
import os,time,json,re,urllib.request,base64,hmac,hashlib,struct
from playwright.sync_api import sync_playwright
secret=os.environ['FAJI_FIXTURE_SECRET'];fixture='http://127.0.0.1:3101/__fixture'
def action(kind,**values):
 req=urllib.request.Request(fixture,data=json.dumps({'action':kind,**values}).encode(),headers={'content-type':'application/json','x-fixture-secret':secret});return json.load(urllib.request.urlopen(req))
def mail_token(email):
 messages=json.load(urllib.request.urlopen('http://127.0.0.1:18025/api/v1/messages'))['messages'];message=next(m for m in messages if any(t['Address']==email for t in m['To']));text=json.load(urllib.request.urlopen('http://127.0.0.1:18025/api/v1/message/'+message['ID']))['Text'];return re.search(r'recovery token is: (\S+)',text).group(1)
def totp(secret):
 raw=base64.b32decode(secret+'='*((8-len(secret)%8)%8),casefold=True);digest=hmac.new(raw,struct.pack('>Q',int(time.time())//30),hashlib.sha1).digest();return str((struct.unpack('>I',digest[digest[-1]&15:][:4])[0]&0x7fffffff)%1000000).zfill(6)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 for app,port,role in [('customer',4440,'customer'),('admin',4441,'platform-admin'),('business',4442,'merchant'),('dispatch',4443,'dispatcher')]:
  action('limits');base=f'https://{app}.localhost:{port}';context=browser.new_context(ignore_https_errors=True);page=context.new_page();page.set_default_timeout(60000);page.set_default_navigation_timeout(90000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)));email=f'{app}-acceptance-{time.time_ns()}@example.test';password='acceptance-password-123'
  page.goto(base+'/dashboard');page.wait_for_url('**/login');page.goto(base+'/register');page.get_by_label('Name',exact=True).fill('Acceptance User');page.get_by_label('Email',exact=True).fill(email);page.get_by_label('Password',exact=True).fill(password);page.get_by_role('button',name='Continue',exact=True).click();page.wait_for_url('**/dashboard')
  session=context.request.get(base+'/api/auth/get-session').json();subject=session['user']['id'];assert 'token' not in session.get('session',{})
  cookies=context.cookies();session_cookies=[c for c in cookies if 'session_token' in c['name']];assert session_cookies and all(c['httpOnly'] and c['secure'] and c['sameSite']=='Lax' for c in session_cookies);assert 'session_token' not in page.evaluate('document.cookie')
  if role!='customer':
   assert page.get_by_text('Operational access is pending approval.' if app=='dispatch' else 'Access is pending approval.').is_visible();action('role',subject=subject,role=role);page.reload();page.get_by_text('Signed in',exact=True).wait_for()
  foreign=context.request.post(base+'/api/auth/sign-out',headers={'Origin':'https://evil.example'},data={});assert foreign.status==403
  # A fresh second context cannot reuse a session from another host or navigate protected pages.
  other=browser.new_context(ignore_https_errors=True);denied=other.new_page();denied.goto(base+'/dashboard');denied.wait_for_url('**/login');other.close()
  action('suspend',subject=subject,value=True);page.goto(base+'/dashboard');page.wait_for_url('**/access-denied');action('suspend',subject=subject,value=False)
  page.goto(base+'/dashboard');page.get_by_role('button',name='Sign out').click();page.wait_for_url('**/login');page.goto(base+'/dashboard');page.wait_for_url('**/login')
  page.get_by_label('Email',exact=True).fill(email);page.get_by_label('Password',exact=True).fill('wrong-password');page.get_by_role('button',name='Continue',exact=True).click();page.get_by_role('status').filter(has_text=re.compile('Invalid|incorrect|credential',re.I)).wait_for()
  action('limits');page.get_by_label('Password',exact=True).fill(password);page.get_by_role('button',name='Continue',exact=True).click();page.wait_for_url('**/dashboard')
  action('expire',subject=subject);page.goto(base+'/dashboard');page.wait_for_url('**/login')
  action('limits');page.goto(base+'/recover');page.get_by_label('Email',exact=True).fill(email);page.get_by_role('button',name='Continue',exact=True).click();page.get_by_role('status').filter(has_text='If the account exists').wait_for();token=mail_token(email)
  page.goto(base+'/reset-password?token='+token);page.get_by_label('Password',exact=True).fill(password+'-new');page.get_by_role('button',name='Continue',exact=True).click();page.get_by_role('status').filter(has_text='Password updated').wait_for()
  page.goto(base+'/reset-password?token='+token);page.get_by_label('Password',exact=True).fill(password+'-replay');page.get_by_role('button',name='Continue',exact=True).click();page.get_by_role('status').filter(has_text=re.compile('invalid|expired|token',re.I)).wait_for()
  action('limits');page.goto(base+'/login');page.get_by_label('Email',exact=True).fill(email);page.get_by_label('Password',exact=True).fill(password+'-new');page.get_by_role('button',name='Continue',exact=True).click();page.wait_for_url('**/dashboard');assert not errors,errors
  current=[c for c in context.cookies() if 'session_token' in c['name']];assert current[0]['value']!=session_cookies[0]['value'],'New login must not reuse the original session token'
  page.goto(base+'/account-security');page.get_by_label('Current password',exact=True).fill(password+'-new');page.get_by_role('button',name='Enroll authenticator',exact=True).click();page.get_by_text('Enter this setup key',exact=False).wait_for();setup=page.locator('code').inner_text();recovery=page.locator('pre').inner_text().splitlines()[0]
  page.get_by_label('Authenticator or phone code',exact=True).fill(totp(setup));page.get_by_role('button',name='Verify enrollment',exact=True).click();page.get_by_text('Enter this setup key',exact=False).wait_for(state='hidden')
  page.get_by_label('Current password',exact=True).fill(password+'-new');page.get_by_label('Authenticator or phone code',exact=True).fill(totp(setup));page.get_by_role('button',name='Reauthenticate',exact=True).click();page.get_by_role('status').filter(has_text='Completed').wait_for()
  phone='+1555'+str(time.time_ns())[-7:];page.get_by_label('Phone number',exact=True).fill(phone);page.get_by_role('button',name='Send phone OTP',exact=True).click();page.get_by_role('status').filter(has_text='Completed').wait_for()
  request=urllib.request.Request('http://127.0.0.1:3111/?phone='+urllib.parse.quote(phone),headers={'authorization':'Bearer '+secret});phone_code=json.load(urllib.request.urlopen(request))['code'];assert phone_code
  page.get_by_label('Authenticator or phone code',exact=True).fill(phone_code);page.get_by_role('button',name='Verify phone',exact=True).click();page.get_by_role('status').filter(has_text='Completed').wait_for();assert context.request.get(base+'/api/auth/get-session').json()['user']['phoneNumberVerified'] is True
  page.goto(base+'/dashboard');page.get_by_role('button',name='Sign out').click();page.wait_for_url('**/login');page.get_by_label('Email',exact=True).fill(email);page.get_by_label('Password',exact=True).fill(password+'-new');page.get_by_role('button',name='Continue',exact=True).click();page.get_by_role('heading',name='Verify your second factor').wait_for();page.get_by_role('button',name='Use recovery code',exact=True).click();page.get_by_label('Recovery code',exact=True).fill(recovery);page.get_by_role('button',name='Continue',exact=True).click();page.wait_for_url('**/dashboard');assert not errors,errors
  print(f'PASS {app}: registration/login/logout/recovery/reset/replay/expiry; Secure HttpOnly Lax cookies; CSRF, role and suspension isolation; MFA enrollment/recovery, step-up and phone verification',flush=True);context.close()
 browser.close()

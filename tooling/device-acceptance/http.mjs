import assert from 'node:assert/strict';
export async function http(url, options = {}) {
  return fetch(url, {redirect:'manual',signal:AbortSignal.timeout(15000),...options});
}
// Keycloak Admin REST creates users with 201 + Location and no JSON body.
export async function json(url, options = {}, status = 200, request = http) {
  const response=await request(url,options);
  assert.equal(response.status,status,'HTTP status at '+new URL(url).pathname);
  return status===204 || status===201 ? undefined : response.json();
}

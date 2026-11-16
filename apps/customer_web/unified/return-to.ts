export type CustomerReturnTo='/customer'|`/customer#inviteFriends/${string}`;
/** Only invitation fragments may survive Customer sign-in; never accept arbitrary redirects. */
export function customerReturnTo(value:unknown):CustomerReturnTo{
 return typeof value==='string'&&/^\/customer#inviteFriends\/[a-f0-9]{64}$/.test(value)?value as CustomerReturnTo:'/customer';
}

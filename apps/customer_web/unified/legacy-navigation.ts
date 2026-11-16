const customerViews=new Set(['landing','home','planForMe','browsePlans','restaurant','offering','eventDetail','checkout','reservation','profile','settings','help','notifications','myTickets','wishlist','savedPlans','globalCart','createEvent','offers','inviteFriends','gathering','reviewHistory']);
const deferredViews=new Set(['comingSoon','transportation','deliveryRestaurant','deliveryCart','orderTracking']);
/** Preserve PR #28 bookmarks/callback fragments while moving Customer under /customer. */
export function legacyDestination(hash:string){
 if(!hash.startsWith('#'))return null;
 const [view]=hash.slice(1).split('/');
 if(deferredViews.has(view))return '/ride';
 return customerViews.has(view)?'/customer'+hash:null;
}

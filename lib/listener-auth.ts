type AuthSession = {access_token:string;refresh_token:string;expires_in?:number;expires_at?:number;token_type?:string;user?:{id:string;is_anonymous?:boolean}};
const SESSION_KEY="afrovibez.listener-auth.v1";
function config(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!anon)throw new Error("Listener account service is not configured.");return {url:url.replace(/\/$/,""),anon};}
function persist(session:AuthSession){const expires_at=session.expires_at||Math.floor(Date.now()/1000)+(session.expires_in||3600);const next={...session,expires_at};localStorage.setItem(SESSION_KEY,JSON.stringify(next));return next;}
export async function ensureListenerAccessToken():Promise<string>{
 const {url,anon}=config();let saved:AuthSession|null=null;try{saved=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");}catch{}
 if(saved?.access_token&&saved.refresh_token&&(saved.expires_at||0)>Math.floor(Date.now()/1000)+60)return saved.access_token;
 if(saved?.refresh_token){
  const response=await fetch(`${url}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{apikey:anon,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:saved.refresh_token})});
  if(response.ok){const next=persist(await response.json());return next.access_token;}
  localStorage.removeItem(SESSION_KEY);
 }
 const response=await fetch(`${url}/auth/v1/signup`,{method:"POST",headers:{apikey:anon,"Content-Type":"application/json"},body:JSON.stringify({})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.access_token||!data.refresh_token)throw new Error(data.msg||data.message||data.error_description||data.error||"Anonymous sign-in is disabled. Enable Anonymous Sign-Ins in Supabase Auth settings.");
 return persist(data).access_token;
}
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Heart, ImagePlus, Loader2, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SelfieCameraDialog, type SelfieMode } from '@/components/SelfieCameraDialog';
import { useCreation } from '@/context/CreationContext';
import { useRouter } from '@/context/RouterContext';
import { useToast } from '@/context/ToastContext';
import { invokeAuthedFunction } from '@/lib/edgeFunctions';
import { prepareImageDataUrl } from '@/lib/creativeFiles';

type Category = 'royal'|'traditional-indian'|'romantic'|'wedding'|'cinematic-hero'|'fashion'|'travel'|'festival'|'studio-portrait'|'casual-lifestyle';
type FeedItem = { id:string; generationId:string; sequence:number; category:Category; status:string; imageUrl:string|null; error?:string|null; creditsUsed:number; favorite?:boolean };
type Session = { id:string; mode:SelfieMode; status:string; imageCount:number };
const categories: { id:Category; label:string }[] = [
  {id:'royal',label:'Royal & historical'},{id:'traditional-indian',label:'Traditional Indian'},{id:'romantic',label:'Romantic'},
  {id:'wedding',label:'Wedding'},{id:'cinematic-hero',label:'Cinematic hero'},{id:'fashion',label:'Fashion & luxury'},
  {id:'travel',label:'Travel'},{id:'festival',label:'Festival'},{id:'studio-portrait',label:'Studio portrait'},{id:'casual-lifestyle',label:'Casual lifestyle'},
];

export function SelfieStudio() {
  const { pending, clearPending } = useCreation();
  const { path, navigate } = useRouter();
  const { toast } = useToast();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [session, setSession] = useState<Session|null>(null);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [category, setCategory] = useState<Category|'auto'>('auto');
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [feedCursor, setFeedCursor] = useState(0);
  const [confirmMode, setConfirmMode] = useState<SelfieMode|null>(null);
  const [stagedPhoto, setStagedPhoto] = useState<string|null>(null);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const stopRequested = useRef(false);
  const pagingRef = useRef(false);
  const picker = useRef<HTMLInputElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const launching = useRef(false);

  const loadFeed = useCallback(async (sessionId:string) => {
    const data = await invokeAuthedFunction<{session:Session;referenceUrl:string|null;items:FeedItem[];nextCursor:number;hasMore:boolean}>('selfie-sessions',{action:'feed',sessionId,cursor:0,limit:12});
    setSession(data.session); setReferenceUrl(data.referenceUrl || ''); setItems(data.items); setFavorites(new Set(data.items.filter((item)=>item.favorite).map((item)=>item.id))); setFeedCursor(data.nextCursor); setHasMore(data.hasMore);
    return data;
  },[]);

  const createSession = useCallback(async (photo:string,mode:SelfieMode) => {
    setBusy(true);setError('');
    try {
      const result = await invokeAuthedFunction<{session:Session;referenceUrl:string|null}>('selfie-sessions',{action:'create',photo,mode});
      setSession(result.session);setReferenceUrl(result.referenceUrl||'');setFeedCursor(0);setHasMore(false);navigate(`/selfie?session=${result.session.id}`);toast('Private selfie session is ready. Choose styles and create your first set.','success');
    } catch(cause) {const message=cause instanceof Error?cause.message:'Could not start Selfie Studio.';setError(message);toast(message,'error');}
    finally {setBusy(false);launching.current=false;}
  },[navigate,toast]);

  const startSession = useCallback(async (photo:string, mode:SelfieMode) => {
    if (launching.current) return;
    launching.current = true; setBusy(true); setError(''); setItems([]); setSession(null); setQueued(0);setFeedCursor(0);setHasMore(false);
    try {
      const detected = await invokeAuthedFunction<{peopleCount:number;confidence:number;needsConfirmation:boolean}>('selfie-detect',{photo}).catch(()=>null);
      const inferred:SelfieMode = detected?.peopleCount === 2 ? 'couple' : 'single';
      if (!detected || detected.needsConfirmation || inferred !== mode) {
        setStagedPhoto(photo);setConfirmMode(inferred);setBusy(false);launching.current=false;return;
      }
      await createSession(photo,mode);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not start Selfie Studio.';
      setError(message); toast(message,'error');
    } finally { setBusy(false); launching.current = false; }
  },[createSession,toast]);

  useEffect(() => {
    if (pending?.selfiePhotoDataUrl) {
      const photo = pending.selfiePhotoDataUrl; const mode = pending.selfieMode ?? 'single'; clearPending(); void startSession(photo,mode);
      return;
    }
    const id = new URLSearchParams(path.split('?')[1] || '').get('session');
    if (id && !session) void loadFeed(id).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load this session.'));
  },[pending,path,session,clearPending,startSession,loadFeed]);

  const createBatch = useCallback(async (count:number,requestedCategory?:Category|'auto') => {
    if (!session || busy || hasMore || session.status !== 'active' || session.imageCount >= 20) return;
    setBusy(true); setQueued(count); setError(''); stopRequested.current=false;
    const used = new Set(items.map((item)=>item.category));
    const targetCategory=requestedCategory??category;
    const pool = targetCategory === 'auto' ? categories.map((item)=>item.id).filter((id)=>!used.has(id)) : [targetCategory];
    const styles = pool.length ? pool : categories.map((item)=>item.id);
    let index = 0;
    const run = async () => {
      while (index < count && !stopRequested.current) {
        const position = index++;
        const style = styles[(items.length + position) % styles.length];
        try {
          const generated = await invokeAuthedFunction<FeedItem & {creditsBalance?:number}>('selfie-generate',{sessionId:session.id,category:style,idempotencyKey:crypto.randomUUID()});
          setItems((current)=>current.some((entry)=>entry.id===generated.id)?current:[...current,generated].sort((a,b)=>a.sequence-b.sequence));
          setFeedCursor((current)=>Math.max(current,generated.sequence));
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : 'Image generation failed.';
          setError(message); toast(message,'error');
        } finally { setQueued((current)=>Math.max(0,current-1)); }
      }
    };
    await Promise.all([run(),run()]);
    try { const page=await invokeAuthedFunction<{items:FeedItem[];session:Session;nextCursor:number;hasMore:boolean}>('selfie-sessions',{action:'feed',sessionId:session.id,cursor:0,limit:20});setItems((current)=>{const byId=new Map(current.map((item)=>[item.id,item]));page.items.forEach((item)=>byId.set(item.id,item));return [...byId.values()].sort((a,b)=>a.sequence-b.sequence);});setFavorites((current)=>{const next=new Set(current);page.items.filter((item)=>item.favorite).forEach((item)=>next.add(item.id));return next;});setFeedCursor(page.nextCursor);setHasMore(page.hasMore);setSession(page.session); }
    catch { /* completed results are already in local state */ }
    setQueued(0);setBusy(false);
  },[session,busy,hasMore,items,category,toast]);

  const loadNextFeedPage = useCallback(async () => {
    if(!session||busy||pagingRef.current||!hasMore)return;
    pagingRef.current=true;setBusy(true);
    try {
      const page=await invokeAuthedFunction<{items:FeedItem[];session:Session;nextCursor:number;hasMore:boolean}>('selfie-sessions',{action:'feed',sessionId:session.id,cursor:feedCursor,limit:12});
      setItems((current)=>{const byId=new Map(current.map((item)=>[item.id,item]));page.items.forEach((item)=>byId.set(item.id,item));return [...byId.values()].sort((a,b)=>a.sequence-b.sequence);});
      setFavorites((current)=>{const next=new Set(current);page.items.filter((item)=>item.favorite).forEach((item)=>next.add(item.id));return next;});
      setFeedCursor(page.nextCursor);setHasMore(page.hasMore);setSession(page.session);
    } catch(cause){toast(cause instanceof Error?cause.message:'Could not load more images.','error');}
    finally{pagingRef.current=false;setBusy(false);}
  },[session,busy,hasMore,feedCursor,toast]);

  useEffect(() => {
    if (!sentinel.current || !hasMore || busy || items.length === 0) return;
    const observer = new IntersectionObserver((entries)=>{ if(!entries.some((entry)=>entry.isIntersecting))return;if(hasMore)void loadNextFeedPage();else if((session?.imageCount??0)<20)void createBatch(Math.min(2,20-(session?.imageCount??0))); },{rootMargin:'700px'});
    observer.observe(sentinel.current); return ()=>observer.disconnect();
  },[hasMore,busy,items.length,session,createBatch,loadNextFeedPage]);

  async function chooseFile(file?:File) {
    if(!file)return;
    try { const photo=await prepareImageDataUrl(file); await startSession(photo,'single'); }
    catch(cause){toast(cause instanceof Error?cause.message:'Could not prepare image.','error');}
  }
  async function deleteSession() {
    if(!session)return;
    try { await invokeAuthedFunction('selfie-sessions',{action:'delete',sessionId:session.id}); setSession(null);setItems([]);setReferenceUrl('');navigate('/selfie');toast('Selfie session and its private photos were deleted.','success'); }
    catch(cause){toast(cause instanceof Error?cause.message:'Could not delete session.','error');}
  }
  async function toggleFavorite(item:FeedItem){const favorite=!favorites.has(item.id);try{await invokeAuthedFunction('selfie-sessions',{action:'favorite-item',sessionId:session?.id,generationId:item.generationId,favorite});setFavorites((current)=>{const next=new Set(current);if(favorite)next.add(item.id);else next.delete(item.id);return next;});setItems((current)=>current.map((entry)=>entry.id===item.id?{...entry,favorite}:entry));}catch(cause){toast(cause instanceof Error?cause.message:'Could not update favorite.','error');}}
  async function deleteItem(item:FeedItem){try{await invokeAuthedFunction('selfie-sessions',{action:'delete-item',sessionId:session?.id,generationId:item.generationId});setItems((current)=>current.filter((entry)=>entry.id!==item.id));toast('Image deleted.','success');}catch(cause){toast(cause instanceof Error?cause.message:'Could not delete image.','error');}}
  async function stopGeneration(){stopRequested.current=true;setHasMore(false);if(session)await invokeAuthedFunction('selfie-sessions',{action:'stop',sessionId:session.id}).then(()=>setSession((current)=>current?{...current,status:'stopped'}:current)).catch((cause)=>toast(cause instanceof Error?cause.message:'Could not stop session.','error'));toast('Queued requests stopped. Already-running provider requests may finish.','info');}

  return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[var(--accent)]"><Sparkles className="h-5 w-5"/><span className="text-sm font-medium">ORVEXA Infinite Selfie Studio</span></div><h1 className="text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">Create portraits from your photo</h1><p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Choose a reference photo once, then generate style variations without writing prompts. Identity consistency is approximate and depends on the image model.</p></div>
    {session&&<Button variant="outline" disabled={busy} onClick={deleteSession}><Trash2 className="h-4 w-4"/>Delete session</Button>}</div>
    {!session ? <section className="mx-auto mt-10 max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 sm:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]"><Camera className="h-8 w-8"/></div><h2 className="mt-5 text-center text-xl font-semibold">Start with a reference photo</h2><p className="mt-2 text-center text-sm text-[var(--text-secondary)]">Your photo is uploaded to private storage for this session and sent to the configured image provider when you generate.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button onClick={()=>setCameraOpen(true)}><Camera className="h-4 w-4"/>Open camera</Button><Button variant="secondary" onClick={()=>picker.current?.click()}><ImagePlus className="h-4 w-4"/>Choose from gallery</Button><input ref={picker} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e)=>{void chooseFile(e.target.files?.[0]);e.currentTarget.value='';}}/></div>{busy&&<div className="mt-5 flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 className="h-4 w-4 animate-spin"/>Preparing private session…</div>}{error&&<p role="alert" className="mt-4 text-center text-sm text-red-400">{error}</p>}<p className="mt-6 text-center text-xs text-[var(--text-tertiary)]">Supports PNG, JPEG, and WebP · Single or Couple mode · You can delete the session any time</p></section> : <>
      <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4"><div className="flex flex-wrap items-center gap-4"><img src={referenceUrl} alt="Private selfie reference" className="h-16 w-16 rounded-xl object-cover bg-[var(--surface-2)]"/><div className="min-w-0 flex-1"><p className="font-medium">{session.mode==='couple'?'Couple':'Single'} photo mode</p><p className="text-xs text-[var(--text-secondary)]">{session.imageCount}/20 images in this session · each generation uses 2 credits</p></div><button disabled={busy} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs disabled:opacity-50" onClick={()=>setCameraOpen(true)}>Replace photo</button></div></section>
      {confirmMode&&<div role="dialog" aria-modal="true" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"><p className="text-sm">Person count is uncertain. Confirm or correct the photo mode before continuing.</p><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={()=>setConfirmMode(confirmMode==='single'?'couple':'single')}>Use {confirmMode==='single'?'Couple':'Single'}</Button><Button size="sm" disabled={busy} onClick={()=>{const photo=stagedPhoto;const mode=confirmMode;setConfirmMode(null);setStagedPhoto(null);if(photo)void createSession(photo,mode);}}>Confirm {confirmMode}</Button></div></div>}
      <div className="mb-4 flex flex-wrap items-center gap-2"><button onClick={()=>setCategory('auto')} className={`rounded-full px-4 py-2 text-xs ${category==='auto'?'bg-[var(--accent)] text-[var(--bg-base)]':'border border-[var(--border)]'}`}>Auto mix</button>{categories.map((item)=><button key={item.id} onClick={()=>setCategory(item.id)} className={`rounded-full px-4 py-2 text-xs ${category===item.id?'bg-[var(--accent)] text-[var(--bg-base)]':'border border-[var(--border)] text-[var(--text-secondary)]'}`}>{item.label}</button>)}</div>
      <div className="mb-6 flex flex-wrap items-center gap-3"><Button disabled={busy||hasMore||session.status!=='active'||!!confirmMode||session.imageCount>=20} loading={busy&&queued>0} onClick={()=>void createBatch(items.length===0?4:2)}><Sparkles className="h-4 w-4"/>{items.length===0?'Generate first 4':'Generate 2 more'}</Button>{hasMore&&!busy&&<span className="text-xs text-[var(--text-secondary)]">Scroll down to load saved images before generating more.</span>}{busy&&queued>0&&<Button variant="secondary" onClick={()=>void stopGeneration()}>Stop generation</Button>}{busy&&queued===0&&<span className="text-xs text-[var(--text-secondary)]">Loading saved images…</span>}<span className="text-xs text-[var(--text-tertiary)]">20-image daily cap · 20 per session · provider/cost limits may also apply</span></div>
      {error&&<p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((item)=><article key={item.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">{item.status==='completed'&&item.imageUrl?<img src={item.imageUrl} alt={`${item.category} portrait`} loading="lazy" className="aspect-square w-full object-cover"/>:item.status==='processing'?<div className="flex aspect-square flex-col items-center justify-center gap-3 bg-[var(--surface-2)]"><Loader2 className="h-7 w-7 animate-spin text-[var(--accent)]"/><span className="text-sm text-[var(--text-secondary)]">Creating {item.category}…</span></div>:<div className="flex aspect-square flex-col items-center justify-center gap-3 bg-[var(--surface-2)] p-5 text-center"><X className="h-7 w-7 text-red-400"/><span className="text-sm">{item.error||'Generation failed'}</span><Button size="sm" variant="secondary" onClick={()=>void createBatch(1,item.category)}><RefreshCw className="h-4 w-4"/>Retry style</Button></div>}<div className="flex items-center justify-between gap-2 p-3"><span className="truncate text-xs capitalize text-[var(--text-secondary)]">{item.category.replace(/-/g,' ')}</span><div className="flex gap-1"><button aria-label="Favorite" onClick={()=>void toggleFavorite(item)} className={`rounded-lg p-2 ${(favorites.has(item.id)||item.favorite)?'text-pink-400':'text-[var(--text-tertiary)]'}`}><Heart className="h-4 w-4" fill={(favorites.has(item.id)||item.favorite)?'currentColor':'none'}/></button>{item.imageUrl&&<a download={`orvexa-${item.category}.jpg`} href={item.imageUrl} className="rounded-lg px-2 py-1 text-xs text-[var(--accent)]">Download</a>}<button aria-label="Regenerate this style" onClick={()=>void createBatch(1,item.category)} className="rounded-lg p-2 text-[var(--text-tertiary)]"><RefreshCw className="h-4 w-4"/></button><button aria-label="Delete image" onClick={()=>void deleteItem(item)} className="rounded-lg p-2 text-[var(--text-tertiary)] hover:text-red-400"><Trash2 className="h-4 w-4"/></button></div></div></article>)}{Array.from({length:queued},(_,i)=><div key={`skeleton-${i}`} className="flex aspect-square animate-pulse items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]"><Loader2 className="h-7 w-7 animate-spin text-[var(--accent)]"/></div>)}</div>
      <div ref={sentinel} className="h-8"/>{items.length===0&&!busy&&<p className="py-10 text-center text-sm text-[var(--text-tertiary)]">Your generated portraits will appear here.</p>}{session.status!=='active'&&<p className="mt-6 text-center text-sm text-[var(--text-secondary)]">This session has stopped. Start a new session for more images.</p>}
    </>}
    <SelfieCameraDialog open={cameraOpen} onClose={()=>setCameraOpen(false)} onConfirm={async (photo,mode)=>{if(session){try{await invokeAuthedFunction('selfie-sessions',{action:'delete',sessionId:session.id});}catch(cause){toast(cause instanceof Error?cause.message:'Could not replace the existing selfie session.','error');return;}setSession(null);setItems([]);}await startSession(photo,mode);}}/>
  </div>;
}

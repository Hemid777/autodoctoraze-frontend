import { useEffect, useMemo, useRef, useState } from 'react';
import { CatalogAPI } from './api';

type OEMPart = { id?: string; name: string; oem: string[]; notes?: string };
type Subcategory = { title: string; parts: OEMPart[] };
type Category = { title: string; subcategories: Subcategory[] };
type ModelData = { make: string; model: string; years: [number, number]; categories: Category[] };

const seedData: ModelData[] = [{
  make: "BMW", model: "3 Series (F30)", years: [2012, 2019],
  categories: [{ title: "Тормозная система", subcategories: [{ title: "Передние тормоза", parts: [
    { name: "Тормозной диск передний", oem:["34116792219","34116792221"] },
    { name: "Колодки передние", oem:["34116851269"] },
  ] }]}]
}];

export default function App() {
  const [vin, setVin] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [query, setQuery] = useState('');
  const [selectedOEMs, setSelectedOEMs] = useState<string[]>([]);

  const [useRemote, setUseRemote] = useState(true);
  const [remoteCategories, setRemoteCategories] = useState<string[]>([]);
  const [remoteSubcategories, setRemoteSubcategories] = useState<string[]>([]);
  const [remoteParts, setRemoteParts] = useState<OEMPart[]>([]);

  const offlineModel = useMemo(() => seedData.find(m => m.make===make && m.model===model), [make, model]);
  const offlineCategories = useMemo(() => offlineModel?.categories.map(c=>c.title) ?? [], [offlineModel]);
  const offlineSubcats = useMemo(() => offlineModel?.categories.find(c=>c.title===category)?.subcategories.map(s=>s.title) ?? [], [offlineModel, category]);
  const offlineParts = useMemo(() => {
    const list = offlineModel?.categories.find(c=>c.title===category)?.subcategories.find(s=>s.title===subcategory)?.parts ?? [];
    return query ? list.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())) : list;
  }, [offlineModel, category, subcategory, query]);

  const categories = useRemote ? remoteCategories : offlineCategories;
  const subcategories = useRemote ? remoteSubcategories : offlineSubcats;
  const parts = useRemote ? remoteParts : offlineParts;

  useEffect(() => { (async () => {
    if (!useRemote || !vin || vin.length < 8) return;
    try {
      const res = await CatalogAPI.decodeVIN(vin);
      if (res?.make) setMake(res.make);
      if (res?.model) setModel(res.model);
      if (res?.year) setYear(res.year);
    } catch {}
  })(); }, [vin, useRemote]);

  useEffect(() => { (async () => {
    if (!useRemote || !make || !model) return;
    try {
      const data = await CatalogAPI.searchByTree({ make, model, year });
      setRemoteCategories(data?.categories || []);
    } catch {}
  })(); }, [useRemote, make, model, year]);

  useEffect(() => { (async () => {
    if (!useRemote || !make || !model || !category) return;
    try {
      const data = await CatalogAPI.searchByTree({ make, model, year, category });
      setRemoteSubcategories(data?.subcategories || []);
    } catch {}
  })(); }, [useRemote, make, model, year, category]);

  useEffect(() => { (async () => {
    if (!useRemote || !make || !model || !category || !subcategory) return;
    try {
      const data = await CatalogAPI.partsForNode({ make, model, year, category, subcategory });
      setRemoteParts((data?.parts || []).filter((p:any)=>!query || p.name.toLowerCase().includes(query.toLowerCase())));
    } catch {}
  })(); }, [useRemote, make, model, year, category, subcategory, query]);

  function onExportCSV() {
    const rows: string[][] = [["Марка","Модель","Год","Категория","Подкатегория","Запчасть","OEM"]];
    selectedOEMs.forEach((oem) => rows.push([make, model, String(year ?? ""), category, subcategory, parts.find(p=>p.oem.includes(oem))?.name || '', oem]));
    if (rows.length === 1) { alert("Нечего экспортировать."); return; }
    const csv = rows.map((r)=>r.map((c)=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `oem_${Date.now()}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div style={{padding:16, maxWidth:980, margin:"0 auto", fontFamily:"system-ui, sans-serif"}}>
      <h1 style={{fontSize:24, fontWeight:600, marginBottom:8}}>AutoDoctorAze</h1>
      <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:12}}>
        <label><input type="checkbox" checked={useRemote} onChange={(e)=> setUseRemote(e.target.checked)} /> Использовать онлайн API</label>
      </div>

      <div style={{display:"grid", gap:12, gridTemplateColumns:"repeat(4, minmax(0, 1fr))", alignItems:"end"}}>
        <div style={{gridColumn:"span 2"}}>
          <label>VIN</label>
          <input value={vin} onChange={(e)=>setVin(e.target.value)} placeholder="WBA3A5C59DF123456"
                 style={{width:"100%", padding:"8px 10px", border:"1px solid #cbd5e1", borderRadius:8}} />
        </div>
        <div>
          <label>Марка</label>
          <input value={make} onChange={(e)=>{ setMake(e.target.value); setModel(''); setCategory(''); setSubcategory(''); }} placeholder="BMW"
                 style={{width:"100%", padding:"8px 10px", border:"1px solid #cbd5e1", borderRadius:8}} />
        </div>
        <div>
          <label>Модель</label>
          <input value={model} onChange={(e)=>{ setModel(e.target.value); setCategory(''); setSubcategory(''); }}
                 placeholder="3 Series (F30)" style={{width:"100%", padding:"8px 10px", border:"1px solid #cbd5e1", borderRadius:8}} />
        </div>
        <div>
          <label>Год</label>
          <input value={year ?? ''} onChange={(e)=> setYear(parseInt(e.target.value||'0')||undefined)} placeholder="2015"
                 style={{width:"100%", padding:"8px 10px", border:"1px solid #cbd5e1", borderRadius:8}} />
        </div>
        <div>
          <label>Категория</label>
          <input value={category} onChange={(e)=>{ setCategory(e.target.value); setSubcategory(''); }}
                 placeholder="Тормозная система" style={{width:"100%", padding:"8px 10px", border:"1px solid #cbd5e1", borderRadius:8}} />
        </div>
        <div>
          <label>Подкатегория</label>
          <input value={subcategory} onChange={(e)=> setSubcategory(e.target.value)} placeholder="Передние тормоза"
                 style={{width:"100%", padding:"8px 10px", border:"1px solid #cbd5e1", borderRadius:8}} />
        </div>
        <div style={{gridColumn:"span 2"}}>
          <label>Поиск по запчастям</label>
          <input value={query} onChange={(e)=> setQuery(e.target.value)} placeholder="колодки"
                 style={{width:"100%", padding:"8px 10px", border:"1px solid #cbd5e1", borderRadius:8}} />
        </div>
      </div>

      <PartsList
        parts={parts}
        onSelectOEM={(oem)=> setSelectedOEMs(p=> p.includes(oem)? p.filter(x=>x!==oem) : [...p, oem])}
        selectedOEMs={selectedOEMs}
      />

      <div style={{marginTop:12}}>
        <button onClick={onExportCSV} style={{padding:"8px 12px", borderRadius:8, border:"1px solid #0f172a"}}>Экспортировать выбранные OEM (CSV)</button>
      </div>
    </div>
  );
}

function PartsList({ parts, onSelectOEM, selectedOEMs }:{ parts:OEMPart[], onSelectOEM:(oem:string)=>void, selectedOEMs:string[] }) {
  return (
    <div style={{display:"grid", gridTemplateColumns:"1fr 2fr", gap:16, marginTop:16}}>
      <div style={{border:"1px solid #e2e8f0", borderRadius:12, padding:12}}>
        <div style={{fontWeight:600, marginBottom:8}}>Запчасти</div>
        {(parts?.length||0)===0 ? <div style={{color:"#666"}}>Уточните фильтры выше.</div> : (
          <div style={{display:"grid", gap:8}}>
            {parts.map((p, idx) => (
              <div key={(p.id||p.name)+idx} style={{border:"1px solid #e2e8f0", borderRadius:10, padding:10}}>
                <div style={{fontWeight:600}}>{p.name}</div>
                <div style={{marginTop:6, display:"flex", flexWrap:"wrap", gap:6}}>
                  {p.oem.map((o)=>(
                    <span key={o} onClick={()=>onSelectOEM(o)} style={{cursor:'pointer', border:"1px solid #cbd5e1", borderRadius:999, padding:"2px 8px", fontSize:12}}>
                      {selectedOEMs.includes(o) ? "✓ " : ""}{o}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div/>
    </div>
  )
}
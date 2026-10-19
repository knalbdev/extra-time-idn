"use client";

import { useState } from "react";
import { COMPANION_NAMES } from "@/lib/companions";
import { field } from "./CoachSessionForms";

export function CompanionNameField({ value,onChange,label="Nama pendamping" }: { value:string;onChange:(name:string)=>void;label?:string }) {
  const [manual,setManual]=useState(()=>Boolean(value)&&!COMPANION_NAMES.some(name=>name===value));
  return <div>
    <label className="block text-xs font-semibold">{label}<select required value={manual?"__other__":value} onChange={event=>{
      const other=event.target.value==="__other__";setManual(other);onChange(other?"":event.target.value);
    }} className={field}><option value="">Pilih nama pendamping</option>{COMPANION_NAMES.map(name=><option key={name}>{name}</option>)}<option value="__other__">Nama lainnya — isi manual</option></select></label>
    {manual&&<label className="mt-4 block text-xs font-semibold">Nama pendamping tambahan<input required minLength={2} maxLength={120} autoComplete="name" value={value} onChange={event=>onChange(event.target.value)} className={field} placeholder="Masukkan nama lengkap pendamping"/><span className="mt-2 block text-xs font-normal leading-relaxed text-on-surface-variant">Gunakan pilihan ini bila nama pendamping belum ada dalam daftar.</span></label>}
  </div>;
}

// Test-only server fetch hook. Activate explicitly with NODE_OPTIONS --import.
// Never used by the normal production build/start commands.
import fs from 'node:fs/promises';
const original=globalThis.fetch;
const sheets=new Set(['Renang','Panahan','Berkuda','Taekwondo','Pramuka','Jadwal Induk']);
globalThis.fetch=async(input,options)=>{
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
  const sheet=url.searchParams.get('sheet');
  if(url.hostname==='docs.google.com'&&url.pathname.endsWith('/gviz/tq')&&sheets.has(sheet)){
    await new Promise(resolve=>setTimeout(resolve,100));
    if(process.env.COMPANION_REMINDER_FIXTURE==='1'){
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      const shift=days=>new Date(Date.parse(today+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
      const header='Tanggal,Semester,Mulai,Selesai,Kelompok,Kelas peserta,Status\n';
      const rows={Renang:[`${today},S1,09:00,11:00,7A,7A,Terjadwal`,`${shift(-2)},S1,08:00,09:00,7B,7B,Sudah Terlaksana`],
        Panahan:[`${today},S1,08:00,09:30,7B,7B,Terjadwal`,`${today},S1,13:00,14:30,8A,8A,Terjadwal`,`${today},S1,07:00,08:00,9A,9A,Libur`],
        Berkuda:[`${shift(-1)},S1,14:00,17:00,8B,8B,Terjadwal`],Taekwondo:[`${today},S1,07:00,09:00,9B,9B,Ditiadakan`],Pramuka:[], 'Jadwal Induk':[]};
      return new Response(header+rows[sheet].join('\n'),{headers:{'content-type':'text/csv'}});
    }
    return new Response(await fs.readFile(new URL(`./sheets-current-2026-10/${sheet}.csv`,import.meta.url),'utf8'),{headers:{'content-type':'text/csv'}});
  }
  return original(input,options);
};

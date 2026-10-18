import { ESKUL_META } from "./constants";
import { RECAP_COLORS, RECAP_COUNT_NOTE, recapDate, recapUpdated, SessionRecap } from "./session-recap";

export async function downloadSessionRecapPng(recap: SessionRecap) {
  const canvas = document.createElement("canvas");
  canvas.width = 1920; canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gambar rekap belum dapat disiapkan.");
  const logo = new Image(); logo.src = "/idn.png"; await logo.decode();
  const rect = (x:number,y:number,w:number,h:number,fill:string,r=0) => { ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill(); };
  const text = (value:string,x:number,y:number,size=24,color="#18314e",bold=false) => { ctx.fillStyle=color;ctx.font=`${bold?"700":"400"} ${size}px Arial, sans-serif`;ctx.textBaseline="top";ctx.fillText(value,x,y); };
  const paragraph = (value:string,x:number,y:number,maxWidth:number,size=22,lineHeight=31,color="#60758c") => {
    ctx.font=`400 ${size}px Arial, sans-serif`;
    let line="",top=y;
    for(const word of value.split(" ")) {
      const next=line?`${line} ${word}`:word;
      if(line && ctx.measureText(next).width>maxWidth){text(line,x,top,size,color);top+=lineHeight;line=word;}else line=next;
    }
    if(line)text(line,x,top,size,color);
  };
  rect(0,0,1920,1080,"#f4f7fb");
  const gradient=ctx.createLinearGradient(0,0,1920,265);gradient.addColorStop(0,"#102d50");gradient.addColorStop(1,"#1b668a");ctx.fillStyle=gradient;ctx.fillRect(0,0,1920,265);
  text("IDN AKHWAT · LAPORAN PELAKSANAAN EKSTRAKURIKULER",64,42,22,"#b8d7ed",true);
  text("Rekap Sesi Terlaksana",64,90,55,"#ffffff",true);
  text(`${recapDate(recap.from)} – ${recapDate(recap.to)}`,64,169,28,"#ffffff");
  text(recap.eskul==="all"?"Seluruh ekstrakurikuler":ESKUL_META[recap.eskul].label,64,216,21,"#c7e1ef");
  rect(1600,48,256,118,"#ffffff",16);ctx.drawImage(logo,1620,58,216,100);
  const stats=[[String(recap.total),"Sesi terlaksana"],[String(recap.days),"Hari pelaksanaan"],[String(recap.activeEskuls),"Ekstrakurikuler terlaksana"]];
  stats.forEach(([value,label],i)=>{const x=64+i*608;rect(x,300,576,126,"#ffffff",18);text(label,x+26,320,22,"#60758c");text(value,x+26,359,44,"#18314e",true);});
  rect(64,464,1792,60,"#e8eff7",12);
  const columns=[92,750,1160,1470];
  ["Ekstrakurikuler","Sesi terlaksana","Hari pelaksanaan","Tanggal terakhir"].forEach((value,i)=>text(value,columns[i],483,22,"#486580",true));
  const maximum=Math.max(1,...recap.rows.map(row=>row.count));
  recap.rows.forEach((row,i)=>{
    const y=524+i*68;
    rect(64,y,1792,68,i%2?"#f7f9fc":"#ffffff");rect(92,y+22,8,24,RECAP_COLORS[row.eskul],4);
    text(row.label,118,y+21,25,"#18314e",true);
    text(String(row.count),750,y+20,27,"#18314e",true);
    rect(840,y+31,230,10,"#e2e8f0",5);if(row.count)rect(840,y+31,230*row.count/maximum,10,RECAP_COLORS[row.eskul],5);
    text(String(row.days),1160,y+22,25);
    text(row.lastDate?recapDate(row.lastDate):"—",1470,y+24,21);
  });
  text('Sumber: spreadsheet jadwal · Status: "Sudah Terlaksana"',64,905,23,"#18314e",true);
  paragraph(RECAP_COUNT_NOTE,64,949,1792);
  text(`Data diperbarui ${recapUpdated(recap.fetchedAt)}`,64,1035,20,"#60758c");
  text("IDN Akhwat",1675,1035,20,"#60758c",true);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error("Gambar rekap tidak dapat disimpan.")),"image/png"));
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download=`rekap-sesi-${recap.eskul}-${recap.from}-${recap.to}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

import { ESKUL_META } from "./constants";
import { RECAP_COLORS, RECAP_COUNT_NOTE, recapDate, recapUpdated, SessionRecap } from "./session-recap";

export async function downloadSessionRecapPng(recap: SessionRecap) {
  const canvas = document.createElement("canvas");
  canvas.width = 1920; canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gambar rekap belum dapat disiapkan.");
  const logo = new Image(); logo.src = "/idn.png"; await logo.decode();
  const wrap = (value:string,width:number,size=22,bold=false) => {
    ctx.font=`${bold?"700":"400"} ${size}px Arial, sans-serif`;
    const lines:string[]=[];
    for (const part of value.split("\n")) {
      let line="";
      for (const word of part.split(/\s+/)) {
        if (!word) continue;
        const next=line?`${line} ${word}`:word;
        if (ctx.measureText(next).width<=width) {line=next;continue;}
        if(line) {lines.push(line);line="";}
        for (const char of word) {
          if(line&&ctx.measureText(line+char).width>width) {lines.push(line);line="";}
          line+=char;
        }
      }
      if(line)lines.push(line);
    }
    return lines;
  };
  const detailColumns=[
    {label:"No.",x:92,width:54},
    {label:"Ekstrakurikuler",x:168,width:232},
    {label:"Tanggal",x:424,width:286},
    {label:"Jam",x:734,width:242},
    {label:"Kelas peserta",x:1000,width:476},
    {label:"Status",x:1500,width:328},
  ];
  const detailRows=recap.events.map((event,index)=>{
    const values=[String(index+1),event.eskulLabel,recapDate(event.date),event.time||"Belum dicantumkan",event.classes.join(", ")||"Belum dicantumkan","Sudah Terlaksana"];
    const cells=values.map((value,i)=>wrap(value,detailColumns[i].width,22,i===1||i===5));
    return {event,cells,height:Math.max(76,...cells.map(lines=>lines.length*30+32))};
  });
  const summaryBottom=524+recap.rows.length*68;
  const detailTop=summaryBottom+44;
  const detailsBottom=recap.total?detailTop+136+detailRows.reduce((sum,row)=>sum+row.height,0):summaryBottom+84;
  const footerTop=detailsBottom+40;
  const noteLines=wrap(RECAP_COUNT_NOTE,1792);
  // Keep the whole selected period in one readable image, including every
  // class and time. Never shrink rows or truncate the last sessions to fit 16:9.
  canvas.height=Math.max(1080,footerTop+126+noteLines.length*31);
  const rect = (x:number,y:number,w:number,h:number,fill:string,r=0) => { ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill(); };
  const text = (value:string,x:number,y:number,size=24,color="#18314e",bold=false) => { ctx.fillStyle=color;ctx.font=`${bold?"700":"400"} ${size}px Arial, sans-serif`;ctx.textBaseline="top";ctx.fillText(value,x,y); };
  const paragraph = (value:string,x:number,y:number,maxWidth:number,size=22,lineHeight=31,color="#60758c") => {
    wrap(value,maxWidth,size).forEach((line,i)=>text(line,x,y+i*lineHeight,size,color));
  };
  rect(0,0,canvas.width,canvas.height,"#f4f7fb");
  const gradient=ctx.createLinearGradient(0,0,1920,265);gradient.addColorStop(0,"#102d50");gradient.addColorStop(1,"#1b668a");ctx.fillStyle=gradient;ctx.fillRect(0,0,1920,265);
  text("IDN AKHWAT · LAPORAN PELAKSANAAN EKSTRAKURIKULER",64,42,22,"#b8d7ed",true);
  text("Rekap Sesi Terlaksana",64,90,55,"#ffffff",true);
  text(`${recapDate(recap.from)} – ${recapDate(recap.to)}`,64,169,28,"#ffffff");
  text(recap.eskul==="all"?"Seluruh ekstrakurikuler aktif":ESKUL_META[recap.eskul].label,64,216,21,"#c7e1ef");
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
  if(recap.total) {
    text("Rincian Pelaksanaan",64,detailTop,32,"#18314e",true);
    text("Diurutkan berdasarkan tanggal pelaksanaan",64,detailTop+46,22,"#60758c");
    rect(64,detailTop+76,1792,60,"#e8eff7",12);
    detailColumns.forEach((column)=>text(column.label,column.x,detailTop+94,22,"#486580",true));
    let y=detailTop+136;
    detailRows.forEach((row,index)=>{
      rect(64,y,1792,row.height,index%2?"#f7f9fc":"#ffffff");
      rect(64,y+14,5,row.height-28,RECAP_COLORS[row.event.eskul],2);
      row.cells.forEach((lines,i)=>lines.forEach((line,j)=>text(line,detailColumns[i].x,y+16+j*30,22,i===5?"#047857":"#18314e",i===1||i===5)));
      y+=row.height;
    });
  } else {
    text('Tidak ada sesi berstatus “Sudah Terlaksana” pada rentang ini.',64,summaryBottom+30,24,"#60758c");
  }
  text('Sumber: spreadsheet jadwal · Status: "Sudah Terlaksana"',64,footerTop+18,23,"#18314e",true);
  paragraph(RECAP_COUNT_NOTE,64,footerTop+62,1792);
  text(`Data diperbarui ${recapUpdated(recap.fetchedAt)}`,64,canvas.height-44,20,"#60758c");
  text("IDN Akhwat",1675,canvas.height-44,20,"#60758c",true);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error("Gambar rekap tidak dapat disimpan.")),"image/png"));
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download=`rekap-sesi-${recap.eskul}-${recap.from}-${recap.to}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

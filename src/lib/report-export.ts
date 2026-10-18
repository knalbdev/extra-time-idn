import type { jsPDF as PdfDocument } from "jspdf";
import type { Student } from "./students";
import { GRADES, GRADE_LABELS } from "./assessments";
import { ATTENDANCE, PERIODS, reportRows } from "./coach-sessions";
import { buildReportSlides, REPORT_DESCRIPTORS, ReportSnapshot, ReportSlide } from "./report-slides";

const W = 960, H = 540, M = 28;
const C = { navy: "163858", ink: "18314E", muted: "60758C", blue: "24649B", line: "DFE7F0", pale: "EFF5FB", white: "FFFFFF" };
export type DrawItem =
  | { kind: "box"; x: number; y: number; w: number; h: number; fill: string; border?: string }
  | { kind: "text"; x: number; y: number; w: number; h: number; text: string; size: number; color: string; bold: boolean }
  | { kind: "logo"; x: number; y: number; w: number; h: number };
export type ExportPage = { items: DrawItem[]; kind: ReportSlide["kind"]; tableBottom?: number; tableFontSize?: number };
export const reportDate = (value: string) => new Date(`${value.slice(0,10)}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
const periodLabel = (key: string) => PERIODS.find(p => p.key === key)?.label ?? key;
const attendanceColor: Record<string, [string,string]> = { hadir: ["EAF8F0","176143"], izin: ["FFF7DD","855F0C"], sakit: ["FFF0E5","94481E"], alpa: ["FDECEF","A12849"] };

// PDF and PowerPoint use the same measured positions, line breaks and content.
// Every PowerPoint text box remains editable; no slide screenshots are embedded.
export function createExportPages(report: ReportSnapshot, students: Student[], label: string, metrics: PdfDocument): ExportPage[] {
  const slides = buildReportSlides(report.meetings, report.records, students);
  const rows = reportRows(report.meetings, report.records, students);
  const classes = [...new Set(report.meetings.map(m => m.className))];
  function wrap(value: string, width: number, size: number, bold = false): string[] {
    metrics.setFont("helvetica", bold ? "bold" : "normal"); metrics.setFontSize(size);
    return metrics.splitTextToSize(value || "—", width) as string[];
  }
  return slides.map((slide, index) => {
    const page: ExportPage = { kind: slide.kind, items: [] };
    function box(x: number,y: number,w: number,h: number,fill: string,border?: string) { page.items.push({ kind:"box",x,y,w,h,fill,border }); }
    function text(value: string,x: number,y: number,w: number,size=11,bold=false,color=C.ink) {
      const lines=wrap(value,w,size,bold);
      const h=lines.length*size*1.15+2;
      page.items.push({kind:"text",x,y,w,h,text:lines.join("\n"),size,bold,color});
      return h;
    }
    function logo(x=840,y=24,w=92,h=43) { box(x-5,y-4,w+10,h+8,C.white); page.items.push({kind:"logo",x,y,w,h}); }
    function heading(title: string, kicker: string) { text(kicker,M,24,780,9,true,C.blue); text(title,M,44,790,22,true); logo(); }
    function table(headers: string[], body: string[][], widths: number[], startY: number, statusColumn=-1, statuses: (string|undefined)[]=[]) {
      const pad=body.length >= 15 ? 1.5 : 5;
      let size=10.4, wrapped: string[][][]=[], heights: number[]=[];
      for (;size>=7.4;size-=.2) {
        wrapped=body.map(row=>row.map((value,i)=>wrap(value,widths[i]-pad*2,size,i===0)));
        heights=wrapped.map(row=>Math.max(16,...row.map(lines=>lines.length*size*1.15+pad*2)));
        if (startY+24+heights.reduce((sum,h)=>sum+h,0)<=501) break;
      }
      if (size<7.4) throw new Error("Isi laporan terlalu panjang untuk satu slide. Periksa panjang keterangan pada laporan.");
      page.tableFontSize=size;
      let x=M;
      headers.forEach((header,i)=>{box(x,startY,widths[i],24,C.pale);text(header,x+pad,startY+6,widths[i]-pad*2,9,true,C.blue);x+=widths[i];});
      let y=startY+24;
      body.forEach((row,rowIndex)=>{
        x=M;
        row.forEach((_,column)=>{
          const attendance=column===statusColumn ? attendanceColor[statuses[rowIndex]??""] : undefined;
          box(x,y,widths[column],heights[rowIndex],attendance?.[0]??(rowIndex%2?"F7F9FC":C.white),C.line);
          const value=wrapped[rowIndex][column].join("\n");
          // Text already contains the measured line breaks. Keep the matching
          // height for both renderers rather than asking PowerPoint to paginate.
          page.items.push({kind:"text",x:x+pad,y:y+pad,w:widths[column]-pad*2,h:heights[rowIndex]-pad*2+1,text:value,size,color:attendance?.[1]??C.ink,bold:column===0||column===2});
          x+=widths[column];
        });
        y+=heights[rowIndex];
      });
      page.tableBottom=y;
    }
    box(0,0,W,H,C.white);
    if(slide.kind==="cover") {
      box(0,0,W,H,C.navy); box(0,0,12,H,"2C85AC"); logo(M+10,30,126,58);
      text("IDN AKHWAT · LAPORAN EKSTRAKURIKULER",M+10,122,820,11,true,"B7D8EE");
      text(label,M+10,150,850,48,true,C.white);
      text("Laporan Kehadiran dan Penilaian Siswi",M+10,222,850,23,true,C.white);
      text("Dokumentasi hasil pembelajaran, penguasaan keterampilan, dan catatan coach.",M+10,266,820,13,false,"D0E2F2");
      const meta=[
        ["PERIODE PERTEMUAN",`${reportDate(report.meetings[0].date)} – ${reportDate(report.meetings.at(-1)!.date)}`],
        ["SEMESTER",[...new Set(report.meetings.map(m=>periodLabel(m.period)))].join(" / ")],
        ["KELAS",classes.join(", ")],
      ];
      meta.forEach(([title,value],i)=>{text(title,M+10+i*300,322,280,9,true,"9ECFE9");text(value,M+10+i*300,343,270,12,true,C.white);});
      [[String(report.meetings.length),"Pertemuan"],[String(rows.length),"Siswi"],[String(classes.length),"Kelas"]].forEach(([value,title],i)=>{text(value,M+10+i*180,417,160,32,true,C.white);text(title,M+10+i*180,459,160,11,false,"BDD8EC");});
    } else if(slide.kind==="overview") {
      heading("Ringkasan dan Keterangan Predikat",label.toLocaleUpperCase("id"));
      const totals=rows.reduce((counts,row)=>{for(const key of ["hadir","izin","sakit","alpa","unmarked"] as const)counts[key]+=row.counts[key];return counts;},{hadir:0,izin:0,sakit:0,alpa:0,unmarked:0});
      const labels={hadir:"Hadir",izin:"Izin",sakit:"Sakit",alpa:"Alpa",unmarked:"Belum dicatat"};
      Object.entries(totals).forEach(([key,value],i)=>{const colors=attendanceColor[key]??[C.pale,C.ink];const x=M+i*183;box(x,100,172,64,colors[0]);text(labels[key as keyof typeof labels],x+12,111,150,10,true,colors[1]);text(String(value),x+12,132,150,23,true,colors[1]);});
      text("Jumlah di atas merupakan catatan kehadiran siswi pada seluruh pertemuan dalam laporan.",M,179,900,10,false,C.muted);
      GRADES.forEach((grade,i)=>{const y=218+i*47;box(M,y,33,32,"EEF1FF");text(grade,M+10,y+7,20,14,true,"3730A3");text(GRADE_LABELS[grade],M+48,y+1,820,11,true);text(REPORT_DESCRIPTORS[grade],M+48,y+19,820,11);});
      text("Tanda — menunjukkan tidak ada predikat. Catatan panjang tersedia pada lampiran dengan rujukan L1, L2, dan seterusnya.",M,468,900,10,false,C.muted);
    } else if(slide.kind==="summary") {
      heading(`Rekap Kehadiran · Kelas ${slide.className}`,label.toLocaleUpperCase("id"));
      text("Persentase kehadiran dihitung dari seluruh pertemuan kelas pada periode laporan.",M,103,900,11,false,C.muted);
      table(["Nama siswi","Hadir","Izin","Sakit","Alpa","Belum dicatat","% hadir"],slide.rows.map(({student,counts,entries})=>[student.name,String(counts.hadir),String(counts.izin),String(counts.sakit),String(counts.alpa),String(counts.unmarked),`${Math.round(counts.hadir/entries.length*100)}%`]),[304,90,90,90,90,130,110],132);
    } else if(slide.kind==="meeting") {
      heading(slide.meeting.title,`${label.toLocaleUpperCase("id")} · KELAS ${slide.meeting.className} · ${reportDate(slide.meeting.date)}`);
      text(`Materi: ${slide.meeting.skill}`,M,100,900,10,true);
      text(periodLabel(slide.meeting.period),M,117,900,9,false,C.muted);
      table(["Nama siswi","Kehadiran","Predikat","Keterangan predikat","Catatan coach"],slide.rows.map(row=>[row.student.name,row.record?ATTENDANCE[row.record.attendance]:"Belum dicatat",row.grade,row.description,row.notes||"—"]),[225,92,52,326,209],132,1,slide.rows.map(row=>row.record?.attendance));
    } else {
      heading(`${slide.topic} · ${slide.reference}`,`${label.toLocaleUpperCase("id")} · LAMPIRAN ${slide.part}/${slide.parts}`);
      text(slide.student.name,M,100,900,17,true);
      text(`${slide.student.className} · ${slide.meeting.title} · ${reportDate(slide.meeting.date)}`,M,127,900,10,false,C.muted);
      box(M,157,904,337,"F4F7FB");
      text(slide.text,M+16,173,872,13);
    }
    const cover=slide.kind==="cover";
    box(M,511,904,.7,cover?"456680":C.line);
    text(`IDN Akhwat · ${label} · Disusun ${new Date(report.generatedAt).toLocaleDateString("id-ID",{timeZone:"Asia/Jakarta"})}`,M,521,800,8,false,cover?"C1D6E8":C.muted);
    text(`${index+1} / ${slides.length}`,880,519,52,9,true,cover?C.white:C.blue);
    return page;
  });
}

async function logoData() {
  const response=await fetch("/idn.png");
  if(!response.ok)throw new Error("Logo laporan tidak dapat dimuat.");
  const blob=await response.blob();
  return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Logo laporan tidak dapat dibaca."));reader.readAsDataURL(blob);});
}

export async function downloadReportPdf(report: ReportSnapshot, students: Student[], label: string, fileName: string) {
  const {jsPDF}=await import("jspdf");
  const pdf=new jsPDF({orientation:"landscape",unit:"pt",format:[W,H],compress:true});
  const pages=createExportPages(report,students,label,pdf);
  const logo=await logoData();
  pdf.setProperties({title:`Laporan ${label} · IDN Akhwat`,author:"IDN Akhwat",subject:"Kehadiran dan penilaian ekstrakurikuler"});
  pages.forEach((page,index)=>{
    if(index)pdf.addPage([W,H],"landscape");
    for(const item of page.items) {
      if(item.kind==="box") {pdf.setFillColor(`#${item.fill}`);if(item.border)pdf.setDrawColor(`#${item.border}`);pdf.setLineWidth(.35);pdf.rect(item.x,item.y,item.w,item.h,item.border?"FD":"F");}
      else if(item.kind==="logo")pdf.addImage(logo,"PNG",item.x,item.y,item.w,item.h);
      else {pdf.setFont("helvetica",item.bold?"bold":"normal");pdf.setFontSize(item.size);pdf.setTextColor(`#${item.color}`);pdf.text(item.text,item.x,item.y,{baseline:"top",lineHeightFactor:1.15});}
    }
  });
  pdf.save(fileName);
}

export async function downloadReportPptx(report: ReportSnapshot, students: Student[], label: string, fileName: string) {
  const [{default:PptxGenJS},{jsPDF}]=await Promise.all([import("pptxgenjs"),import("jspdf")]);
  const pptx=new PptxGenJS();
  pptx.layout="LAYOUT_WIDE";pptx.author="IDN Akhwat";pptx.subject="Kehadiran dan penilaian ekstrakurikuler";pptx.title=`Laporan ${label}`;
  pptx.theme={headFontFace:"Arial",bodyFontFace:"Arial"};
  const pages=createExportPages(report,students,label,new jsPDF({unit:"pt",format:[W,H],orientation:"landscape"}));
  const logo=await logoData();
  for(const page of pages) {
    const slide=pptx.addSlide();
    for(const item of page.items) {
      const position={x:item.x/72,y:item.y/72,w:item.w/72,h:item.h/72};
      if(item.kind==="box")slide.addShape(pptx.ShapeType.rect,{...position,fill:{color:item.fill},line:{color:item.border??item.fill,width:item.border ? 0.35 : 0}});
      else if(item.kind==="logo")slide.addImage({...position,data:logo});
      else slide.addText(item.text,{...position,fontFace:"Arial",fontSize:item.size,bold:item.bold,color:item.color,margin:0,breakLine:false,valign:"top",fit:"shrink",paraSpaceAfter:0,lang:"id-ID",lineSpacingMultiple:1.0});
    }
  }
  await pptx.writeFile({fileName,compression:true});
}

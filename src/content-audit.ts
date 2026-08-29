import { alphaDefinitions } from "./cards.js";
import { alphaDeckPresets } from "./decks.js";
import type { CardType, Department } from "./types.js";

export interface DepartmentContentAudit {
  department: Department; totalCards:number; cardTypes:Record<CardType,number>; cheapEmployeeDefinitions:number; topTags:Array<{tag:string;cards:number}>; bridgeCards:string[]; starterEmployees:number; starterCheapEmployees:number;
}
export interface ContentGapSignal { department:Department; kind:"POOL_DEPTH"|"REACTIVE_DEPTH"|"EARLY_EMPLOYEE_VARIETY"; detail:string; }
export interface ContentGapAudit { departments:DepartmentContentAudit[]; gaps:ContentGapSignal[]; }

export function analyzeContentGaps():ContentGapAudit {
  const departments=(['CUSTOMER_SERVICE','IT','OFFICE','MARKETING','PRODUCTION'] as Department[]);
  const audits=departments.map((department)=>{
    const cards=Object.values(alphaDefinitions).filter((card)=>card.department===department);
    const cardTypes={EMPLOYEE:0,ACTION:0,INCIDENT:0,SYSTEM:0} as Record<CardType,number>;
    const tags=new Map<string,number>();
    for(const card of cards){cardTypes[card.cardType]+=1;for(const tag of card.tags??[])tags.set(tag,(tags.get(tag)??0)+1);}
    const topTags=[...tags.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,2).map(([tag,count])=>({tag,cards:count}));
    const bridgeCards=topTags.length===2?cards.filter((card)=>topTags.every((entry)=>(card.tags??[]).includes(entry.tag))).map((card)=>card.id):[];
    const starter=Object.values(alphaDeckPresets).find((deck)=>deck.department===department);
    let starterEmployees=0,starterCheapEmployees=0;
    for(const entry of starter?.cards??[]){const def=alphaDefinitions[entry.definitionId];if(def?.cardType!=="EMPLOYEE")continue;starterEmployees+=entry.copies;if((def.cost?.play??0)<=2)starterCheapEmployees+=entry.copies;}
    return {department,totalCards:cards.length,cardTypes,cheapEmployeeDefinitions:cards.filter((card)=>card.cardType==="EMPLOYEE"&&(card.cost?.play??0)<=2).length,topTags,bridgeCards,starterEmployees,starterCheapEmployees};
  });
  const gaps:ContentGapSignal[]=[];
  for(const row of audits){
    if(row.totalCards<18)gaps.push({department:row.department,kind:"POOL_DEPTH",detail:`${row.totalCards} department cards; below the 18-card audit threshold.`});
    if(row.cardTypes.INCIDENT<=1)gaps.push({department:row.department,kind:"REACTIVE_DEPTH",detail:`Only ${row.cardTypes.INCIDENT} department Incident definition${row.cardTypes.INCIDENT===1?'':'s'}.`});
    if(row.cheapEmployeeDefinitions<3)gaps.push({department:row.department,kind:"EARLY_EMPLOYEE_VARIETY",detail:`Only ${row.cheapEmployeeDefinitions} department Employee definitions cost 2 or less.`});
  }
  return {departments:audits,gaps};
}

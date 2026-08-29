import type { SnapshotPersistence } from "./storage.js";

export type PaceRating = "TOO_FAST" | "GOOD" | "TOO_LONG";
export type DecisionRating = "LOW" | "GOOD" | "HIGH";
export interface HumanPlaytestFeedback { roomId:string; playerId:string; sessionId?:string; pace:PaceRating|null; oneSided:boolean|null; decisions:DecisionRating|null; note:string; cardIds:string[]; updatedAt:number; }
interface FeedbackSnapshot { version:1; entries:HumanPlaytestFeedback[]; }
function cleanText(value:unknown,max:number):string{return String(value??"").trim().slice(0,max)}
function cleanCards(value:unknown):string[]{return [...new Set((Array.isArray(value)?value:[]).map((v)=>cleanText(v,32)).filter(Boolean))].slice(0,12)}
export function normalizePlaytestFeedback(roomId:string,playerId:string,input:Partial<HumanPlaytestFeedback>,now=Date.now()):HumanPlaytestFeedback{
 const pace=input.pace==="TOO_FAST"||input.pace==="GOOD"||input.pace==="TOO_LONG"?input.pace:null;
 const decisions=input.decisions==="LOW"||input.decisions==="GOOD"||input.decisions==="HIGH"?input.decisions:null;
 return {roomId:cleanText(roomId,64).toUpperCase(),playerId:cleanText(playerId,128),sessionId:cleanText(input.sessionId,48)||undefined,pace,oneSided:typeof input.oneSided==="boolean"?input.oneSided:null,decisions,note:cleanText(input.note,600),cardIds:cleanCards(input.cardIds),updatedAt:now};
}
export class PlaytestFeedbackStore{
 private entries=new Map<string,HumanPlaytestFeedback>();
 constructor(private persistence?:SnapshotPersistence<FeedbackSnapshot>){const snap=persistence?.load();for(const entry of snap?.entries??[])this.entries.set(this.key(entry.roomId,entry.playerId),structuredClone(entry));}
 private key(roomId:string,playerId:string){return `${roomId.toUpperCase()}::${playerId}`;}
 private save(){this.persistence?.save({version:1,entries:[...this.entries.values()].map((e)=>structuredClone(e))});}
 get(roomId:string,playerId:string){const found=this.entries.get(this.key(roomId,playerId));return found?structuredClone(found):null;}
 upsert(roomId:string,playerId:string,input:Partial<HumanPlaytestFeedback>,now=Date.now()){const entry=normalizePlaytestFeedback(roomId,playerId,input,now);this.entries.set(this.key(entry.roomId,entry.playerId),entry);this.save();return structuredClone(entry);}
 list(){return [...this.entries.values()].map((e)=>structuredClone(e));}
}

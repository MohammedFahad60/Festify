import type {DiscoveryTicketType} from "@festify/types";
export function clampTicketQuantity(value:number){return Number.isFinite(value)?Math.max(0,Math.min(20,Math.floor(value))):0}
export function registrationPayload(eventId:string,quantities:Record<string,number>){return {eventId,items:Object.entries(quantities).filter(([,quantity])=>clampTicketQuantity(quantity)>0).map(([ticketTypeId,quantity])=>({ticketTypeId,quantity:clampTicketQuantity(quantity)}))}}
export function estimatedTotal(tickets:DiscoveryTicketType[],quantities:Record<string,number>){return tickets.reduce((sum,ticket)=>sum+Number(ticket.price)*clampTicketQuantity(quantities[ticket.id]??0),0)}
export function ticketStatusLabel(status:string){if(status==="ACTIVE")return "VALID";if(status==="USED")return "USED";if(status==="CANCELLED")return "CANCELLED";return status}
export function qrFallback(ticketNumber?:string,ticketCode?:string){return ticketNumber||ticketCode||"Ticket reference unavailable"}

import {describe,expect,it} from "vitest";
import {eventSchema,ticketTypeSchema} from "@festify/validation";

describe("organizer event contracts",()=>{
 it("rejects an event with an invalid date range",()=>{const result=eventSchema.safeParse({title:"Summer Sounds",slug:"summer-sounds",categoryId:"123e4567-e89b-12d3-a456-426614174000",startsAt:"2026-08-02T10:00:00.000Z",endsAt:"2026-08-01T10:00:00.000Z"});expect(result.success).toBe(false)});
 it("requires the backend event fields",()=>{expect(eventSchema.safeParse({title:"Missing fields"}).success).toBe(false)});
 it("accepts a valid draft event payload",()=>{expect(eventSchema.safeParse({title:"Summer Sounds",slug:"summer-sounds",categoryId:"123e4567-e89b-12d3-a456-426614174000",startsAt:"2026-08-01T10:00:00.000Z",endsAt:"2026-08-02T10:00:00.000Z",capacity:500}).success).toBe(true)});
 it("rejects negative ticket prices and zero quantity",()=>{const base={name:"General",price:-1,quantity:0,saleStart:"2026-07-01T00:00:00.000Z",saleEnd:"2026-08-01T00:00:00.000Z"};expect(ticketTypeSchema.safeParse(base).success).toBe(false)});
 it("rejects a reversed ticket sale window",()=>{expect(ticketTypeSchema.safeParse({name:"General",price:100,quantity:10,saleStart:"2026-08-02T00:00:00.000Z",saleEnd:"2026-08-01T00:00:00.000Z"}).success).toBe(false)});
});

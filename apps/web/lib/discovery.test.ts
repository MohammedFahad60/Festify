import {describe,expect,it} from "vitest";
import {discoveryQuery,normalizeDiscoveryParams} from "./discovery";

describe("event discovery URL contracts",()=>{
 it("keeps supported filters and rejects unsafe sort and numeric values",()=>{const params=normalizeDiscoveryParams(new URLSearchParams("search=music&city=Bengaluru&sort=price&priceMin=250&page=2"));expect(discoveryQuery(params)).toEqual({search:"music",city:"Bengaluru",priceMin:"250",sort:"price",page:"2"});const invalid=normalizeDiscoveryParams(new URLSearchParams("sort=created_at&priceMin=-1&page=zero"));expect(invalid.toString()).toBe("")});
 it("preserves only backend-supported sort values",()=>{expect(discoveryQuery(new URLSearchParams("sort=title&order=asc"))).toEqual({sort:"title",order:"asc"});expect(discoveryQuery(new URLSearchParams("sort=unknown&order=sideways"))).toEqual({})});
});

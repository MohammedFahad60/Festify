import {afterEach,describe,expect,it,vi} from "vitest";
import {shareEvent} from "./share";
afterEach(()=>vi.unstubAllGlobals());
describe("event sharing",()=>{it("uses Web Share when available",async()=>{const share=vi.fn().mockResolvedValue(undefined);vi.stubGlobal("navigator",{share});expect(await shareEvent("Event","https://festify.test/events/demo")).toBe("shared");expect(share).toHaveBeenCalledWith({title:"Event",url:"https://festify.test/events/demo"})});it("falls back to the clipboard",async()=>{const writeText=vi.fn().mockResolvedValue(undefined);vi.stubGlobal("navigator",{clipboard:{writeText}});expect(await shareEvent("Event","https://festify.test/events/demo")).toBe("copied");expect(writeText).toHaveBeenCalledWith("https://festify.test/events/demo")});});

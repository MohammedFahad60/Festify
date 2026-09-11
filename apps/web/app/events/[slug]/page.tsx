import type {Metadata} from "next";
import {EventDetail} from "@/components/events";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const title=decodeURIComponent(slug).replace(/-/g," ");return {title:`${title.replace(/\b\w/g,c=>c.toUpperCase())} | Festify`,description:"Event details, dates, venue information, and ticket options on Festify.",alternates:{canonical:`/events/${encodeURIComponent(slug)}`},openGraph:{title:`${title.replace(/\b\w/g,c=>c.toUpperCase())} | Festify`,description:"Discover this event on Festify."}}}
export default async function EventPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <EventDetail slug={slug}/>}

"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {OrganizerNav} from "@/components/organizer";
import {useAuth} from "@/lib/auth";
import {Skeleton} from "@/components/ui";
export default function OrganizerLayout({children}:{children:React.ReactNode}){const auth=useAuth();const router=useRouter();useEffect(()=>{if(!auth.isLoading&&!auth.isAuthenticated)router.replace("/login?next=/organizer" as never)},[auth.isLoading,auth.isAuthenticated,router]);if(auth.isLoading||!auth.isAuthenticated)return <Skeleton className="h-64 w-full"/>;return <div className="grid gap-8 lg:grid-cols-[210px_1fr]"><OrganizerNav/><div className="min-w-0">{children}</div></div>}

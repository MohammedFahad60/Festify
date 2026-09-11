"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/lib/auth";
export function AppProviders({children}:{children:React.ReactNode}){const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:30_000,retry:(count,error:any)=>count<1&&error?.code!=="UNAUTHENTICATED",refetchOnWindowFocus:false},mutations:{retry:0}}}));return <QueryClientProvider client={client}><AuthProvider>{children}</AuthProvider></QueryClientProvider>}

"use client";
import { createContext,useContext } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { User } from "@festify/types";
import { api } from "./api";
const AuthContext=createContext<{user:User|null;isLoading:boolean;isAuthenticated:boolean;logout:()=>Promise<void>}>({user:null,isLoading:true,isAuthenticated:false,logout:async()=>{}});
export function AuthProvider({children}:{children:React.ReactNode}){const qc=useQueryClient();const query=useQuery({queryKey:["auth","me"],queryFn:async()=>{const r=await api.get<User>("/api/v1/auth/me");if(!r.success){if(r.error?.code==="UNAUTHENTICATED")return null;throw new Error(r.error?.message||"Unable to load session");}return r.data??null;},retry:false});const logout=async()=>{await api.post("/api/v1/auth/logout");await qc.setQueryData(["auth","me"],null);};return <AuthContext.Provider value={{user:query.data??null,isLoading:query.isLoading,isAuthenticated:Boolean(query.data),logout}}>{children}</AuthContext.Provider>}
export function useAuth(){return useContext(AuthContext)}
export function useRequireAuth(){const auth=useAuth();const router=useRouter();if(!auth.isLoading&&!auth.isAuthenticated)router.replace("/login");return auth;}

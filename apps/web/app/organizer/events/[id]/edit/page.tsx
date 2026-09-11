"use client";
import {useParams} from "next/navigation";
import {EventForm} from "@/components/organizer";
import {useQuery} from "@tanstack/react-query";
import {api,friendlyError} from "@/lib/api";
import type {ManagedEvent} from "@festify/types";
import {ErrorState,Skeleton} from "@/components/ui";
export default function EditEventPage(){const {id}=useParams<{id:string}>();const query=useQuery({queryKey:["organizer","event",id],queryFn:async()=>{const r=await api.get<ManagedEvent>(`/api/v1/events/manage/${id}`);if(!r.success)throw new Error(friendlyError(r));return r.data!},enabled:Boolean(id)});if(query.isLoading)return <Skeleton className="h-80 w-full"/>;if(query.isError)return <ErrorState message="Event not found or you are not authorized to edit it." onRetry={()=>query.refetch()}/>;return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-3xl font-semibold">Edit event</h1><p className="mt-1 text-stone-500">Changes are validated by the backend and remain subject to event state rules.</p></div><EventForm event={query.data}/></div>}

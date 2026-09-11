import {EventForm} from "@/components/organizer";
export const metadata={title:"Create event | Festify"};
export default function NewEventPage(){return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-3xl font-semibold">Create event</h1><p className="mt-1 text-stone-500">New events are saved as drafts until you publish them.</p></div><EventForm/></div>}

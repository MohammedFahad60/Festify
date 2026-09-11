export type Role = "USER" | "ORGANIZER" | "ADMIN";
export type UserStatus = "ACTIVE" | "INACTIVE" | "BANNED" | "SUSPENDED";
export interface User { id:string; name:string; email:string; phone?:string|null; profileImage?:string|null; status:UserStatus; role?:Role; roles?:Role[]; }
export interface ApiError { code:string; message:string; details?:unknown; }
export interface ApiResponse<T> { success:boolean; data?:T; message?:string; error?:ApiError; meta?:PaginationMeta; status?:number; }
export interface PaginationMeta { page:number; limit:number; total:number; totalPages:number; hasNext:boolean; hasPrev:boolean; }
export interface Category { id:string; name:string; slug:string; sortOrder?:number; status?:string; }
export interface Event { id:string; title:string; slug:string; description?:string|null; city?:string|null; startsAt?:string; endsAt?:string; status:string; featured?:boolean; category?:Category; }
export interface Notification { id:string; title:string; message:string; readAt?:string|null; createdAt:string; }

/** Wire contract returned by the Phase 4 /events endpoints. DB-shaped timestamp names are intentional. */
export interface DiscoveryEvent { id:string; title:string; slug:string; description?:string|null; banner?:string|null; city?:string|null; starts_at:string; ends_at:string; status:string; featured:boolean; capacity?:number|null; category_name?:string|null; category_slug?:string|null; venue_name?:string|null; venue_city?:string|null; venue_state?:string|null; organizer_name?:string|null; }
export interface DiscoveryTicketType { id:string; name:string; description?:string|null; price:string|number; quantity:number; sold_quantity?:number; sale_start:string; sale_end:string; max_per_user?:number|null; status?:string; active?:boolean; }
export interface EventListResponse { success:boolean; rows?:DiscoveryEvent[]; meta?:PaginationMeta; error?:ApiError; message?:string; status?:number; }
export interface EventDetailResponse extends ApiResponse<DiscoveryEvent> {}
export interface CategoryListResponse extends ApiResponse<Category[]> {}
export interface TicketTypeListResponse extends ApiResponse<DiscoveryTicketType[]> {}

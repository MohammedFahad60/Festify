export type Role = "USER" | "ORGANIZER" | "ADMIN";
export type UserStatus = "ACTIVE" | "INACTIVE" | "BANNED" | "SUSPENDED";
export interface User { id:string; name:string; email:string; phone?:string|null; profileImage?:string|null; status:UserStatus; role?:Role; roles?:Role[]; }
export interface ApiError { code:string; message:string; details?:unknown; }
export interface ApiResponse<T> { success:boolean; data?:T; message?:string; error?:ApiError; meta?:PaginationMeta; status?:number; }
export interface PaginationMeta { page:number; limit:number; total:number; totalPages:number; hasNext:boolean; hasPrev:boolean; }
export interface Category { id:string; name:string; slug:string; sortOrder?:number; status:string; }
export interface Event { id:string; title:string; slug:string; description?:string|null; city?:string|null; startsAt:string; endsAt:string; status:string; featured:boolean; category?:Category; }
export interface Notification { id:string; title:string; message:string; readAt?:string|null; createdAt:string; }

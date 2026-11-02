export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = {
  public: {
    Tables: {
      users: { Row: { id:string; username:string; display_name:string; password_hash:string; bio:string; created_at:string }; Insert: { id?:string; username:string; display_name:string; password_hash:string; bio?:string; created_at?:string }; Update: { username?:string; display_name?:string; password_hash?:string; bio?:string }; Relationships:[] };
      user_sessions: { Row: { id:string; user_id:string; token_hash:string; expires_at:string; created_at:string }; Insert: { id?:string; user_id:string; token_hash:string; expires_at:string; created_at?:string }; Update: { expires_at?:string }; Relationships:[] };
      user_collections: { Row: { id:string; user_id:string; media_id:string; category:string; title:string; poster_url:string|null; source_url:string|null; season_count:number|null; status:string; progress:number; progress_total:number|null; rating:number|null; review:string|null; is_favorite:boolean; created_at:string; updated_at:string }; Insert: { id?:string; user_id:string; media_id:string; category:string; title:string; poster_url?:string|null; source_url?:string|null; season_count?:number|null; status?:string; progress?:number; progress_total?:number|null; rating?:number|null; review?:string|null; is_favorite?:boolean; created_at?:string; updated_at?:string }; Update: { status?:string; progress?:number; progress_total?:number|null; rating?:number|null; review?:string|null; is_favorite?:boolean; updated_at?:string }; Relationships:[] };
      user_activity: { Row: { id:string; user_id:string; action:string; title:string; category:string; created_at:string }; Insert: { id?:string; user_id:string; action:string; title:string; category:string; created_at?:string }; Update: { action?:string; title?:string; category?:string }; Relationships:[] };
      login_attempts: { Row: { id:string; username:string; ip_address:string; attempted_at:string }; Insert: { id?:string; username:string; ip_address:string; attempted_at?:string }; Update: { attempted_at?:string }; Relationships:[] };
    };
    Views: Record<string, never>;
    Functions: { allow_login_attempt: { Args:{p_username:string;p_ip:string}; Returns:boolean }; clear_login_attempts: { Args:{p_username:string;p_ip:string}; Returns:undefined } };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};


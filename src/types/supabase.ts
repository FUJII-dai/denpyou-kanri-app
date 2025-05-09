export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          order_number: number
          table_type: string
          table_num: number
          guests: number
          start_time: string
          end_time: string
          duration: string
          customer_name: string | null
          catch_casts: string[] | null
          referral_casts: string[] | null
          extensions: Json | null
          menus: Json | null
          cast_drinks: Json | null
          bottles: Json | null
          foods: Json | null
          drink_type: string
          drink_price: number
          karaoke_count: number | null
          note: string | null
          total_amount: number
          status: string
          payment_method: string | null
          payment_details: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_number: number
          table_type: string
          table_num: number
          guests: number
          start_time: string
          end_time: string
          duration: string
          customer_name?: string | null
          catch_casts?: string[] | null
          referral_casts?: string[] | null
          extensions?: Json | null
          menus?: Json | null
          cast_drinks?: Json | null
          bottles?: Json | null
          foods?: Json | null
          drink_type: string
          drink_price: number
          karaoke_count?: number | null
          note?: string | null
          total_amount: number
          status: string
          payment_method?: string | null
          payment_details?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          order_number?: number
          table_type?: string
          table_num?: number
          guests?: number
          start_time?: string
          end_time?: string
          duration?: string
          customer_name?: string | null
          catch_casts?: string[] | null
          referral_casts?: string[] | null
          extensions?: Json | null
          menus?: Json | null
          cast_drinks?: Json | null
          bottles?: Json | null
          foods?: Json | null
          drink_type?: string
          drink_price?: number
          karaoke_count?: number | null
          note?: string | null
          total_amount?: number
          status?: string
          payment_method?: string | null
          payment_details?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          id: string
          name: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_sales: {
        Row: {
          business_date: string
          total_sales: number
          cash_sales: number
          card_sales: number
          electronic_sales: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          business_date: string
          total_sales?: number
          cash_sales?: number
          card_sales?: number
          electronic_sales?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          business_date?: string
          total_sales?: number
          cash_sales?: number
          card_sales?: number
          electronic_sales?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      register_cash: {
        Row: {
          business_date: string
          starting_amount: number
          coins_amount: number
          withdrawals: Json
          next_day_amount: number
          next_day_coins: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          business_date: string
          starting_amount?: number
          coins_amount?: number
          withdrawals?: Json
          next_day_amount?: number
          next_day_coins?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          business_date?: string
          starting_amount?: number
          coins_amount?: number
          withdrawals?: Json
          next_day_amount?: number
          next_day_coins?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {
      execute_sql: {
        Args: {
          query: string
        }
        Returns: Json
      }
    }
    Enums: {}
  }
}

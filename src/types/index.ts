
export interface Client {
    id?: string;
    full_name: string;
    cpf: string;
    rg?: string;
    phone: string;
    email?: string;
    address_zip_code?: string;
    address_street?: string;
    created_at?: string;
}

export interface Reservation {
    id?: string;
    client_id?: string;
    check_in: Date;
    check_out: Date;
    guests_count: number;
    total_amount: number;
    deposit_amount?: number;
    deposit_date?: Date;
    payment_method?: string;
    status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
    notes?: string;
    client?: Client; // For joined queries
    created_at?: string;
}

export interface CalendarDay {
    date: Date;
    isOccupied: boolean;
    isPadding: boolean;
    reservation?: Reservation;
}

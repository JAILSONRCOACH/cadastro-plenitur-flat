
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Reservation } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export default function OccupancyCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReservations();
    }, [currentDate]);

    const fetchReservations = async () => {
        setLoading(true);
        const start = startOfMonth(currentDate).toISOString();
        const end = endOfMonth(currentDate).toISOString();

        // Fetch reservations that overlap with the current month
        // Logic: reservation_start <= month_end AND reservation_end >= month_start
        const { data, error } = await supabase
            .from('reservations')
            .select('*, client:clients(full_name)')
            .or(`check_in.lte.${end},check_out.gte.${start}`);

        if (error) {
            console.error('Error fetching reservations:', error);
        } else {
            // Cast the joined data correctly
            const typedData = data?.map(item => ({
                ...item,
                client: Array.isArray(item.client) ? item.client[0] : item.client
            })) as Reservation[];
            setReservations(typedData || []);
        }
        setLoading(false);
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
    });

    const getDayStatus = (day: Date) => {
        const dayReservations = reservations.filter(res =>
            isWithinInterval(day, { start: parseISO(res.check_in as any), end: parseISO(res.check_out as any) })
        );

        if (dayReservations.length === 0) return { status: 'free', label: 'Livre' };

        // If multiple, prioritize confirmed
        const confirmed = dayReservations.find(r => r.status === 'confirmed');
        if (confirmed) return { status: 'confirmed', label: confirmed.client?.full_name || 'Ocupado', reservation: confirmed };

        const pending = dayReservations.find(r => r.status === 'pending');
        if (pending) return { status: 'pending', label: pending.client?.full_name || 'Pendente', reservation: pending };

        return { status: 'other', label: 'Ocupado' };
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 my-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </h2>
                <div className="flex space-x-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="grid grid-cols-7 gap-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                        <div key={day} className="text-center font-semibold text-gray-400 text-sm py-2">
                            {day}
                        </div>
                    ))}

                    {/* Padding for start of month */}
                    {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                        <div key={`padding-${i}`} className="h-24 bg-gray-50 rounded-lg opacity-50" />
                    ))}

                    {daysInMonth.map(day => {
                        const { status, label } = getDayStatus(day);

                        let bgClass = "bg-green-50 hover:bg-green-100 border-green-200";
                        let textClass = "text-green-700";

                        if (status === 'confirmed') {
                            bgClass = "bg-red-50 hover:bg-red-100 border-red-200";
                            textClass = "text-red-700";
                        } else if (status === 'pending') {
                            bgClass = "bg-yellow-50 hover:bg-yellow-100 border-yellow-200";
                            textClass = "text-yellow-700";
                        }

                        return (
                            <div
                                key={day.toISOString()}
                                className={`h-24 p-2 border rounded-lg transition-all cursor-pointer flex flex-col justify-between ${bgClass}`}
                                title={label}
                            >
                                <span className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>
                                    {format(day, 'd')}
                                </span>

                                {status !== 'free' && (
                                    <span className={`text-xs truncate font-medium ${textClass}`}>
                                        {label}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-6 flex gap-4 text-sm text-gray-600">
                <div className="flex items-center"><div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div> Livre</div>
                <div className="flex items-center"><div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div> Pendente</div>
                <div className="flex items-center"><div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div> Confirmado</div>
            </div>
        </div>
    );
}


import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Client, Reservation } from '../types';
import { Search, Calendar, User, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ReservationForm() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [cepLoading, setCepLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        // Client
        full_name: '',
        cpf: '',
        rg: '',
        phone: '',
        email: '',
        address_zip_code: '',
        address_street: '',
        address_number: '',

        // Reservation
        check_in: '',
        check_out: '',
        guests_count: 1,

        // Financials
        total_amount: 0,
        deposit_amount: 0,
        deposit_date: '',
        payment_method: 'pix',
        notes: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // CEP Lookup
    const handleCepBlur = async () => {
        const cep = formData.address_zip_code.replace(/\D/g, '');
        if (cep.length !== 8) return;

        setCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            if (!data.erro) {
                setFormData(prev => ({
                    ...prev,
                    address_street: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`
                }));
            }
        } catch (error) {
            console.error("Erro ao buscar CEP", error);
        } finally {
            setCepLoading(false);
        }
    };

    // Auto-calculate deposit (50%)
    useEffect(() => {
        if (formData.total_amount > 0) {
            setFormData(prev => ({
                ...prev,
                deposit_amount: prev.total_amount / 2
            }));
        }
    }, [formData.total_amount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            // 1. Create or Update Client
            // Check if client exists by CPF
            const { data: existingClient } = await supabase
                .from('clients')
                .select('id')
                .eq('cpf', formData.cpf)
                .single();

            let clientId = existingClient?.id;

            if (!clientId) {
                const { data: newClient, error: clientError } = await supabase
                    .from('clients')
                    .insert([{
                        full_name: formData.full_name,
                        cpf: formData.cpf,
                        rg: formData.rg,
                        phone: formData.phone,
                        email: formData.email,
                        address_zip_code: formData.address_zip_code,
                        address_street: `${formData.address_street}, ${formData.address_number}`
                    }])
                    .select()
                    .single();

                if (clientError) throw clientError;
                clientId = newClient.id;
            } else {
                // Optionally update client info
                await supabase.from('clients').update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                    email: formData.email,
                    address_zip_code: formData.address_zip_code,
                    address_street: `${formData.address_street}, ${formData.address_number}`
                }).eq('id', clientId);
            }

            // 2. Create Reservation
            const { error: reservationError } = await supabase
                .from('reservations')
                .insert([{
                    client_id: clientId,
                    check_in: formData.check_in,
                    check_out: formData.check_out,
                    guests_count: formData.guests_count,
                    total_amount: formData.total_amount,
                    deposit_amount: formData.deposit_amount,
                    deposit_date: formData.deposit_date || null,
                    payment_method: formData.payment_method,
                    status: 'confirmed', // Assuming confirmed if manual entry
                    notes: formData.notes
                }]);

            if (reservationError) throw reservationError;

            setMessage({ type: 'success', text: 'Reserva cadastrada com sucesso!' });
            // Reset form or redirect
            setTimeout(() => {
                setStep(1);
                setFormData({
                    full_name: '', cpf: '', rg: '', phone: '', email: '', address_zip_code: '', address_street: '', address_number: '',
                    check_in: '', check_out: '', guests_count: 1, total_amount: 0, deposit_amount: 0, deposit_date: '', payment_method: 'pix', notes: ''
                });
                setMessage(null);
            }, 2000);

        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: `Erro: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100 my-8">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Nova Reserva</h2>
                <div className="flex items-center mt-4 text-sm font-medium text-gray-500">
                    <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : ''}`}>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mr-2 ${step >= 1 ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>1</span>
                        Cliente
                    </div>
                    <div className="w-8 h-0.5 bg-gray-200 mx-2" />
                    <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : ''}`}>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mr-2 ${step >= 2 ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>2</span>
                        Reserva
                    </div>
                    <div className="w-8 h-0.5 bg-gray-200 mx-2" />
                    <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : ''}`}>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mr-2 ${step >= 3 ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>3</span>
                        Financeiro
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* STEP 1: CLIENT */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-lg font-semibold flex items-center"><User className="w-5 h-5 mr-2" /> Dados do Hóspede</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">CPF</label>
                                <input required name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">RG</label>
                                <input name="rg" value={formData.rg} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                            <input required name="full_name" value={formData.full_name} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Telefone</label>
                                <input required name="phone" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">CEP</label>
                                    <div className="relative">
                                        <input name="address_zip_code" value={formData.address_zip_code} onChange={handleChange} onBlur={handleCepBlur} placeholder="00000-000" className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none pr-8" />
                                        {cepLoading && <Loader2 className="w-4 h-4 absolute right-2 top-3 animate-spin text-gray-400" />}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Logradouro</label>
                                    <input disabled name="address_street" value={formData.address_street} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-gray-50 text-gray-600" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Número/Complemento</label>
                                <input name="address_number" value={formData.address_number} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button type="button" onClick={nextStep} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Próximo</button>
                        </div>
                    </div>
                )}

                {/* STEP 2: RESERVATION */}
                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-lg font-semibold flex items-center"><Calendar className="w-5 h-5 mr-2" /> Detalhes da Estadia</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Check-in</label>
                                <input required type="date" name="check_in" value={formData.check_in} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Check-out</label>
                                <input required type="date" name="check_out" value={formData.check_out} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Quantidade de Hóspedes</label>
                            <input type="number" min="1" name="guests_count" value={formData.guests_count} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Observações</label>
                            <textarea rows={3} name="notes" value={formData.notes} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Necessita berço, check-in tardio..." />
                        </div>

                        <div className="flex justify-between pt-4">
                            <button type="button" onClick={prevStep} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">Voltar</button>
                            <button type="button" onClick={nextStep} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Próximo</button>
                        </div>
                    </div>
                )}

                {/* STEP 3: FINANCIAL */}
                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-lg font-semibold flex items-center"><CreditCard className="w-5 h-5 mr-2" /> Financeiro</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor Total (R$)</label>
                                <input required type="number" step="0.01" name="total_amount" value={formData.total_amount} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold text-green-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Forma de Pagamento</label>
                                <select name="payment_method" value={formData.payment_method} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="pix">PIX</option>
                                    <option value="credit_card">Cartão de Crédito</option>
                                    <option value="debit_card">Cartão de Débito</option>
                                    <option value="cash">Dinheiro</option>
                                    <option value="bank_transfer">Transferência</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                            <h4 className="font-medium text-gray-700">Sinal / Garantia</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600">Valor do Sinal (R$)</label>
                                    <input type="number" step="0.01" name="deposit_amount" value={formData.deposit_amount} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600">Data do Pagamento</label>
                                    <input type="date" name="deposit_date" value={formData.deposit_date} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        {formData.total_amount > 0 && (
                            <div className="flex justify-between items-center p-3 bg-blue-50 text-blue-800 rounded-md">
                                <span>Saldo Restante:</span>
                                <span className="font-bold text-lg">R$ {(formData.total_amount - formData.deposit_amount).toFixed(2)}</span>
                            </div>
                        )}

                        {message && (
                            <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <button type="button" onClick={prevStep} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">Voltar</button>
                            <button type="submit" disabled={loading} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                Confirmar Reserva
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}

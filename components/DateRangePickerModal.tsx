
import React, { useState, useMemo } from 'react';
import XIcon from './icons/XIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface DateRangePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    value: { start: Date | null; end: Date | null };
    onChange: (range: { start: Date | null; end: Date | null }) => void;
}

const isSameDay = (a: Date, b: Date) => 
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

const DateRangePickerModal: React.FC<DateRangePickerModalProps> = ({ isOpen, onClose, value, onChange }) => {
    const [viewDate, setViewDate] = useState(value.start || new Date());
    const [startDate, setStartDate] = useState(value.start);
    const [endDate, setEndDate] = useState(value.end);

    const calendarGrid = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

        const grid: (Date | null)[] = [];

        // Add nulls for days before the first of the month
        for (let i = 0; i < startDayOfWeek; i++) {
            grid.push(null);
        }

        // Add all days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            grid.push(new Date(year, month, i));
        }

        return grid;
    }, [viewDate]);
    
    const handleDayClick = (day: Date) => {
        if (!startDate || (startDate && endDate)) {
            setStartDate(day);
            setEndDate(null);
        } else if (startDate && !endDate) {
            if (day >= startDate) {
                setEndDate(day);
            } else {
                setStartDate(day);
            }
        }
    };
    
    const handleApply = () => {
        onChange({ start: startDate, end: endDate });
        onClose();
    };

    const handleMonthChange = (offset: number) => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Selecione o Período</h2>
                     <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
                        <XIcon className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full text-slate-500 hover:bg-gray-100"><ChevronLeftIcon className="w-5 h-5"/></button>
                    <span className="font-semibold text-lg text-slate-800">{viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full text-slate-500 hover:bg-gray-100"><ChevronRightIcon className="w-5 h-5"/></button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day,i) => <div key={i} className="font-medium text-slate-400">{day}</div>)}
                    {calendarGrid.map((day, index) => {
                        if (!day) return <div key={`empty-${index}`}></div>;
                        
                        const isStart = startDate && isSameDay(day, startDate);
                        const isEnd = endDate && isSameDay(day, endDate);
                        const isInRange = startDate && endDate && day > startDate && day < endDate;

                        const baseClasses = "w-9 h-9 flex items-center justify-center rounded-full cursor-pointer text-slate-700";
                        let dayClasses = "hover:bg-blue-100";
                        if(isStart || isEnd) dayClasses = "bg-blue-600 text-white font-bold";
                        else if (isInRange) dayClasses = "bg-blue-100 text-blue-700";

                        return (
                            <div key={index} onClick={() => handleDayClick(day)} className={`${baseClasses} ${dayClasses}`}>
                                {day.getDate()}
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end space-x-3 pt-6 mt-4 border-t border-slate-200">
                    <button onClick={onClose} className="btn-secondary">Cancelar</button>
                    <button onClick={handleApply} className="btn-primary" disabled={!startDate || !endDate}>Aplicar</button>
                </div>
            </div>
        </div>
    );
};

export default DateRangePickerModal;

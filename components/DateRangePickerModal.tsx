import React, { useState, useMemo, useEffect } from 'react';
import XIcon from './icons/XIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface DateRangePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    value: { start: Date | null; end: Date | null };
    onChange: (range: { start: Date | null; end: Date | null }) => void;
}

type View = 'days' | 'months' | 'years';

const isSameDay = (a: Date | null, b: Date | null) => 
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

const DateRangePickerModal: React.FC<DateRangePickerModalProps> = ({ isOpen, onClose, value, onChange }) => {
    const [view, setView] = useState<View>('days');
    const [viewDate, setViewDate] = useState(value.start || new Date());
    const [startDate, setStartDate] = useState(value.start);
    const [endDate, setEndDate] = useState(value.end);
    
    useEffect(() => {
        if(isOpen) {
            setStartDate(value.start);
            setEndDate(value.end);
            setViewDate(value.start || new Date());
            setView('days');
        }
    }, [isOpen, value]);

    const calendarGrid = useMemo(() => {
        const year = viewDate.getUTCFullYear();
        const month = viewDate.getUTCMonth();
        const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
        const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));
        const daysInMonth = lastDayOfMonth.getUTCDate();
        const startDayOfWeek = firstDayOfMonth.getUTCDay(); // 0 = Sunday

        const grid: (Date | null)[] = Array(startDayOfWeek).fill(null);
        for (let i = 1; i <= daysInMonth; i++) {
            grid.push(new Date(Date.UTC(year, month, i)));
        }
        return grid;
    }, [viewDate]);

    const monthsGrid = useMemo(() => {
        const year = viewDate.getUTCFullYear();
        return Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(year, i, 1)));
    }, [viewDate]);

    const yearsGrid = useMemo(() => {
        const startYear = Math.floor(viewDate.getUTCFullYear() / 10) * 10 - 1;
        return Array.from({ length: 12 }, (_, i) => startYear + i);
    }, [viewDate]);

    const handleDayClick = (day: Date) => {
        if (!startDate || (startDate && endDate)) {
            setStartDate(day);
            setEndDate(null);
        } else if (startDate && !endDate) {
            if (day >= startDate) setEndDate(day);
            else setStartDate(day);
        }
    };
    
    const handleMonthClick = (monthDate: Date) => {
        setViewDate(monthDate);
        setView('days');
    };
    
    const handleYearClick = (year: number) => {
        setViewDate(new Date(Date.UTC(year, viewDate.getUTCMonth(), 1)));
        setView('months');
    };

    const handleHeaderClick = () => {
        if (view === 'days') setView('months');
        if (view === 'months') setView('years');
    };

    const handleNav = (offset: number) => {
        if (view === 'days') setViewDate(prev => new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + offset, 1)));
        if (view === 'months') setViewDate(prev => new Date(Date.UTC(prev.getUTCFullYear() + offset, prev.getUTCMonth(), 1)));
        if (view === 'years') setViewDate(prev => new Date(Date.UTC(prev.getUTCFullYear() + offset * 10, prev.getUTCMonth(), 1)));
    };
    
    const handleApply = () => {
        if (startDate && !endDate) {
            onChange({ start: startDate, end: startDate });
        } else {
            onChange({ start: startDate, end: endDate });
        }
        onClose();
    };

    const getHeaderText = () => {
        if (view === 'days') return viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        if (view === 'months') return viewDate.getUTCFullYear();
        if (view === 'years') return `${yearsGrid[1]} - ${yearsGrid[10]}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Selecione o Período</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100"><XIcon className="w-5 h-5 text-slate-500" /></button>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => handleNav(-1)} className="p-2 rounded-full text-slate-500 hover:bg-gray-100"><ChevronLeftIcon className="w-5 h-5"/></button>
                    <button onClick={handleHeaderClick} className="font-semibold text-lg text-slate-800 hover:text-blue-600 transition-colors">{getHeaderText()}</button>
                    <button onClick={() => handleNav(1)} className="p-2 rounded-full text-slate-500 hover:bg-gray-100"><ChevronRightIcon className="w-5 h-5"/></button>
                </div>
                
                {view === 'days' && (
                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day,i) => <div key={i} className="font-medium text-slate-400 w-9 h-9 flex items-center justify-center">{day}</div>)}
                        {calendarGrid.map((day, index) => {
                            if (!day) return <div key={`empty-${index}`}></div>;
                            const isSelected = isSameDay(day, startDate) || isSameDay(day, endDate);
                            const isStart = isSameDay(day, startDate);
                            const isEnd = isSameDay(day, endDate);
                            const isInRange = startDate && endDate && day > startDate && day < endDate;
                            return (
                                <div key={index} className="flex justify-center items-center">
                                    <button 
                                        onClick={() => handleDayClick(day)} 
                                        className={`w-9 h-9 rounded-full text-slate-700 transition-colors
                                            ${isSelected ? 'bg-blue-600 text-white font-bold' : ''}
                                            ${isInRange ? 'bg-blue-100 text-blue-700 rounded-none' : ''}
                                            ${!isSelected && !isInRange ? 'hover:bg-blue-100' : ''}
                                            ${isStart && endDate ? 'rounded-r-none' : ''}
                                            ${isEnd && startDate ? 'rounded-l-none' : ''}
                                        `}>
                                        {day.getUTCDate()}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
                {view === 'months' && (
                    <div className="grid grid-cols-3 gap-2">
                        {monthsGrid.map((month, index) => (
                            <button key={index} onClick={() => handleMonthClick(month)} className="p-4 rounded-lg text-slate-700 hover:bg-blue-100 transition-colors">
                                {month.toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' })}
                            </button>
                        ))}
                    </div>
                )}
                {view === 'years' && (
                    <div className="grid grid-cols-4 gap-2">
                        {yearsGrid.map((year, index) => (
                            <button key={year} onClick={() => handleYearClick(year)} className={`p-3 rounded-lg transition-colors ${index === 0 || index === 11 ? 'text-slate-400' : 'text-slate-700 hover:bg-blue-100'}`}>
                                {year}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-6 mt-4 border-t border-slate-200">
                    <button onClick={onClose} className="btn-secondary">Cancelar</button>
                    <button onClick={handleApply} className="btn-primary" disabled={!startDate}>Aplicar</button>
                </div>
            </div>
        </div>
    );
};

export default DateRangePickerModal;
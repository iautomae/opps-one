import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    totalItems: number;
    indexOfLastItem: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (items: number) => void;
    className?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    indexOfLastItem,
    onPageChange,
    onItemsPerPageChange,
    className
}: PaginationProps) {
    return (
        <div className={cn("px-4 py-2 bg-gray-50/80 border-t border-gray-200 flex items-center justify-between shrink-0 backdrop-blur-md", className)}>
            <div className="flex items-center gap-2">
                <select
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                    className="bg-white border border-gray-300 rounded-md text-[10px] font-bold text-gray-700 py-0.5 pl-2 pr-6 outline-none focus:border-brand-primary h-6 cursor-pointer hover:border-brand-primary transition-colors"
                >
                    <option value={15}>15 Filas</option>
                    <option value={50}>50 Filas</option>
                    <option value={100}>100 Filas</option>
                </select>
                <p className="text-[10px] text-gray-400 font-medium ml-2">
                    {Math.min(indexOfLastItem, totalItems)} de {totalItems}
                </p>
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="p-1 rounded-md hover:bg-white hover:shadow-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                >
                    <ChevronsLeft size={14} />
                </button>
                <button
                    onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-md hover:bg-white hover:shadow-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                >
                    <ChevronLeft size={14} />
                </button>

                <div className="px-2 text-[10px] font-bold text-gray-600">
                    {currentPage} / {Math.max(1, totalPages)}
                </div>

                <button
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage >= totalPages || totalPages === 0}
                    className="p-1 rounded-md hover:bg-white hover:shadow-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                >
                    <ChevronRight size={14} />
                </button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage >= totalPages || totalPages === 0}
                    className="p-1 rounded-md hover:bg-white hover:shadow-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                >
                    <ChevronsRight size={14} />
                </button>
            </div>
        </div>
    );
}

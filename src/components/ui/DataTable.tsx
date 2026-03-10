import { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface DataTableHeader {
    label: string | ReactNode;
    width?: string;
    className?: string;
}

interface DataTableProps {
    headers: DataTableHeader[];
    children: ReactNode;
    className?: string;
}

export function DataTable({ headers, children, className }: DataTableProps) {
    return (
        <div className="flex-1 overflow-auto">
            <table className={cn("w-full text-left border-collapse table-auto", className)}>
                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                    <tr>
                        {headers.map((header, index) => {
                            const isFirst = index === 0;
                            return (
                                <th
                                    key={index}
                                    className={cn(
                                        "px-2 py-3 text-[10px] font-bold uppercase tracking-tight bg-gray-50/50 border-b whitespace-nowrap",
                                        isFirst ? "text-gray-900 border-gray-200" : "text-gray-500 border-gray-100 border-l",
                                        header.className
                                    )}
                                    style={header.width ? { width: header.width } : undefined}
                                >
                                    {header.label}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {children}
                </tbody>
            </table>
        </div>
    );
}

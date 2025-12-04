import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Table = ({
    columns,
    data,
    onRowClick,
    className
}) => {
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    const handleSort = (columnKey) => {
        if (sortColumn === columnKey) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnKey);
            setSortDirection('asc');
        }
    };

    const sortedData = React.useMemo(() => {
        if (!sortColumn) return data;

        return [...data].sort((a, b) => {
            const aVal = a[sortColumn];
            const bVal = b[sortColumn];

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortColumn, sortDirection]);

    return (
        <div className={cn('overflow-x-auto', className)}>
            <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-white/5">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                onClick={() => column.sortable && handleSort(column.key)}
                                className={cn(
                                    'px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider',
                                    column.sortable && 'cursor-pointer hover:text-white transition-colors'
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {column.label}
                                    {column.sortable && sortColumn === column.key && (
                                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {sortedData.map((row, index) => (
                        <tr
                            key={index}
                            onClick={() => onRowClick?.(row)}
                            className={cn(
                                'hover:bg-white/5 transition-colors',
                                onRowClick && 'cursor-pointer'
                            )}
                        >
                            {columns.map((column) => (
                                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                    {column.render ? column.render(row) : row[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {sortedData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No data available
                </div>
            )}
        </div>
    );
};

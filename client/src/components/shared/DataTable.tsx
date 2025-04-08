import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
  EyeOff
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterPlaceholder?: string;
  hideGlobalFilter?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterPlaceholder = "Search...",
  hideGlobalFilter = false
}: DataTableProps<TData, TValue>) {
  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Get visible columns for default visibility logic
  const visibleColumns = useMemo(() => {
    if (Object.keys(columnVisibility).length === 0 && columns.length > 0) {
      // Set initial visibility with Actions column always visible
      const defaultVisibility: VisibilityState = {};
      
      // Process all columns and set visibility
      columns.forEach((col, index) => {
        // Safe column ID access
        const colId = col.id || index.toString();
        
        // Check if this is the actions column
        const isActionsColumn = colId === 'actions';
        
        // Show first 5 columns and always show actions column
        defaultVisibility[colId] = isActionsColumn || index < 5;
      });
      
      setColumnVisibility(defaultVisibility);
      return defaultVisibility;
    }
    return columnVisibility;
  }, [columnVisibility, columns]);

  // Initialize table
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility: visibleColumns,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        {!hideGlobalFilter && (
          <div className="relative max-w-md w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={filterPlaceholder}
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8"
            />
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-1">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Columns</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            {/* Organize columns with Actions at the top */}
            {(() => {
              // Get all columns that can be hidden
              const hideableColumns = table.getAllColumns().filter(column => column.getCanHide());
              
              // Find the actions column
              const actionsColumn = hideableColumns.find(column => column.id === 'actions');
              // Get all other columns
              const otherColumns = hideableColumns.filter(column => column.id !== 'actions');
              
              // Sort columns: Actions first, then others
              const sortedColumns = actionsColumn ? [actionsColumn, ...otherColumns] : hideableColumns;
              
              return sortedColumns.map(column => {
                // Format column name for display
                const displayName = column.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                
                // Highlight actions column
                const isActionsColumn = column.id === 'actions';
                
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    className={`capitalize ${isActionsColumn ? 'font-semibold' : ''}`}
                  >
                    {isActionsColumn ? '→ Actions' : displayName}
                  </DropdownMenuCheckboxItem>
                );
              });
            })()}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <div className="h-[550px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? "flex items-center gap-1 cursor-pointer select-none"
                              : ""
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: <ChevronUp className="h-4 w-4" />,
                            desc: <ChevronDown className="h-4 w-4" />,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <div className="flex flex-col items-center py-4">
                      <EyeOff className="h-10 w-10 text-gray-300 mb-2" />
                      <p className="text-lg font-medium text-gray-500">No data to display</p>
                      <p className="text-sm text-gray-400">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Showing {table.getFilteredRowModel().rows.length} of {data.length} rows
      </div>
    </div>
  );
}

export default DataTable;

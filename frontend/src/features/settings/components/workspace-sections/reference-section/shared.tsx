import { SearchToolbar } from '@/shared/components/search-toolbar';
import { Button } from '@/shared/ui/button';

export function ReferenceSearchToolbar({ search, onSearchChange, title, searchPlaceholder, countLabel, metaItems, filterValue, filterOptions, onFilterChange, onReset }: {
  search: string;
  onSearchChange: (value: string) => void;
  title: string;
  searchPlaceholder: string;
  countLabel: string;
  metaItems: string[];
  filterValue: string;
  filterOptions: Array<[string, string]>;
  onFilterChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <SearchToolbar
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      title={title}
      description=""
      actions={<span className="nav-pill">{countLabel}</span>}
      meta={<>{metaItems.map((item) => <span key={item} className="toolbar-meta-pill">{item}</span>)}</>}
      onReset={onReset}
    >
      <div className="filter-chip-row toolbar-chip-row">
        {filterOptions.map(([value, label]) => (
          <Button key={value} type="button" variant={filterValue === value ? 'primary' : 'secondary'} onClick={() => onFilterChange(value)}>{label}</Button>
        ))}
      </div>
    </SearchToolbar>
  );
}

export function ReferenceStats({ items }: { items: Array<[string, number]> }) {
  return (
    <div className="stats-grid mini-stats-grid settings-reference-stats">
      {items.map(([label, value]) => <div key={label} className="stat-card"><span>{label}</span><strong>{value}</strong></div>)}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { SearchableCombobox, ComboboxOption } from './searchable-combobox';

export type AsyncSearchableComboboxProps<T extends ComboboxOption> = Omit<React.ComponentProps<typeof SearchableCombobox<T>>, 'options' | 'search'> & {
  fetchOptions: (query: string) => Promise<T[]>;
  debounceMs?: number;
  defaultOptions?: T[];
};

export function AsyncSearchableCombobox<T extends ComboboxOption>({
  fetchOptions,
  debounceMs = 300,
  defaultOptions = [],
  ...props
}: AsyncSearchableComboboxProps<T>) {
  const [options, setOptions] = useState<T[]>(defaultOptions);
  const fetchOptionsRef = useRef(fetchOptions);

  useEffect(() => {
    fetchOptionsRef.current = fetchOptions;
  }, [fetchOptions]);

  useEffect(() => {
    let isActive = true;
    const query = props.value.trim();

    const handler = setTimeout(async () => {
      try {
        const results = await fetchOptionsRef.current(query);
        if (isActive) {
          setOptions(results);
        }
      } catch (e) {
        console.error('Error fetching async options:', e);
      }
    }, debounceMs);

    return () => {
      isActive = false;
      clearTimeout(handler);
    };
  }, [props.value, debounceMs]);

  return (
    <SearchableCombobox
      {...props}
      options={options}
      search={() => true}
    />
  );
}

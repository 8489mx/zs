import { useQuery } from '@tanstack/react-query';
import { kdsApi, KdsTicket } from '@/features/pos/api/kds.api';

export function useOrderStatusBoard() {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['order-status-board-tickets'],
    queryFn: () => kdsApi.getTickets(),
    refetchInterval: 4_000,
  });

  const tickets: KdsTicket[] = data?.tickets || [];
  const preparingTickets = tickets.filter((t) => t.status === 'pending' || t.status === 'cooking');
  const readyTickets = tickets.filter((t) => t.status === 'ready');

  return {
    tickets,
    preparingTickets,
    readyTickets,
    isFetching,
    refetch,
  };
}

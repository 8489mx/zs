import { useParams } from 'react-router-dom';
import { EditProductForm } from '@/features/products/components/EditProductForm';

export function EditProductPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) return null;

  return <EditProductForm productId={id} mode="page" />;
}


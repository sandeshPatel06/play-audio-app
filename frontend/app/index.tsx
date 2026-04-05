import { useEffect } from 'react';
import { useSafeRouterPush } from '../hooks/useSafeRouterPush';

export default function Entry() {
  const safePush = useSafeRouterPush();
  
  useEffect(() => {
    safePush('/(tabs)');
  }, [safePush]);
  
  return null;
}

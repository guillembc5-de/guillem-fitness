import { Redirect } from 'expo-router';

/** La app abre en la pestaña de Entreno. */
export default function Index() {
  return <Redirect href="/entreno" />;
}

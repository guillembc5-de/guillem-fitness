import { Alert, Linking } from 'react-native';

/**
 * Dónde publica GitHub la última versión «release» (ver .github/workflows/ios-build.yml).
 * Si algún día cambias el repositorio de sitio, cambia solo esta línea.
 */
export const GITHUB_REPO = 'guillembc5-de/guillem-fitness';
export const LATEST_IPA_URL = `https://github.com/${GITHUB_REPO}/releases/download/ultima/GuillemFitness.ipa`;

/**
 * Abre SideStore para que instale la última versión encima de esta (sin
 * perder datos). LocalDevVPN tiene que estar conectada.
 */
export async function updateWithSideStore(): Promise<void> {
  try {
    await Linking.openURL(`sidestore://install?url=${LATEST_IPA_URL}`);
  } catch {
    Alert.alert(
      'No encuentro SideStore',
      'Para actualizar desde el iPhone necesitas SideStore (ver la guía). También puedes descargar la última versión e instalarla con Sideloadly.',
      [
        { text: 'Cerrar', style: 'cancel' },
        { text: 'Descargar', onPress: () => void Linking.openURL(LATEST_IPA_URL) },
      ],
    );
  }
}

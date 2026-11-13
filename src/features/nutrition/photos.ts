import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { photoFileName } from '@/domain/dishGallery';
import { newId } from '@/lib/ids';

/** Lado largo máximo de la foto que se envía a la IA. */
const MAX_SIDE = 1024;
const JPEG_QUALITY = 0.7;

export type PickResult = { status: 'ok'; uri: string; width: number; height: number } | { status: 'cancelled' } | { status: 'denied' };

/** Hace una foto o la elige de la galería. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickResult> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { status: 'cancelled' };
  return { status: 'ok', uri: asset.uri, width: asset.width, height: asset.height };
}

function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'meal-photos');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/**
 * Reduce la foto a 1024 px por el lado largo y la comprime en JPEG (de varios
 * MB a ~150 KB). La guarda en la carpeta de la app para poder reintentarla
 * si ahora no hay conexión. Devuelve su ruta y su contenido en base64.
 */
export async function preparePhoto(photo: { uri: string; width: number; height: number }): Promise<{ uri: string; base64: string }> {
  const context = ImageManipulator.manipulate(photo.uri);
  const longest = Math.max(photo.width, photo.height);
  if (longest > MAX_SIDE) {
    context.resize(photo.width >= photo.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG, base64: true });
  const destination = new File(photosDir(), `${newId()}.jpg`);
  await new File(saved.uri).copy(destination);
  return { uri: destination.uri, base64: saved.base64 ?? (await destination.base64()) };
}

/**
 * Ruta actual de una foto guardada. iOS cambia la carpeta de la app cada vez
 * que se reinstala (con Sideloadly, cada 7 días), así que la ruta completa
 * que se guardó deja de valer: se reconstruye con el nombre del archivo.
 */
export function resolvePhotoUri(stored: string): string {
  try {
    const current = new File(photosDir(), photoFileName(stored));
    return current.exists ? current.uri : stored;
  } catch {
    return stored;
  }
}

/** Contenido en base64 de una foto ya guardada (para reintentar una pendiente). */
export async function readPhotoBase64(uri: string): Promise<string> {
  return new File(resolvePhotoUri(uri)).base64();
}

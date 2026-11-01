/**
 * Camera, gallery and photo file storage.
 *
 * HOW PHOTOS ARE STORED
 * 1. The camera / gallery returns a URI in a TEMPORARY cache folder that the
 *    operating system may clear at any time.
 * 2. When the page is saved we COPY each image into the app's private
 *    document folder:  <documents>/photos/<random-uuid>.jpg
 * 3. Only that file path is stored in the SQLite "photos" table.
 * The document folder is private to CopNote and is kept until the app is
 * uninstalled. Photos are not added to the phone's public gallery.
 */
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export class PermissionDeniedError extends Error {}

const PICKER_OPTIONS = { mediaTypes: ['images'], quality: 0.6 }; // 0.6 keeps files small

const photosDir = () => {
  const dir = new Directory(Paths.document, 'photos');
  dir.create({ idempotent: true });
  return dir;
};

/** Returns an array of temporary URIs (empty if the officer cancelled). */
export async function takePhoto() {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) throw new PermissionDeniedError('Camera permission is off. Enable it in Settings > Apps > CopNote.');
  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  return result.canceled ? [] : result.assets.map((a) => a.uri);
}

export async function pickFromGallery(limit) {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) throw new PermissionDeniedError('Photo library permission is off. Enable it in Settings > Apps > CopNote.');
  const result = await ImagePicker.launchImageLibraryAsync({
    ...PICKER_OPTIONS,
    allowsMultipleSelection: true,
    selectionLimit: limit,
  });
  return result.canceled ? [] : result.assets.map((a) => a.uri);
}

/** Copy a temporary image into permanent private storage; returns the new URI. */
export async function persistPhoto(tempUri) {
  const source = new File(tempUri);
  const extension = (source.extension || '.jpg').toLowerCase();
  const destination = new File(photosDir(), `${Crypto.randomUUID()}${extension}`);
  await source.copy(destination);
  return destination.uri;
}

export function deletePhotoFile(uri) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A missing file should not stop the officer deleting a draft.
  }
}

/** Used by the PDF export: embed images as base64 so they print on iOS too. */
export async function photoAsDataUri(uri) {
  try {
    const base64 = await new File(uri).base64();
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}

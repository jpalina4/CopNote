/**
 * Optional GPS capture.
 *
 * GPS works OFFLINE: the phone gets its position from satellites, not the
 * internet. We store raw latitude/longitude only. Turning coordinates into
 * a street address (reverse geocoding) usually needs a network, so the
 * officer types the place name themselves.
 */
import * as Location from 'expo-location';

export async function getCurrentCoords() {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) return { ok: false, reason: 'Location permission denied. Enter the location manually.' };

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { latitude, longitude } = position.coords;
    return { ok: true, latitude, longitude };
  } catch {
    // Indoors or with GPS switched off, fall back to the last known fix.
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    if (last) return { ok: true, latitude: last.coords.latitude, longitude: last.coords.longitude };
    return { ok: false, reason: 'Could not get a GPS fix. Check that Location is on, or enter it manually.' };
  }
}

export const formatCoords = (lat, lng) =>
  lat == null || lng == null ? '' : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

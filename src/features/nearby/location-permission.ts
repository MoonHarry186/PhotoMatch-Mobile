import * as Location from 'expo-location';

import type { PutLocationDto } from '@/generated/api/types.gen';

export type LocationPermissionState =
  'undetermined' | 'granted' | 'denied' | 'restricted' | 'services-disabled';

type PermissionSnapshot = Pick<
  Location.LocationPermissionResponse,
  'status' | 'canAskAgain'
> & {
  servicesEnabled: boolean;
};

export function resolveLocationPermission(
  snapshot: PermissionSnapshot,
): LocationPermissionState {
  if (!snapshot.servicesEnabled) return 'services-disabled';
  if (snapshot.status === Location.PermissionStatus.GRANTED) return 'granted';
  if (snapshot.status === Location.PermissionStatus.UNDETERMINED)
    return 'undetermined';
  return snapshot.canAskAgain ? 'denied' : 'restricted';
}

async function resolveWith(
  permission: Location.LocationPermissionResponse,
): Promise<LocationPermissionState> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  return resolveLocationPermission({ ...permission, servicesEnabled });
}

export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  return resolveWith(await Location.getForegroundPermissionsAsync());
}

export async function requestLocationPermission(): Promise<LocationPermissionState> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) return 'services-disabled';
  return resolveWith(await Location.requestForegroundPermissionsAsync());
}

export async function captureCurrentLocation(): Promise<PutLocationDto> {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    ...(location.coords.accuracy !== null
      ? { accuracyMeters: location.coords.accuracy }
      : {}),
    capturedAt: new Date(location.timestamp).toISOString(),
  };
}

/**
 * Permission Helpers
 *
 * Handles Android runtime permissions for gallery access and storage.
 * Android 13+ uses granular media permissions (READ_MEDIA_IMAGES)
 * while older versions use READ_EXTERNAL_STORAGE.
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';

export async function requestGalleryPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const androidVersion = Platform.Version;

    if (androidVersion >= 33) {
      // Android 13+ — granular media permissions
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        {
          title: 'Photo Access',
          message:
            'We need access to your photos to help you pick the perfect picture for your greeting card.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      // Android 12 and below
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Photo Access',
          message:
            'We need access to your photos to help you pick the perfect picture for your greeting card.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (error) {
    console.error('[Permissions] Failed to request gallery permission:', error);
    return false;
  }
}

export async function requestStorageWritePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    // Android 10+ uses scoped storage — no write permission needed
    if (Platform.Version >= 29) return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Access',
        message:
          'We need storage access to save your greeting card to your gallery.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('[Permissions] Failed to request storage permission:', error);
    return false;
  }
}

export function showPermissionDeniedAlert() {
  Alert.alert(
    'Permission Required',
    'Please enable photo access in your device Settings to use this feature.\n\nSettings > Apps > Greeting Card > Permissions',
    [{ text: 'OK' }]
  );
}

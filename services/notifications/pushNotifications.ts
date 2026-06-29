/**
 * Registers the device for Expo push notifications and sends the token to the backend.
 * Call this once after the user logs in successfully.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { savePushToken } from '../api/usersApi';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Persist on backend so server can send notifications
  try {
    await savePushToken(token);
  } catch (err) {
    console.warn('Could not save push token to backend', err);
  }

  return token;
}

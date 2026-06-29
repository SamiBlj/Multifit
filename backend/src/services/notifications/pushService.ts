/**
 * Expo Push Notification service.
 * Used for daily meal reminders and plan-ready alerts.
 */
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export async function sendDailyMealNotification(pushToken: string, firstMealName: string) {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.warn(`Invalid Expo push token: ${pushToken}`);
    return;
  }

  await sendNotification(pushToken, {
    title: "Today's plan is ready 🥗",
    body: `Start with ${firstMealName}. Tap to see your full day.`,
    data: { screen: 'nutrition' },
  });
}

export async function sendWorkoutReminder(pushToken: string, workoutFocus: string) {
  if (!Expo.isExpoPushToken(pushToken)) return;

  await sendNotification(pushToken, {
    title: "Time to train 💪",
    body: `Today: ${workoutFocus}. Tap to view your workout.`,
    data: { screen: 'workouts' },
  });
}

async function sendNotification(token: string, message: Omit<ExpoPushMessage, 'to'>) {
  const chunks = expo.chunkPushNotifications([{ to: token, sound: 'default', ...message }]);

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      for (const receipt of receipts) {
        if (receipt.status === 'error') {
          console.error('Push notification error:', receipt.message, receipt.details);
        }
      }
    } catch (err) {
      console.error('Failed to send push notification chunk', err);
    }
  }
}

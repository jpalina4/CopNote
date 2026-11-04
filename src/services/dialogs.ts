/**
 * Pop-up messages that work on phones and in a browser.
 *
 * React Native's Alert.alert does nothing on web, so a confirmation built on
 * it would never run its action there. The browser gets its own dialogs.
 */
import { Alert, Platform } from 'react-native';

export function showMessage(title: string, message: string): void {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function confirmAction({ title, message, confirmText, cancelText = 'Cancel', destructive = false, onConfirm }: ConfirmOptions): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

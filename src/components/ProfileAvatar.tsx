/**
 * The officer's round profile picture. Shows the picture they chose, then any
 * picture shipped with the app, then their initials. Pressing it lets them
 * choose or replace the picture.
 */
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { initials } from '../utils/officerHelpers';
import { colors, spacing } from './theme';

const SIZE = 88;

/** Pictures shipped with the app, by regimental number, so a demo officer's shows on any device. */
const BUNDLED_PHOTOS: Record<string, ImageSourcePropType> = {
  '16237': require('../../assets/johnson-palina.jpg'),
};

interface ProfileAvatarProps {
  name: string;
  regimentalNumber: string;
  uri: string | null;
  onPress: () => void;
  busy?: boolean;
}

export default function ProfileAvatar({ name, regimentalNumber, uri, onPress, busy = false }: ProfileAvatarProps) {
  const source = uri ? { uri } : BUNDLED_PHOTOS[regimentalNumber];
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={source ? 'Change your profile picture' : 'Add a profile picture'}
      accessibilityState={{ disabled: busy, busy }}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.8 }]}
    >
      {source ? (
        <Image source={source} style={styles.circle} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.circle}>
          <Text style={styles.initials}>{initials(name)}</Text>
        </View>
      )}
      <View style={styles.badge}>
        {busy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={16} color="#fff" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, marginBottom: spacing.md },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#fff', fontSize: 32, fontWeight: '700' },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.brandRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

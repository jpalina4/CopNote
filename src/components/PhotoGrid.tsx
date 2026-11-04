/**
 * Photo thumbnails with a full-screen viewer.
 * If `onRemove` is passed (draft pages only) each thumbnail shows a remove
 * button; on saved pages it is omitted, so photos are view-only.
 */
import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, MIN_TOUCH, radius, spacing, type } from './theme';

/** Saved photos have an id; photos still being added in the editor have a key. */
export interface GridPhoto {
  uri: string;
  id?: number;
  key?: string;
}

interface PhotoGridProps {
  photos: GridPhoto[];
  onRemove?: (index: number) => void;
}

export default function PhotoGrid({ photos, onRemove }: PhotoGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (photos.length === 0) return <Text style={[type.small, styles.none]}>No photos attached.</Text>;

  return (
    <View>
      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <View key={photo.key ?? photo.id ?? photo.uri} style={styles.thumbWrap}>
            <Pressable onPress={() => setOpenIndex(index)} accessibilityRole="imagebutton" accessibilityLabel={`Photo ${index + 1}, open full screen`}>
              <Image source={{ uri: photo.uri }} style={styles.thumb} />
            </Pressable>
            {onRemove ? (
              <Pressable
                onPress={() => onRemove(index)}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${index + 1}`}
                hitSlop={8}
                style={styles.remove}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <Modal visible={openIndex !== null} transparent animationType="fade" onRequestClose={() => setOpenIndex(null)}>
        <View style={styles.viewer}>
          {openIndex !== null ? <Image source={{ uri: photos[openIndex].uri }} style={styles.full} resizeMode="contain" /> : null}
          <View style={styles.viewerBar}>
            <Pressable
              disabled={openIndex === 0}
              onPress={() => setOpenIndex((i) => (i ?? 0) - 1)}
              accessibilityLabel="Previous photo"
              style={styles.viewerBtn}
            >
              <Ionicons name="chevron-back" size={28} color={openIndex === 0 ? '#666' : '#fff'} />
            </Pressable>
            <Text style={styles.viewerText}>
              {(openIndex ?? 0) + 1} / {photos.length}
            </Text>
            <Pressable
              disabled={openIndex === photos.length - 1}
              onPress={() => setOpenIndex((i) => (i ?? 0) + 1)}
              accessibilityLabel="Next photo"
              style={styles.viewerBtn}
            >
              <Ionicons name="chevron-forward" size={28} color={openIndex === photos.length - 1 ? '#666' : '#fff'} />
            </Pressable>
            <Pressable onPress={() => setOpenIndex(null)} accessibilityLabel="Close photo" style={styles.viewerBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  none: { marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  thumbWrap: { position: 'relative' },
  thumb: { width: 100, height: 100, borderRadius: radius.sm, backgroundColor: colors.border },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  full: { flex: 1, width: '100%' },
  viewerBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: spacing.xl },
  viewerBtn: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  viewerText: { color: '#fff', fontSize: 16 },
});

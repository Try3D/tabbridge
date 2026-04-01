import { Image, StyleSheet, Text, View } from 'react-native'
import { colors } from '@/lib/theme'
import type { TabData } from '@/lib/api'

interface Props {
  tab: TabData
}

function hostname(url: string) {
  try { return new URL(url).hostname } catch { return url }
}

export function TabRow({ tab }: Props) {
  return (
    <View style={styles.row}>
      <FavIcon url={tab.favIconUrl} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{tab.title || '(untitled)'}</Text>
        <Text style={styles.url} numberOfLines={1}>{hostname(tab.url)}</Text>
      </View>
      {tab.active && <View style={styles.activeDot} />}
    </View>
  )
}

function FavIcon({ url }: { url: string }) {
  if (!url) return <View style={styles.placeholder} />
  return (
    <Image
      source={{ uri: url }}
      style={styles.favicon}
      onError={() => {}}
    />
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface0,
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 3,
    flexShrink: 0,
  },
  placeholder: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: colors.surface1,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    overflow: 'hidden',
  },
  title: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  url: {
    fontSize: 11,
    color: colors.overlay0,
    marginTop: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
    flexShrink: 0,
  },
})

import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  tokenizeCommunityContent,
  type MobileCommunityPostLinkPreview,
  type MobileCommunityPostMedia,
  type MobileCommunityPostMention,
} from '@kurecal/domain';

import { summarizeCommunityPost } from '../lib/communityPresentation';

interface CommunityRichPostContentProps {
  content: string;
  linkPreviews?: MobileCommunityPostLinkPreview[];
  media?: MobileCommunityPostMedia[];
  mentions?: MobileCommunityPostMention[];
  numberOfLines?: number;
  textVariant?: 'body' | 'post';
}

function openUrl(url: string) {
  void Linking.openURL(url);
}

function getHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function CommunityRichPostContent({
  content,
  linkPreviews = [],
  media = [],
  mentions = [],
  numberOfLines,
  textVariant = 'body',
}: CommunityRichPostContentProps) {
  const displayContent = numberOfLines ? summarizeCommunityPost(content) : content;
  const segments = tokenizeCommunityContent(displayContent, mentions);

  return (
    <View style={styles.wrap}>
      {displayContent ? (
        <Text
          numberOfLines={numberOfLines}
          style={[styles.body, textVariant === 'post' ? styles.postBody : null]}
        >
          {segments.map((segment, index) => {
            if (segment.type === 'url') {
              return (
                <Text
                  key={`${segment.type}-${index}`}
                  onPress={() => openUrl(segment.url)}
                  style={styles.link}
                >
                  {segment.text}
                </Text>
              );
            }

            if (segment.type === 'mention') {
              return (
                <Text
                  key={`${segment.type}-${index}`}
                  onPress={() => router.push(`/profile/${segment.username}`)}
                  style={styles.mention}
                >
                  {segment.text}
                </Text>
              );
            }

            return <Text key={`${segment.type}-${index}`}>{segment.text}</Text>;
          })}
        </Text>
      ) : null}

      {media.length ? (
        <View style={styles.mediaGrid}>
          {media.slice(0, 4).map((item, index) => (
            <Image
              key={item.id ?? item.path}
              source={{ uri: item.url }}
              style={[
                styles.mediaImage,
                media.length === 1 ? styles.mediaImageSingle : null,
                media.length > 1 ? styles.mediaImageGrid : null,
                index > 1 ? styles.mediaImageLower : null,
              ]}
            />
          ))}
        </View>
      ) : null}

      {linkPreviews.slice(0, 1).map((preview) => (
        <Pressable
          key={preview.id ?? preview.url}
          onPress={() => openUrl(preview.url)}
          style={({ pressed }) => [
            styles.linkPreview,
            pressed ? styles.linkPreviewPressed : null,
          ]}
        >
          {preview.imageUrl ? (
            <Image source={{ uri: preview.imageUrl }} style={styles.linkPreviewImage} />
          ) : null}
          <View style={styles.linkPreviewText}>
            <Text numberOfLines={1} style={styles.linkPreviewHost}>
              {preview.siteName || getHost(preview.url)}
            </Text>
            {preview.title ? (
              <Text numberOfLines={2} style={styles.linkPreviewTitle}>
                {preview.title}
              </Text>
            ) : null}
            {preview.description ? (
              <Text numberOfLines={2} style={styles.linkPreviewDescription}>
                {preview.description}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: '#E3E2E3',
    fontSize: 13,
    lineHeight: 18,
  },
  postBody: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  link: {
    color: '#7dd3fc',
    fontWeight: '700',
  },
  linkPreview: {
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  linkPreviewDescription: {
    color: '#908F9E',
    fontSize: 12,
    lineHeight: 16,
  },
  linkPreviewHost: {
    color: '#BDC2FF',
    fontSize: 11,
    fontWeight: '700',
  },
  linkPreviewImage: {
    aspectRatio: 1.9,
    backgroundColor: '#1B1C1D',
    width: '100%',
  },
  linkPreviewPressed: {
    opacity: 0.86,
  },
  linkPreviewText: {
    backgroundColor: '#1B1C1D',
    gap: 4,
    padding: 10,
  },
  linkPreviewTitle: {
    color: '#E3E2E3',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  mediaImage: {
    backgroundColor: '#1B1C1D',
    borderRadius: 4,
  },
  mediaImageGrid: {
    aspectRatio: 1,
    width: '49%',
  },
  mediaImageLower: {
    marginTop: 0,
  },
  mediaImageSingle: {
    aspectRatio: 1.45,
    width: '100%',
  },
  mention: {
    color: '#A7F3D0',
    fontWeight: '700',
  },
  wrap: {
    gap: 8,
  },
});

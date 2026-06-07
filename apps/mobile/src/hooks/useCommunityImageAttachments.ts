import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

import {
  deleteCommunityPostImage,
  uploadCommunityPostImage,
} from "../lib/mobileApi";
import {
  MAX_COMPOSER_IMAGES,
  type CommunityComposerImageAttachment,
} from "../components/community/CommunityComposerModal";

const MAX_POST_IMAGE_EDGE = 8_000;

export function useCommunityImageAttachments({
  isBusy = false,
}: {
  isBusy?: boolean;
} = {}) {
  const [media, setMedia] = useState<CommunityComposerImageAttachment[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const mediaRef = useRef<CommunityComposerImageAttachment[]>([]);
  const publishedMediaPathsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(
    () => () => {
      const unpublishedPaths = mediaRef.current
        .map((item) => item.path)
        .filter((path) => !publishedMediaPathsRef.current.has(path));

      if (unpublishedPaths.length) {
        void Promise.allSettled(
          unpublishedPaths.map((path) => deleteCommunityPostImage(path)),
        );
      }
    },
    [],
  );

  function markMediaPublished(paths: string[]) {
    paths.forEach((path) => {
      publishedMediaPathsRef.current.add(path);
    });
  }

  function cleanupUnpublishedMedia() {
    const unpublishedPaths = media
      .map((item) => item.path)
      .filter((path) => !publishedMediaPathsRef.current.has(path));

    if (unpublishedPaths.length) {
      void Promise.allSettled(
        unpublishedPaths.map((path) => deleteCommunityPostImage(path)),
      );
    }

    publishedMediaPathsRef.current = new Set();
  }

  function resetMedia() {
    setMedia([]);
    setIsUploadingMedia(false);
    publishedMediaPathsRef.current = new Set();
  }

  async function pickImages() {
    if (isBusy || isUploadingMedia) {
      return;
    }

    const remainingSlots = MAX_COMPOSER_IMAGES - media.length;
    if (remainingSlots <= 0) {
      Alert.alert(
        "Image limit reached",
        `You can attach up to ${MAX_COMPOSER_IMAGES} images.`,
      );
      return;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        allowsMultipleSelection: true,
        mediaTypes: ["images"],
        orderedSelection: true,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        quality: 0.86,
        selectionLimit: remainingSlots,
      });
    } catch (nextError) {
      Alert.alert(
        "Photos unavailable",
        nextError instanceof Error
          ? nextError.message
          : "Unable to open your photo library.",
      );
      return;
    }

    if (result.canceled) {
      return;
    }

    const assets = result.assets
      .filter((asset) => asset.uri && asset.width > 0 && asset.height > 0)
      .slice(0, remainingSlots);

    if (!assets.length) {
      return;
    }

    if (
      assets.some(
        (asset) =>
          asset.width > MAX_POST_IMAGE_EDGE || asset.height > MAX_POST_IMAGE_EDGE,
      )
    ) {
      Alert.alert(
        "Image too large",
        "Choose images under 8000 pixels wide or tall.",
      );
      return;
    }

    const uploads: CommunityComposerImageAttachment[] = [];
    setIsUploadingMedia(true);
    try {
      for (const asset of assets) {
        const uploaded = await uploadCommunityPostImage({
          fileName: asset.fileName,
          height: asset.height,
          mimeType: asset.mimeType,
          uri: asset.uri,
          width: asset.width,
        });
        uploads.push({ ...uploaded, localUri: asset.uri });
      }

      setMedia((current) =>
        [...current, ...uploads].slice(0, MAX_COMPOSER_IMAGES),
      );
    } catch (nextError) {
      await Promise.allSettled(
        uploads.map((item) => deleteCommunityPostImage(item.path)),
      );
      Alert.alert(
        "Upload failed",
        nextError instanceof Error
          ? nextError.message
          : "Unable to upload the selected image.",
      );
    } finally {
      setIsUploadingMedia(false);
    }
  }

  async function removeImage(path: string) {
    try {
      await deleteCommunityPostImage(path);
      setMedia((current) => current.filter((item) => item.path !== path));
    } catch (nextError) {
      Alert.alert(
        "Remove failed",
        nextError instanceof Error
          ? nextError.message
          : "Unable to remove the selected image.",
      );
    }
  }

  return {
    cleanupUnpublishedMedia,
    isUploadingMedia,
    markMediaPublished,
    media,
    pickImages,
    removeImage,
    resetMedia,
  };
}

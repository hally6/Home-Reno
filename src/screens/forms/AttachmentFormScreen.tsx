import React from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { Screen } from '@/components/Screen';
import { FormInput } from '@/components/FormInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { useAppContext } from '@/state/AppContext';
import { createRoomAttachment, getAttachmentForEdit, updateAttachment } from '@/data/repositories/attachmentRepository';
import type { RoomsStackParamList } from '@/navigation/types';
import { appColors } from '@/theme/tokens';

type PickedAsset = {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isImageUri(uri: string): boolean {
  const normalized = uri.trim().toLowerCase();
  return (
    normalized.endsWith('.jpg') ||
    normalized.endsWith('.jpeg') ||
    normalized.endsWith('.png') ||
    normalized.endsWith('.webp') ||
    normalized.endsWith('.gif')
  );
}

function inferKind(uri: string, mimeType?: string | null): string {
  const mime = (mimeType ?? '').toLowerCase();
  if (mime.startsWith('image/')) {
    return 'photo';
  }
  return isImageUri(uri) ? 'photo' : 'document';
}

function inferFileName(uri: string): string {
  const clean = uri.split('?')[0];
  const pieces = clean.split('/');
  return pieces[pieces.length - 1] || '';
}

function prettySize(sizeBytes: number | null): string {
  if (sizeBytes == null || !Number.isFinite(sizeBytes)) {
    return '-';
  }
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  const kb = sizeBytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}

function readFirstAsset(result: unknown): PickedAsset | null {
  if (!isRecord(result)) {
    return null;
  }
  if (result.canceled === true || result.cancelled === true) {
    return null;
  }
  const assets = result.assets;
  const asset = Array.isArray(assets) ? assets[0] : null;
  if (!isRecord(asset) || typeof asset.uri !== 'string' || !asset.uri) {
    return null;
  }
  return {
    uri: asset.uri,
    name: typeof asset.name === 'string' ? asset.name : null,
    mimeType: typeof asset.mimeType === 'string' ? asset.mimeType : null,
    size: typeof asset.size === 'number' ? asset.size : null
  };
}

type Props = NativeStackScreenProps<RoomsStackParamList, 'AttachmentForm'>;

export function AttachmentFormScreen({ route, navigation }: Props): React.JSX.Element {
  const roomId = route.params.roomId;
  const attachmentId = route.params.attachmentId;
  const { projectId, refreshData } = useAppContext();

  const [uri, setUri] = React.useState('');
  const [fileName, setFileName] = React.useState('');
  const [mimeType, setMimeType] = React.useState('');
  const [sizeBytes, setSizeBytes] = React.useState<number | null>(null);
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!attachmentId) {
      return;
    }

    getAttachmentForEdit(attachmentId)
      .then((attachment) => {
        if (!attachment) {
          return;
        }
        setUri(attachment.uri || '');
        setFileName(attachment.fileName ?? '');
        setMimeType(attachment.mimeType ?? '');
        setSizeBytes(attachment.sizeBytes ?? null);
        setShowUrlInput(Boolean(attachment.uri?.startsWith('http://') || attachment.uri?.startsWith('https://')));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load attachment'));
  }, [attachmentId]);

  const onPickPhoto = async (): Promise<void> => {
    setError('');
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Allow photo library access to attach images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9
      });
      const asset = readFirstAsset(result);
      if (!asset) {
        return;
      }
      if (asset.size != null && asset.size > MAX_ATTACHMENT_BYTES) {
        setError(`Selected file is too large. Max size is ${prettySize(MAX_ATTACHMENT_BYTES)}.`);
        return;
      }

      setUri(asset.uri);
      setFileName(asset.name ?? inferFileName(asset.uri));
      setMimeType(asset.mimeType ?? '');
      setSizeBytes(asset.size ?? null);
      setShowUrlInput(false);
    } catch {
      setError('Photo picker is unavailable. Install expo-image-picker to enable this.');
    }
  };

  const onPickFile = async (): Promise<void> => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: '*/*'
      });
      const asset = readFirstAsset(result);
      if (!asset) {
        return;
      }
      if (asset.size != null && asset.size > MAX_ATTACHMENT_BYTES) {
        setError(`Selected file is too large. Max size is ${prettySize(MAX_ATTACHMENT_BYTES)}.`);
        return;
      }

      setUri(asset.uri);
      setFileName(asset.name ?? inferFileName(asset.uri));
      setMimeType(asset.mimeType ?? '');
      setSizeBytes(asset.size ?? null);
      setShowUrlInput(false);
    } catch {
      setError('File picker is unavailable. Install expo-document-picker to enable this.');
    }
  };

  const onAddUrl = (): void => {
    setShowUrlInput(true);
    setMimeType('');
    setSizeBytes(null);
    if (!uri) {
      setUri('');
      setFileName('');
    }
  };

  const onSave = async (): Promise<void> => {
    if (!roomId) {
      setError('Missing room id');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (!uri.trim()) {
        throw new Error('Choose a photo/file or add a URL first.');
      }

      const effectiveKind = inferKind(uri, mimeType || null);
      const payload = {
        projectId,
        roomId,
        kind: effectiveKind,
        uri,
        fileName: fileName || inferFileName(uri),
        mimeType: mimeType || null,
        sizeBytes
      };

      if (attachmentId) {
        await updateAttachment(attachmentId, payload);
      } else {
        await createRoomAttachment(payload);
      }

      refreshData();
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save attachment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card title="Attach photo or file" subtitle="Use one option: Add photo, Add file, or Add URL." />
      <PrimaryButton title="Add photo" onPress={onPickPhoto} disabled={loading} />
      <PrimaryButton title="Add file" onPress={onPickFile} disabled={loading} />
      <PrimaryButton title="Add URL" onPress={onAddUrl} disabled={loading} />

      {showUrlInput ? (
        <FormInput label="URL" value={uri} onChangeText={setUri} placeholder="https://example.com/file.pdf" />
      ) : null}
      {uri ? (
        isImageUri(uri) ? (
          <View style={styles.previewWrap}>
            <Text style={styles.previewTitle}>Selected photo</Text>
            <Image source={{ uri }} style={styles.imagePreview} />
            <Text style={styles.previewMeta}>{fileName || inferFileName(uri) || 'Image'}</Text>
          </View>
        ) : (
          <Card
            title={fileName || inferFileName(uri) || 'Selected file'}
            subtitle={`${uri}\nType: ${mimeType || 'Unknown'}  Size: ${prettySize(sizeBytes)}`}
          />
        )
      ) : null}
      {error ? <Text style={{ color: 'red', marginBottom: 12 }}>{error}</Text> : null}
      <PrimaryButton
        title={loading ? 'Saving...' : attachmentId ? 'Save attachment' : 'Add attachment'}
        onPress={onSave}
        disabled={loading}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  previewWrap: {
    marginBottom: 12
  },
  previewTitle: {
    marginBottom: 6,
    fontWeight: '600'
  },
  imagePreview: {
    width: '100%',
    height: 220,
    borderRadius: 10
  },
  previewMeta: {
    marginTop: 6,
    color: appColors.textMuted
  }
});

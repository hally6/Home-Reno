import React from 'react';
import { Alert, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '@/components/Screen';
import { FormInput } from '@/components/FormInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SelectDropdown } from '@/components/SelectDropdown';
import { useAppContext } from '@/state/AppContext';
import { getProjectById, listProjectRooms } from '@/data/repositories/projectRepository';
import { createQuote, getQuoteDetail, updateQuote } from '@/data/repositories/quoteRepository';
import { formatOptionLabel } from '@/utils/format';
import type { HomeStackParamList } from '@/navigation/types';

const quoteStatuses = ['draft', 'received', 'rejected'];

type Props = NativeStackScreenProps<HomeStackParamList, 'QuoteForm'>;

export function QuoteFormScreen({ route, navigation }: Props): React.JSX.Element {
  const quoteId = route.params?.quoteId;
  const { projectId, refreshData } = useAppContext();
  const [title, setTitle] = React.useState('');
  const [scope, setScope] = React.useState('');
  const [builderName, setBuilderName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [currency, setCurrency] = React.useState('USD');
  const [status, setStatus] = React.useState('received');
  const [roomId, setRoomId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [rooms, setRooms] = React.useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    Promise.all([listProjectRooms(projectId), getProjectById(projectId)])
      .then(([roomRows, project]) => {
        setRooms(roomRows);
        if (project?.currency) {
          setCurrency(project.currency);
        }
      })
      .catch(() => undefined);
  }, [projectId]);

  React.useEffect(() => {
    if (!quoteId) {
      return;
    }
    getQuoteDetail(quoteId)
      .then((quote) => {
        if (!quote) {
          return;
        }
        setTitle(quote.title);
        setScope(quote.scope ?? '');
        setBuilderName(quote.builderName);
        setAmount(String(quote.amount));
        setCurrency(quote.currency);
        setStatus(quote.status === 'selected' ? 'received' : quote.status);
        setRoomId(quote.roomId ?? '');
        setNotes(quote.notes ?? '');
      })
      .catch((loadErr) => {
        setError(loadErr instanceof Error ? loadErr.message : 'Failed to load quote');
      });
  }, [quoteId]);

  const onSave = async (): Promise<void> => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        projectId,
        roomId: roomId || null,
        title,
        scope,
        builderName,
        amount: Number(amount),
        currency,
        status: status as 'draft' | 'received' | 'rejected',
        notes
      };

      if (quoteId) {
        await updateQuote(quoteId, payload);
      } else {
        await createQuote(payload);
      }

      refreshData();
      Alert.alert('Saved', 'Quote saved.');
      navigation.goBack();
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : 'Failed to save quote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <FormInput label="Quote title" value={title} onChangeText={setTitle} placeholder="Kitchen full install quote" />
      <FormInput
        label="Builder / Company"
        value={builderName}
        onChangeText={setBuilderName}
        placeholder="ABC Builders"
      />
      <FormInput label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="12000" />
      <FormInput label="Currency" value={currency} onChangeText={setCurrency} placeholder="USD" />
      <SelectDropdown
        label="Status"
        value={status}
        options={quoteStatuses.map((value) => ({ value, label: formatOptionLabel(value) }))}
        onChange={setStatus}
      />
      <SelectDropdown
        label="Link room (optional)"
        value={roomId}
        options={[
          { value: '', label: 'Project-level quote' },
          ...rooms.map((room) => ({ value: room.id, label: room.name }))
        ]}
        onChange={setRoomId}
      />
      <FormInput
        label="Scope (optional)"
        value={scope}
        onChangeText={setScope}
        multiline
        placeholder="Demolition, first fix, fit-off, cleanup..."
      />
      <FormInput label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      {error ? <Text style={{ color: 'red', marginBottom: 12 }}>{error}</Text> : null}
      <PrimaryButton
        title={loading ? 'Saving...' : quoteId ? 'Save quote' : 'Create quote'}
        onPress={onSave}
        disabled={loading}
      />
    </Screen>
  );
}

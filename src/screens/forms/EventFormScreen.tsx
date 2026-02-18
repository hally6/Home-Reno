import React from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/Screen';
import { FormInput } from '@/components/FormInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SelectDropdown } from '@/components/SelectDropdown';
import { DateTimeField } from '@/components/DateTimeField';
import { useAppContext } from '@/state/AppContext';
import { createEvent, getEventDetail, updateEvent } from '@/data/repositories/eventRepository';
import { listProjectRooms } from '@/data/repositories/projectRepository';
import { formatOptionLabel } from '@/utils/format';
import type { HomeStackParamList } from '@/navigation/types';

const eventTypes = ['trade_visit', 'delivery', 'inspection', 'all_day'];
const addNewOptionValue = '__add_new__';
const slotValues = ['am', 'pm', 'all_day'] as const;
type TimeSlot = (typeof slotValues)[number];

const SLOT_PRESETS: Record<TimeSlot, { startsAt: [number, number] | null; endsAt: [number, number] | null; label: string }> = {
  am: { startsAt: [9, 0], endsAt: [12, 0], label: 'AM (09:00-12:00)' },
  pm: { startsAt: [13, 0], endsAt: [17, 0], label: 'PM (13:00-17:00)' },
  all_day: { startsAt: [0, 0], endsAt: null, label: 'All Day' }
};

function toIsoWithTime(baseIso: string, hour: number, minute = 0): string {
  const date = new Date(baseIso || new Date().toISOString());
  if (Number.isNaN(date.getTime())) {
    return baseIso;
  }
  const adjusted = new Date(date);
  adjusted.setHours(hour, minute, 0, 0);
  return adjusted.toISOString();
}

type Props = NativeStackScreenProps<HomeStackParamList, 'EventForm'>;

export function EventFormScreen({ route, navigation }: Props): React.JSX.Element {
  const eventId = route.params?.eventId;
  const { projectId, refreshData } = useAppContext();

  const [title, setTitle] = React.useState('');
  const [type, setType] = React.useState('trade_visit');
  const [typeOptions, setTypeOptions] = React.useState<string[]>(eventTypes);
  const [showAddType, setShowAddType] = React.useState(false);
  const [newType, setNewType] = React.useState('');
  const [roomId, setRoomId] = React.useState('');
  const [rooms, setRooms] = React.useState<Array<{ id: string; name: string }>>([]);
  const [taskId, setTaskId] = React.useState('');
  const [startsAt, setStartsAt] = React.useState(new Date().toISOString());
  const [endsAt, setEndsAt] = React.useState('');
  const [timeSlot, setTimeSlot] = React.useState<TimeSlot>('am');
  const [company, setCompany] = React.useState('');
  const [contactName, setContactName] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    listProjectRooms(projectId)
      .then((nextRooms) => setRooms(nextRooms))
      .catch(() => undefined);
  }, [projectId]);

  React.useEffect(() => {
    if (!eventId) {
      return;
    }

    getEventDetail(eventId)
      .then((event) => {
        if (!event) {
          return;
        }
        setTitle(event.title);
        setType(event.type);
        setTypeOptions((prev) => (prev.includes(event.type) ? prev : [...prev, event.type]));
        setRoomId(event.roomId ?? '');
        setTaskId(event.linkedTaskId ?? '');
        setStartsAt(event.startsAt);
        setEndsAt(event.endsAt ?? '');
        if (event.isAllDay) {
          setTimeSlot('all_day');
        } else {
          const hour = new Date(event.startsAt).getHours();
          setTimeSlot(Number.isFinite(hour) && hour >= 12 ? 'pm' : 'am');
        }
        setCompany(event.company ?? '');
        setContactName(event.contactName ?? '');
        setContactPhone(event.contactPhone ?? '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load event'));
  }, [eventId]);

  const onSave = async (): Promise<void> => {
    setError('');
    setLoading(true);

    try {
      const payload = {
        projectId,
        roomId: roomId || null,
        taskId: taskId || null,
        type,
        title,
        startsAt,
        endsAt: endsAt || null,
        isAllDay: timeSlot === 'all_day',
        company,
        contactName,
        contactPhone
      };

      if (eventId) {
        await updateEvent(eventId, payload);
      } else {
        await createEvent(payload);
      }

      refreshData();
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const onSelectType = (value: string): void => {
    if (value === addNewOptionValue) {
      setShowAddType(true);
      return;
    }
    setType(value);
    setShowAddType(false);
  };

  const addTypeOption = (): void => {
    const value = newType.trim();
    if (!value) {
      return;
    }
    setTypeOptions((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setType(value);
    setNewType('');
    setShowAddType(false);
  };

  const onSelectTimeSlot = (value: string): void => {
    const selected = (slotValues as readonly string[]).includes(value) ? (value as TimeSlot) : 'am';
    setTimeSlot(selected);
    const preset = SLOT_PRESETS[selected];
    if (preset.startsAt) {
      setStartsAt(toIsoWithTime(startsAt, preset.startsAt[0], preset.startsAt[1]));
    }
    if (preset.endsAt) {
      setEndsAt(toIsoWithTime(startsAt, preset.endsAt[0], preset.endsAt[1]));
    } else {
      setEndsAt('');
    }
  };

  return (
    <Screen>
      <FormInput label="Title" value={title} onChangeText={setTitle} placeholder="Plumber first-fix visit" />
      <SelectDropdown
        label="Type"
        value={type}
        options={[
          ...typeOptions.map((value) => ({ value, label: formatOptionLabel(value) })),
          { value: addNewOptionValue, label: '+ Add New Type' }
        ]}
        onChange={onSelectType}
      />
      {showAddType ? (
        <>
          <FormInput label="New type" value={newType} onChangeText={setNewType} placeholder="site_meeting" />
          <PrimaryButton title="Add type option" onPress={addTypeOption} />
        </>
      ) : null}
      <SelectDropdown
        label="Room (optional)"
        value={roomId}
        options={[{ value: '', label: 'No room' }, ...rooms.map((room) => ({ value: room.id, label: room.name }))]}
        onChange={setRoomId}
      />
      <DateTimeField
        label="Starts at"
        value={startsAt}
        onChange={setStartsAt}
        placeholder="Select start date and time"
      />
      <DateTimeField
        label="Ends at (optional)"
        value={endsAt}
        onChange={setEndsAt}
        placeholder="Select end date and time"
      />
      <SelectDropdown
        label="Time slot"
        value={timeSlot}
        options={[
          { value: 'am', label: SLOT_PRESETS.am.label },
          { value: 'pm', label: SLOT_PRESETS.pm.label },
          { value: 'all_day', label: SLOT_PRESETS.all_day.label }
        ]}
        onChange={onSelectTimeSlot}
      />
      <FormInput label="Company" value={company} onChangeText={setCompany} />
      <FormInput label="Contact name" value={contactName} onChangeText={setContactName} />
      <FormInput label="Contact phone" value={contactPhone} onChangeText={setContactPhone} />
      {error ? <Text style={{ color: 'red', marginBottom: 12 }}>{error}</Text> : null}
      <PrimaryButton
        title={loading ? 'Saving...' : eventId ? 'Save event' : 'Create event'}
        onPress={onSave}
        disabled={loading}
      />
    </Screen>
  );
}

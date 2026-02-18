import React from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/Screen';
import { FormInput } from '@/components/FormInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SelectDropdown } from '@/components/SelectDropdown';
import { useAppContext } from '@/state/AppContext';
import { createRoom, getRoomForEdit, updateRoom } from '@/data/repositories/roomRepository';
import { formatOptionLabel } from '@/utils/format';
import type { RoomsStackParamList } from '@/navigation/types';

const roomTypes = ['kitchen', 'bathroom', 'bedroom', 'living_room', 'other'];
const floorOptions = ['first_floor', 'second_floor', 'ground_floor', 'basement', 'attic', 'other'];
const addNewOptionValue = '__add_new__';

type Props = NativeStackScreenProps<RoomsStackParamList, 'RoomForm'>;

export function RoomFormScreen({ route, navigation }: Props): React.JSX.Element {
  const roomId = route.params?.roomId;
  const { projectId, refreshData } = useAppContext();

  const [name, setName] = React.useState('');
  const [type, setType] = React.useState('other');
  const [typeOptions, setTypeOptions] = React.useState<string[]>(roomTypes);
  const [showAddType, setShowAddType] = React.useState(false);
  const [newType, setNewType] = React.useState('');
  const [floor, setFloor] = React.useState('first_floor');
  const [floorOptionsState, setFloorOptionsState] = React.useState<string[]>(floorOptions);
  const [showAddFloor, setShowAddFloor] = React.useState(false);
  const [newFloor, setNewFloor] = React.useState('');
  const [budgetPlanned, setBudgetPlanned] = React.useState('0');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!roomId) {
      return;
    }

    getRoomForEdit(roomId)
      .then((room) => {
        if (!room) {
          return;
        }
        setName(room.name);
        setType(room.type);
        setTypeOptions((prev) => (prev.includes(room.type) ? prev : [...prev, room.type]));
        if (room.floor) {
          setFloor(room.floor);
          setFloorOptionsState((prev) => (prev.includes(room.floor ?? '') ? prev : [...prev, room.floor ?? '']));
        }
        setBudgetPlanned(String(room.budgetPlanned ?? 0));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load room'));
  }, [roomId]);

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

  const onSelectFloor = (value: string): void => {
    if (value === addNewOptionValue) {
      setShowAddFloor(true);
      return;
    }
    setFloor(value);
    setShowAddFloor(false);
  };

  const addFloorOption = (): void => {
    const value = newFloor.trim();
    if (!value) {
      return;
    }
    setFloorOptionsState((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setFloor(value);
    setNewFloor('');
    setShowAddFloor(false);
  };

  const onSave = async (): Promise<void> => {
    setError('');
    setLoading(true);
    try {
      const parsedBudget = Number(budgetPlanned || 0);
      if (roomId) {
        await updateRoom(roomId, {
          name,
          type,
          floor: floor || null,
          budgetPlanned: Number.isFinite(parsedBudget) ? parsedBudget : 0
        });
      } else {
        await createRoom({
          projectId,
          name,
          type,
          floor: floor || null,
          budgetPlanned: Number.isFinite(parsedBudget) ? parsedBudget : 0
        });
      }
      refreshData();
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <FormInput label="Room name" value={name} onChangeText={setName} placeholder="Kitchen" />
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
          <FormInput label="New type" value={newType} onChangeText={setNewType} placeholder="utility_room" />
          <PrimaryButton title="Add type option" onPress={addTypeOption} />
        </>
      ) : null}
      <SelectDropdown
        label="Floor"
        value={floor}
        options={[
          ...floorOptionsState.map((value) => ({ value, label: formatOptionLabel(value) })),
          { value: addNewOptionValue, label: '+ Add New Floor' }
        ]}
        onChange={onSelectFloor}
      />
      {showAddFloor ? (
        <>
          <FormInput label="New floor" value={newFloor} onChangeText={setNewFloor} placeholder="first_floor" />
          <PrimaryButton title="Add floor option" onPress={addFloorOption} />
        </>
      ) : null}
      <FormInput label="Planned budget" value={budgetPlanned} onChangeText={setBudgetPlanned} keyboardType="numeric" />
      {error ? <Text style={{ color: 'red', marginBottom: 12 }}>{error}</Text> : null}
      <PrimaryButton
        title={loading ? 'Saving...' : roomId ? 'Save room' : 'Create room'}
        onPress={onSave}
        disabled={loading}
      />
    </Screen>
  );
}

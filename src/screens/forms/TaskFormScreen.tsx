import React from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/Screen';
import { FormInput } from '@/components/FormInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { SelectDropdown } from '@/components/SelectDropdown';
import { DateTimeField } from '@/components/DateTimeField';
import { useAppContext } from '@/state/AppContext';
import { createTask, getTaskDetail, updateTask } from '@/data/repositories/taskRepository';
import { listProjectRooms } from '@/data/repositories/projectRepository';
import { formatOptionLabel } from '@/utils/format';
import type { HomeStackParamList } from '@/navigation/types';

const phases = ['plan', 'buy', 'prep', 'install', 'finish', 'inspect_snag'];
const statuses = ['ideas', 'ready', 'in_progress', 'waiting', 'done'];
const waitingReasons = ['materials', 'trades', 'drying_time', 'access', 'approvals', 'other'];
const priorities = ['low', 'medium', 'high'];
const addNewOptionValues = {
  phase: '__add_new_phase__',
  status: '__add_new_status__',
  waitingReason: '__add_new_waiting_reason__',
  priority: '__add_new_priority__'
} as const;

type TaskFormState = {
  roomId: string;
  roomName: string;
  rooms: Array<{ id: string; name: string }>;
  title: string;
  description: string;
  phase: string;
  phaseOptions: string[];
  showAddPhase: boolean;
  newPhase: string;
  status: string;
  statusOptions: string[];
  showAddStatus: boolean;
  newStatus: string;
  waitingReason: string;
  waitingReasonOptions: string[];
  showAddWaitingReason: boolean;
  newWaitingReason: string;
  dueAt: string;
  startAt: string;
  priority: string;
  priorityOptions: string[];
  showAddPriority: boolean;
  newPriority: string;
  tradeTags: string;
  customTags: string;
  error: string;
  loading: boolean;
};

type TaskFormAction =
  | { type: 'set'; field: keyof TaskFormState; value: TaskFormState[keyof TaskFormState] }
  | { type: 'merge'; value: Partial<TaskFormState> }
  | {
      type: 'ensureOption';
      field: 'phaseOptions' | 'statusOptions' | 'waitingReasonOptions' | 'priorityOptions';
      value: string;
    };

function taskFormReducer(state: TaskFormState, action: TaskFormAction): TaskFormState {
  switch (action.type) {
    case 'set':
      return { ...state, [action.field]: action.value };
    case 'merge':
      return { ...state, ...action.value };
    case 'ensureOption': {
      const value = action.value.trim();
      if (!value) {
        return state;
      }
      const options = state[action.field];
      if (options.includes(value)) {
        return state;
      }
      return {
        ...state,
        [action.field]: [...options, value]
      };
    }
    default:
      return state;
  }
}

function parseTagInput(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

type Props = NativeStackScreenProps<HomeStackParamList, 'TaskForm'>;

export function TaskFormScreen({ route, navigation }: Props): React.JSX.Element {
  const taskId = route.params?.taskId;
  const roomIdParam = route.params?.roomId;
  const { projectId, refreshData } = useAppContext();
  const [state, dispatch] = React.useReducer(taskFormReducer, {
    roomId: roomIdParam ?? '',
    roomName: '',
    rooms: [],
    title: '',
    description: '',
    phase: 'plan',
    phaseOptions: phases,
    showAddPhase: false,
    newPhase: '',
    status: 'ready',
    statusOptions: statuses,
    showAddStatus: false,
    newStatus: '',
    waitingReason: '',
    waitingReasonOptions: waitingReasons,
    showAddWaitingReason: false,
    newWaitingReason: '',
    dueAt: '',
    startAt: '',
    priority: 'medium',
    priorityOptions: priorities,
    showAddPriority: false,
    newPriority: '',
    tradeTags: '',
    customTags: '',
    error: '',
    loading: false
  });

  const setField = React.useCallback(<K extends keyof TaskFormState>(field: K, value: TaskFormState[K]): void => {
    dispatch({ type: 'set', field, value });
  }, []);

  const {
    roomId,
    roomName,
    rooms,
    title,
    description,
    phase,
    phaseOptions,
    showAddPhase,
    newPhase,
    status,
    statusOptions,
    showAddStatus,
    newStatus,
    waitingReason,
    waitingReasonOptions,
    showAddWaitingReason,
    newWaitingReason,
    dueAt,
    startAt,
    priority,
    priorityOptions,
    showAddPriority,
    newPriority,
    tradeTags,
    customTags,
    error,
    loading
  } = state;

  React.useEffect(() => {
    listProjectRooms(projectId)
      .then((nextRooms) => {
        dispatch({ type: 'set', field: 'rooms', value: nextRooms });
        if (!roomId && nextRooms[0]?.id) {
          dispatch({
            type: 'merge',
            value: {
              roomId: nextRooms[0].id,
              roomName: nextRooms[0].name
            }
          });
        }
      })
      .catch(() => undefined);
  }, [projectId, roomId]);

  React.useEffect(() => {
    const match = rooms.find((room) => room.id === roomId);
    dispatch({ type: 'set', field: 'roomName', value: match?.name ?? '' });
  }, [roomId, rooms]);

  React.useEffect(() => {
    if (!taskId) {
      return;
    }

    getTaskDetail(taskId)
      .then((task) => {
        if (!task) {
          return;
        }
        dispatch({
          type: 'merge',
          value: {
            roomId: task.roomId,
            roomName: task.roomName,
            title: task.title,
            description: task.description ?? '',
            phase: task.phase,
            status: task.status,
            waitingReason: task.waitingReason ?? '',
            dueAt: task.dueAt ?? '',
            startAt: task.startAt ?? '',
            priority: task.priority,
            tradeTags: task.tradeTags.join(', '),
            customTags: task.customTags.join(', ')
          }
        });
        dispatch({ type: 'ensureOption', field: 'phaseOptions', value: task.phase });
        dispatch({ type: 'ensureOption', field: 'statusOptions', value: task.status });
        dispatch({ type: 'ensureOption', field: 'waitingReasonOptions', value: task.waitingReason ?? '' });
        dispatch({ type: 'ensureOption', field: 'priorityOptions', value: task.priority });
      })
      .catch((e) => setField('error', e instanceof Error ? e.message : 'Failed to load task'));
  }, [taskId, setField]);

  const onSelectPhase = (value: string): void => {
    if (value === addNewOptionValues.phase) {
      setField('showAddPhase', true);
      return;
    }
    dispatch({ type: 'merge', value: { phase: value, showAddPhase: false } });
  };

  const onSelectStatus = (value: string): void => {
    if (value === addNewOptionValues.status) {
      setField('showAddStatus', true);
      return;
    }
    dispatch({ type: 'merge', value: { status: value, showAddStatus: false } });
  };

  const onSelectWaitingReason = (value: string): void => {
    if (value === addNewOptionValues.waitingReason) {
      setField('showAddWaitingReason', true);
      return;
    }
    dispatch({ type: 'merge', value: { waitingReason: value, showAddWaitingReason: false } });
  };

  const addPhaseOption = (): void => {
    const value = newPhase.trim();
    if (!value) {
      return;
    }
    dispatch({ type: 'ensureOption', field: 'phaseOptions', value });
    dispatch({ type: 'merge', value: { phase: value, newPhase: '', showAddPhase: false } });
  };

  const addStatusOption = (): void => {
    const value = newStatus.trim();
    if (!value) {
      return;
    }
    dispatch({ type: 'ensureOption', field: 'statusOptions', value });
    dispatch({ type: 'merge', value: { status: value, newStatus: '', showAddStatus: false } });
  };

  const addWaitingReasonOption = (): void => {
    const value = newWaitingReason.trim();
    if (!value) {
      return;
    }
    dispatch({ type: 'ensureOption', field: 'waitingReasonOptions', value });
    dispatch({ type: 'merge', value: { waitingReason: value, newWaitingReason: '', showAddWaitingReason: false } });
  };

  const onSelectPriority = (value: string): void => {
    if (value === addNewOptionValues.priority) {
      setField('showAddPriority', true);
      return;
    }
    dispatch({ type: 'merge', value: { priority: value, showAddPriority: false } });
  };

  const addPriorityOption = (): void => {
    const value = newPriority.trim();
    if (!value) {
      return;
    }
    dispatch({ type: 'ensureOption', field: 'priorityOptions', value });
    dispatch({ type: 'merge', value: { priority: value, newPriority: '', showAddPriority: false } });
  };

  const onSave = async (): Promise<void> => {
    dispatch({ type: 'merge', value: { error: '', loading: true } });
    try {
      const payload = {
        projectId,
        roomId,
        title,
        description,
        phase,
        status,
        waitingReason: waitingReason || null,
        dueAt: dueAt || null,
        startAt: startAt || null,
        priority,
        tradeTags: parseTagInput(tradeTags),
        customTags: parseTagInput(customTags)
      };

      if (taskId) {
        await updateTask(taskId, payload);
      } else {
        await createTask(payload);
      }

      refreshData();
      navigation.goBack();
    } catch (e) {
      setField('error', e instanceof Error ? e.message : 'Failed to save task');
    } finally {
      setField('loading', false);
    }
  };

  return (
    <Screen>
      <FormInput
        label="Task title"
        value={title}
        onChangeText={(value) => setField('title', value)}
        placeholder="Install vanity"
      />
      <FormInput
        label="Description"
        value={description}
        onChangeText={(value) => setField('description', value)}
        multiline
        placeholder="Notes"
      />
      <SelectDropdown
        label="Choose room"
        value={roomId}
        options={rooms.map((room) => ({ value: room.id, label: room.name }))}
        placeholder="Select a room"
        onChange={(value) => setField('roomId', value)}
      />
      <Card title="Selected room" subtitle={roomName || 'No room selected'} />
      <SelectDropdown
        label="Phase"
        value={phase}
        options={[
          ...phaseOptions.map((value) => ({ value, label: formatOptionLabel(value) })),
          { value: addNewOptionValues.phase, label: '+ Add New Phase' }
        ]}
        onChange={onSelectPhase}
      />
      {showAddPhase ? (
        <>
          <FormInput
            label="New phase"
            value={newPhase}
            onChangeText={(value) => setField('newPhase', value)}
            placeholder="custom_phase"
          />
          <PrimaryButton title="Add phase option" onPress={addPhaseOption} />
        </>
      ) : null}
      <SelectDropdown
        label="Status"
        value={status}
        options={[
          ...statusOptions.map((value) => ({ value, label: formatOptionLabel(value) })),
          { value: addNewOptionValues.status, label: '+ Add New Status' }
        ]}
        onChange={onSelectStatus}
      />
      {showAddStatus ? (
        <>
          <FormInput
            label="New status"
            value={newStatus}
            onChangeText={(value) => setField('newStatus', value)}
            placeholder="blocked_external"
          />
          <PrimaryButton title="Add status option" onPress={addStatusOption} />
        </>
      ) : null}
      <SelectDropdown
        label="Waiting reason (if waiting)"
        value={waitingReason}
        options={[
          { value: '', label: 'None' },
          ...waitingReasonOptions.map((value) => ({ value, label: formatOptionLabel(value) })),
          { value: addNewOptionValues.waitingReason, label: '+ Add New Waiting Reason' }
        ]}
        onChange={onSelectWaitingReason}
      />
      {showAddWaitingReason ? (
        <>
          <FormInput
            label="New waiting reason"
            value={newWaitingReason}
            onChangeText={(value) => setField('newWaitingReason', value)}
            placeholder="permit_delay"
          />
          <PrimaryButton title="Add waiting reason option" onPress={addWaitingReasonOption} />
        </>
      ) : null}
      <DateTimeField
        label="Start at"
        value={startAt}
        onChange={(value) => setField('startAt', value)}
        placeholder="Select start date and time"
      />
      <DateTimeField
        label="Due at"
        value={dueAt}
        onChange={(value) => setField('dueAt', value)}
        placeholder="Select due date and time"
      />
      <SelectDropdown
        label="Priority"
        value={priority}
        options={[
          ...priorityOptions.map((value) => ({ value, label: formatOptionLabel(value) })),
          { value: addNewOptionValues.priority, label: '+ Add New Priority' }
        ]}
        onChange={onSelectPriority}
      />
      {showAddPriority ? (
        <>
          <FormInput
            label="New priority"
            value={newPriority}
            onChangeText={(value) => setField('newPriority', value)}
            placeholder="urgent_plus"
          />
          <PrimaryButton title="Add priority option" onPress={addPriorityOption} />
        </>
      ) : null}
      <FormInput
        label="Trade tags (comma separated)"
        value={tradeTags}
        onChangeText={(value) => setField('tradeTags', value)}
        placeholder="plumber, electrician"
      />
      <FormInput
        label="Custom tags (comma separated)"
        value={customTags}
        onChangeText={(value) => setField('customTags', value)}
        placeholder="urgent, pass-1"
      />
      {error ? <Text style={{ color: 'red', marginBottom: 12 }}>{error}</Text> : null}
      <PrimaryButton
        title={loading ? 'Saving...' : taskId ? 'Save task' : 'Create task'}
        onPress={onSave}
        disabled={loading}
      />
    </Screen>
  );
}

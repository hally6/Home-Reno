import React from 'react';
import { Alert, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/Screen';
import { FormInput } from '@/components/FormInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { SelectDropdown } from '@/components/SelectDropdown';
import { DateField } from '@/components/DateField';
import { useAppContext } from '@/state/AppContext';
import { createExpense, getExpenseDetail, updateExpense } from '@/data/repositories/expenseRepository';
import { listProjectRooms, listProjectTasksForExpense } from '@/data/repositories/projectRepository';
import { formatOptionLabel } from '@/utils/format';
import type { HomeStackParamList } from '@/navigation/types';

const categories = ['materials', 'labor', 'tools', 'delivery', 'permits', 'furniture', 'other'];
const addNewOptionValue = '__add_new__';

type Props = NativeStackScreenProps<HomeStackParamList, 'ExpenseForm'>;

export function ExpenseFormScreen({ route, navigation }: Props): React.JSX.Element {
  const expenseId = route.params?.expenseId;
  const roomIdParam = route.params?.roomId;
  const { projectId, refreshData } = useAppContext();

  const [category, setCategory] = React.useState('materials');
  const [categoryOptions, setCategoryOptions] = React.useState<string[]>(categories);
  const [showAddCategory, setShowAddCategory] = React.useState(false);
  const [newCategory, setNewCategory] = React.useState('');
  const [vendor, setVendor] = React.useState('');
  const [amount, setAmount] = React.useState('0');
  const [taxAmount, setTaxAmount] = React.useState('');
  const [incurredOn, setIncurredOn] = React.useState(new Date().toISOString().slice(0, 10));
  const [roomId, setRoomId] = React.useState(roomIdParam ?? '');
  const [roomName, setRoomName] = React.useState('');
  const [rooms, setRooms] = React.useState<Array<{ id: string; name: string }>>([]);
  const [tasks, setTasks] = React.useState<Array<{ id: string; title: string; roomId: string }>>([]);
  const [taskId, setTaskId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    Promise.all([listProjectRooms(projectId), listProjectTasksForExpense(projectId)])
      .then(([roomResult, taskResult]) => {
        setRooms(roomResult);
        setTasks(taskResult);
      })
      .catch(() => undefined);
  }, [projectId]);

  React.useEffect(() => {
    const match = rooms.find((room) => room.id === roomId);
    setRoomName(match?.name ?? '');
  }, [roomId, rooms]);

  React.useEffect(() => {
    if (!taskId) {
      return;
    }
    const linked = tasks.find((task) => task.id === taskId);
    if (!linked) {
      setTaskId('');
      return;
    }
    if (roomId && linked.roomId !== roomId) {
      setTaskId('');
    }
  }, [taskId, tasks, roomId]);

  React.useEffect(() => {
    if (!expenseId) {
      return;
    }

    getExpenseDetail(expenseId)
      .then((expense) => {
        if (!expense) {
          return;
        }
        setCategory(expense.category);
        setCategoryOptions((prev) => (prev.includes(expense.category) ? prev : [...prev, expense.category]));
        setVendor(expense.vendor ?? '');
        setAmount(String(expense.amount));
        setTaxAmount(expense.taxAmount == null ? '' : String(expense.taxAmount));
        setIncurredOn(expense.incurredOn);
        setRoomId(expense.roomId ?? '');
        setTaskId(expense.taskId ?? '');
        setNotes(expense.notes ?? '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load expense'));
  }, [expenseId]);

  const onSave = async (): Promise<void> => {
    setError('');
    setLoading(true);

    try {
      const selectedTask = tasks.find((task) => task.id === taskId);
      const effectiveRoomId = selectedTask ? selectedTask.roomId : roomId;
      const payload = {
        projectId,
        roomId: effectiveRoomId || null,
        taskId: taskId || null,
        category,
        vendor,
        amount: Number(amount),
        taxAmount: taxAmount ? Number(taxAmount) : null,
        incurredOn,
        notes
      };

      if (expenseId) {
        await updateExpense(expenseId, payload);
      } else {
        await createExpense(payload);
      }

      refreshData();
      Alert.alert('Saved', 'Expense saved successfully.');
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const onSelectCategory = (value: string): void => {
    if (value === addNewOptionValue) {
      setShowAddCategory(true);
      return;
    }
    setCategory(value);
    setShowAddCategory(false);
  };

  const addCategoryOption = (): void => {
    const value = newCategory.trim();
    if (!value) {
      return;
    }
    setCategoryOptions((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setCategory(value);
    setNewCategory('');
    setShowAddCategory(false);
  };

  return (
    <Screen>
      <SelectDropdown
        label="Category"
        value={category}
        options={[
          ...categoryOptions.map((value) => ({ value, label: formatOptionLabel(value) })),
          { value: addNewOptionValue, label: '+ Add New Category' }
        ]}
        onChange={onSelectCategory}
      />
      {showAddCategory ? (
        <>
          <FormInput
            label="New category"
            value={newCategory}
            onChangeText={setNewCategory}
            placeholder="waste_removal"
          />
          <PrimaryButton title="Add category option" onPress={addCategoryOption} />
        </>
      ) : null}
      <FormInput label="Vendor" value={vendor} onChangeText={setVendor} />
      <FormInput label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <FormInput label="Tax amount" value={taxAmount} onChangeText={setTaxAmount} keyboardType="numeric" />
      <DateField label="Incurred on" value={incurredOn} onChange={setIncurredOn} placeholder="Select expense date" />
      <SelectDropdown
        label="Choose room (optional)"
        value={roomId}
        options={[{ value: '', label: 'No room' }, ...rooms.map((room) => ({ value: room.id, label: room.name }))]}
        placeholder="No room"
        onChange={setRoomId}
      />
      <Card title="Selected room" subtitle={roomName || 'No room (project-level expense)'} />
      <SelectDropdown
        label="Link task (optional)"
        value={taskId}
        options={[
          { value: '', label: 'No task' },
          ...tasks
            .filter((task) => !roomId || task.roomId === roomId)
            .map((task) => ({ value: task.id, label: task.title }))
        ]}
        onChange={setTaskId}
      />
      <FormInput label="Notes" value={notes} onChangeText={setNotes} multiline />
      {error ? <Text style={{ color: 'red', marginBottom: 12 }}>{error}</Text> : null}
      <PrimaryButton
        title={loading ? 'Saving...' : expenseId ? 'Save expense' : 'Create expense'}
        onPress={onSave}
        disabled={loading}
      />
    </Screen>
  );
}

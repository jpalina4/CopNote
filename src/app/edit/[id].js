import { useLocalSearchParams } from 'expo-router';
import PageEditorScreen from '../../screens/PageEditorScreen';

/** Edit an existing draft. `key` forces a fresh editor if the id changes. */
export default function EditDraftRoute() {
  const { id } = useLocalSearchParams();
  return <PageEditorScreen key={id} pageId={Number(id)} />;
}

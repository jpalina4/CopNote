import { useLocalSearchParams } from 'expo-router';
import PageDetailScreen from '../../screens/PageDetailScreen';

/** Dynamic route: /page/12 -> id = "12". URL params are strings, so convert to a number. */
export default function PageRoute() {
  const { id } = useLocalSearchParams();
  return <PageDetailScreen pageId={Number(id)} />;
}

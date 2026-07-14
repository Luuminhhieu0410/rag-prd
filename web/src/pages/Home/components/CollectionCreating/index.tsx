import { FullPageLoader } from '@/components/LoadingFullPage';
import { useTranslation } from 'react-i18next';

const CollectionCreating = () => {
  const { t } = useTranslation();

  return <FullPageLoader message={t('home.creatingNotebook')} />;
};

export default CollectionCreating;

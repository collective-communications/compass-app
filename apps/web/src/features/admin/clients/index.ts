export { ClientListPage } from './pages/client-list-page';
export type { ClientListPageProps } from './pages/client-list-page';
export { ClientCard } from './components/client-card';
export type { ClientCardProps } from './components/client-card';
export { ClientSearchBar } from './components/client-search-bar';
export type { ClientSearchBarProps } from './components/client-search-bar';
export { AddClientModal } from './components/add-client-modal';
export type { AddClientModalProps } from './components/add-client-modal';

export { useOrganizations, useCreateOrganization, organizationKeys } from './hooks/use-organizations';

export {
  listOrganizations,
  createOrganization,
} from './services/client-service';

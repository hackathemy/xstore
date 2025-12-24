export type TabStatus = 'OPEN' | 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';

export interface IMenuItemProps {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  price: string;
  image?: string;
  category?: string;
  available: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ITableProps {
  id: string;
  storeId: string;
  number: number;
  name?: string;
  seats: number;
  isActive: boolean;
  createdAt?: string;
}

export interface ITabItemProps {
  id: string;
  tabId: string;
  menuItemId?: string;
  menuItem?: IMenuItemProps;
  name: string;
  price: string;
  quantity: number;
  note?: string;
  createdAt?: string;
}

export interface IStoreBasicProps {
  id: string;
  name: string;
  owner: string;
}

export interface ITabProps {
  id: string;
  storeId: string;
  tableId?: string;
  table?: ITableProps;
  store?: IStoreBasicProps;
  customer: string;
  customerName?: string;
  status: TabStatus;
  items: ITabItemProps[];
  totalAmount: string;
  paymentTxHash?: string;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string;
}

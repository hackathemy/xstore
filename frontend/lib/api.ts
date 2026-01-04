// API Client for NestJS Backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Stores
  async getStores() {
    return this.request<any[]>('/stores');
  }

  async getStore(id: string) {
    return this.request<any>(`/stores/${id}`);
  }

  async getStoreByOwner(owner: string) {
    return this.request<any>(`/stores/owner/${owner}`);
  }

  async createStore(data: { name: string; owner: string; walletAddress: string; description?: string; image?: string }) {
    return this.request<any>('/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStore(id: string, data: Partial<{ name: string; description: string; image: string }>) {
    return this.request<any>(`/stores/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Tabs
  async getTabs(storeId?: string) {
    const endpoint = storeId ? `/tabs/store/${storeId}` : '/tabs';
    return this.request<any[]>(endpoint);
  }

  async getTabsByCustomer(customerAddress: string) {
    return this.request<any[]>(`/tabs/customer/${customerAddress}`);
  }

  async getTab(id: string) {
    return this.request<any>(`/tabs/${id}`);
  }

  async createTab(data: { storeId: string; tableNumber?: number }) {
    return this.request<any>('/tabs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addItemToTab(tabId: string, item: { name: string; price: string; quantity: number }) {
    return this.request<any>(`/tabs/${tabId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async removeItemFromTab(tabId: string, itemId: string) {
    return this.request<any>(`/tabs/${tabId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async closeTab(tabId: string) {
    return this.request<any>(`/tabs/${tabId}/close`, {
      method: 'PUT',
    });
  }

  async getStoreOrders(storeId: string) {
    return this.request<any[]>(`/tabs/orders/${storeId}`);
  }

  // Payments
  async initiatePayment(data: { tabId: string; payerAddress: string }) {
    return this.request<any>('/payments/initiate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitPayment(data: { paymentId: string; signature: string; deadline: number }) {
    return this.request<any>('/payments/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayment(id: string) {
    return this.request<any>(`/payments/${id}`);
  }

  async getPaymentsByTab(tabId: string) {
    return this.request<any[]>(`/payments/tab/${tabId}`);
  }

  // Settlements
  async getSettlementSummary(storeId: string) {
    return this.request<any>(`/settlements/store/${storeId}/summary`);
  }

  async createSettlement(storeId: string) {
    return this.request<any>('/settlements', {
      method: 'POST',
      body: JSON.stringify({ storeId }),
    });
  }

  async processSettlement(settlementId: string) {
    return this.request<any>(`/settlements/${settlementId}/process`, {
      method: 'POST',
    });
  }

  // Refunds
  async createRefund(data: { paymentId: string; reason: string; requestedBy: string; amount?: string }) {
    return this.request<any>('/refunds', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRefund(id: string) {
    return this.request<any>(`/refunds/${id}`);
  }

  async approveRefund(id: string) {
    return this.request<any>(`/refunds/${id}/approve`, {
      method: 'PUT',
    });
  }

  async rejectRefund(id: string, reason: string) {
    return this.request<any>(`/refunds/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  async getRefundPermit(id: string) {
    return this.request<any>(`/refunds/${id}/permit`);
  }

  async processRefund(id: string, data: { signature: string; deadline: number }) {
    return this.request<any>(`/refunds/${id}/process`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Facilitator
  async getFacilitatorStatus() {
    return this.request<any>('/facilitator/status');
  }

  // X402 Payment Protocol (Gas Sponsorship)
  async buildSponsoredTransaction(data: { tabId: string; payerAddress: string; currency?: 'USDC' | 'USDT' }) {
    return this.request<{
      paymentId: string;
      transactionBytes: string;
      feePayerAddress: string;
      payment: {
        amount: string;
        amountFormatted: string;
        currency: string;
        coinType: string;
        decimals: number;
        recipient: string;
      };
      message: string;
    }>('/x402/build-sponsored', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitSponsoredTransaction(data: { paymentId: string; transactionBytes: string; senderAuthenticatorBytes: string }) {
    return this.request<{
      valid: boolean;
      paymentId: string;
      txHash?: string;
      status: string;
      error?: string;
    }>('/x402/submit-sponsored', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getX402SponsorshipStatus() {
    return this.request<{
      available: boolean;
      facilitatorAddress: string;
      balance: string;
    }>('/x402/sponsorship-status');
  }

  // Sponsored Registration (gas paid by facilitator)
  async buildSponsoredRegistration(data: { senderAddress: string; coinType?: string }) {
    return this.request<{
      transactionBytes: string;
      feePayerAddress: string;
      coinType: string;
      coinSymbol: string;
      message: string;
    }>('/x402/build-sponsored-registration', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitSponsoredRegistration(data: { transactionBytes: string; senderAuthenticatorBytes: string; coinType?: string }) {
    return this.request<{
      success: boolean;
      txHash?: string;
      error?: string;
    }>('/x402/submit-sponsored-registration', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Faucet
  async getFaucetInfo() {
    return this.request<{
      tokenName: string;
      tokenSymbol: string;
      coinType: string;
      decimals: number;
      amountPerRequest: string;
      network: string;
      nodeUrl: string;
    }>('/faucet/info');
  }

  async requestFaucet(address: string) {
    return this.request<{
      success: boolean;
      txHash?: string;
      amount?: string;
      error?: string;
    }>('/faucet/request', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  }

  async getFaucetBalance(address: string) {
    return this.request<{
      address: string;
      balance: string;
      symbol: string;
    }>(`/faucet/balance?address=${encodeURIComponent(address)}`);
  }

  // AI Chat
  async aiChat(data: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    userAddress?: string;
  }) {
    return this.request<{
      message: string;
      stores?: any[];
      menuItems?: any[];
      selectedStore?: any;
      selectedItems?: any[];
      action?: 'search_stores' | 'search_menu' | 'create_order' | 'show_results' | 'confirm_order';
      orderSummary?: {
        storeId: string;
        storeName: string;
        storeOwner?: string;
        items: Array<{ id: string; name: string; price: string; quantity: number; subtotal: string }>;
        totalAmount: string;
      };
    }>('/ai-chat/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async aiSearchStores(query?: string) {
    const endpoint = query ? `/ai-chat/stores?query=${encodeURIComponent(query)}` : '/ai-chat/stores';
    return this.request<any[]>(endpoint);
  }

  async aiGetStoreMenu(storeId: string) {
    return this.request<any[]>(`/ai-chat/menu?storeId=${encodeURIComponent(storeId)}`);
  }

  async aiSearchMenuItems(query: string, storeId?: string) {
    let endpoint = `/ai-chat/menu-items?query=${encodeURIComponent(query)}`;
    if (storeId) {
      endpoint += `&storeId=${encodeURIComponent(storeId)}`;
    }
    return this.request<any[]>(endpoint);
  }
}

export const api = new ApiClient(API_BASE_URL);

// Legacy fetcher for react-query
export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

export async function fetcherWithDefault<T>(url: string, defaultValue: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`);
    if (!response.ok) return defaultValue;
    return response.json();
  } catch {
    return defaultValue;
  }
}

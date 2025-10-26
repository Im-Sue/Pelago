import { create } from 'zustand';
import { PublicKey } from '@solana/web3.js';

export interface MarketData {
  totalSupplyAssets: number;
  totalBorrowAssets: number;
  totalSupplyShares: number;
  totalBorrowShares: number;
  lltv: number;
  loanTokenMint: PublicKey;
  collateralTokenMint: PublicKey;
  loanVault: PublicKey;
  collateralVault: PublicKey;
}

export interface UserPosition {
  supplyShares: number;
  borrowShares: number;
  collateral: number;
}

export interface Transaction {
  id: string;
  type: 'supply' | 'withdraw' | 'collateral' | 'withdrawCollateral' | 'borrow' | 'repay';
  amount: number;
  timestamp: number;
  signature: string;
  status: 'pending' | 'success' | 'failed';
}

interface AppState {
  // 页面状态
  currentPage: 'list' | 'detail';
  setCurrentPage: (page: 'list' | 'detail') => void;

  // Market数据
  selectedMarketId: string | null;
  setSelectedMarketId: (id: string | null) => void;

  marketPda: PublicKey | null;
  marketData: MarketData | null;
  setMarketPda: (pda: PublicKey) => void;
  setMarketData: (data: MarketData) => void;

  // 用户数据
  userPositionPda: PublicKey | null;
  userPosition: UserPosition | null;
  setUserPositionPda: (pda: PublicKey) => void;
  setUserPosition: (position: UserPosition) => void;

  // 交易历史
  transactions: Transaction[];
  addTransaction: (tx: Transaction) => void;
  updateTransactionStatus: (id: string, status: Transaction['status']) => void;

  // UI状态
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  currentStep: 'idle' | 'supply' | 'withdraw' | 'collateral' | 'withdrawCollateral' | 'borrow' | 'repay' | 'success';
  setCurrentStep: (step: AppState['currentStep']) => void;

  error: string | null;
  setError: (error: string | null) => void;

  // 重置函数
  reset: () => void;
}

const initialState = {
  currentPage: 'list' as const,
  selectedMarketId: null,
  marketPda: null,
  marketData: null,
  userPositionPda: null,
  userPosition: null,
  transactions: [],
  isLoading: false,
  currentStep: 'idle' as const,
  error: null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedMarketId: (id) => set({ selectedMarketId: id }),

  setMarketPda: (pda) => set({ marketPda: pda }),
  setMarketData: (data) => set({ marketData: data }),

  setUserPositionPda: (pda) => set({ userPositionPda: pda }),
  setUserPosition: (position) => set({ userPosition: position }),

  addTransaction: (tx) =>
    set((state) => ({
      transactions: [tx, ...state.transactions].slice(0, 20), // 保留最近20条
    })),

  updateTransactionStatus: (id, status) =>
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.id === id ? { ...tx, status } : tx
      ),
    })),

  setIsLoading: (loading) => set({ isLoading: loading }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Toaster } from 'react-hot-toast';
import { MarketListPage } from './pages/MarketListPage';
import { DemoPage } from './pages/DemoPage';
import { useAppStore } from './stores/useAppStore';
import { RPC_ENDPOINT } from './utils/constants';

// 导入钱包适配器样式
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';

function App() {
  // 配置支持的钱包
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  // 获取当前页面状态
  const currentPage = useAppStore((state) => state.currentPage);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* 全局 Toast 通知组件 */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1a1a2e',
                color: '#fff',
                border: '1px solid #9945FF',
              },
              success: {
                iconTheme: {
                  primary: '#14F195',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#FF6B6B',
                  secondary: '#fff',
                },
              },
            }}
          />

          {/* 页面切换逻辑 */}
          {currentPage === 'list' ? <MarketListPage /> : <DemoPage />}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;

import { motion } from 'framer-motion';

const comparisonData = [
  {
    metric: 'Transaction Speed',
    ethereum: '15-30 seconds',
    solana: '< 1 second',
    improvement: '30x faster',
  },
  {
    metric: 'Transaction Cost',
    ethereum: '$30 - $100',
    solana: '$0.0001',
    improvement: '999,900x cheaper',
  },
  {
    metric: 'Throughput',
    ethereum: '15 TPS',
    solana: '65,000 TPS',
    improvement: '4,333x higher',
  },
  {
    metric: 'Finality',
    ethereum: '12-15 minutes',
    solana: '< 1 second',
    improvement: '900x faster',
  },
];

export function EthVsSolana() {
  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent">
        🔥 Ethereum Pelago vs Solana Pelago
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-solana-purple/20">
              <th className="py-4 px-4 text-gray-400 font-semibold">Metric</th>
              <th className="py-4 px-4 text-gray-400 font-semibold">Ethereum</th>
              <th className="py-4 px-4 text-gray-400 font-semibold">Solana</th>
              <th className="py-4 px-4 text-solana-green font-semibold">Improvement</th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((row, index) => (
              <motion.tr
                key={row.metric}
                className="border-b border-solana-purple/10 hover:bg-solana-purple/5 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <td className="py-4 px-4 font-semibold">{row.metric}</td>
                <td className="py-4 px-4 text-gray-400">{row.ethereum}</td>
                <td className="py-4 px-4 text-solana-green">{row.solana}</td>
                <td className="py-4 px-4">
                  <span className="bg-solana-green/20 text-solana-green px-3 py-1 rounded-full text-sm font-bold">
                    {row.improvement}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-center text-sm text-gray-400">
        <p className="bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent font-semibold">
          Pelago brings the best DeFi protocol to the fastest blockchain 🚀
        </p>
      </div>
    </div>
  );
}

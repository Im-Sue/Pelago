import { useMemo } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { COMMITMENT } from '../utils/constants';
import idl from '../idl/pelago_solana.json';
import type { PelagoSolana } from '../types/pelago_solana';

export function usePelagoProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet) return null;

    const provider = new AnchorProvider(
      connection,
      wallet,
      {
        commitment: COMMITMENT,
        preflightCommitment: COMMITMENT,
      }
    );

    return new Program<PelagoSolana>(
      idl as unknown as PelagoSolana,
      provider
    );
  }, [connection, wallet]);

  return program;
}

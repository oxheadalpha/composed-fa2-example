import { TezosToolkit } from '@taquito/taquito';
import {
  address,
  createOnChainTokenMetadata,
  TokenMetadataInternal
} from '@oxheadalpha/fa2-interfaces';
import { mutez } from './utils';
import { originateContract } from '@oxheadalpha/tezos-tools';
import { createStorage } from './base_ft_contract';

export const createCustomStorage = (
  metadata: string,
  owner: address,
  token: TokenMetadataInternal,
  fee: mutez //fee is a part of the custom storage extension
) => {
  const baseStorage = createStorage({
    metadata,
    owner,
    token
  });
  return { asset: baseStorage, fee, collected_fees: 0 };
};

const tzip16Meta = {
  name: 'TZFA2',
  description: 'Tezos/FA2 Exchange',
  homepage: 'https://github.com/oxheadalpha/composed-fa2-example',
  version: '1.0.0',
  license: { name: 'MIT' },
  interfaces: ['TZIP-016', 'TZIP-012', 'TZIP-021'],
  source: {
    tools: ['LIGO'],
    location: 'https://github.com/oxheadalpha/composed-fa2-example'
  }
};

const tokenMeta = {
  token_id: 0,
  decimals: 1000000,
  symbol: 'TZFA2',
  shouldPreferSymbol: true
};

export const originateCustomContract = async (
  toolkit: TezosToolkit,
  code: string,
  fee: mutez
): Promise<address> => {
  const owner = await toolkit.signer.publicKeyHash();
  const storage = createCustomStorage(
    JSON.stringify(tzip16Meta, null, 2),
    owner,
    createOnChainTokenMetadata(tokenMeta),
    fee
  );
  const contract = await originateContract(toolkit, code, storage, 'TZFA2');
  return contract.address;
};

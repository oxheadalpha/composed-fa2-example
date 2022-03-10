import { TezosToolkit } from '@taquito/taquito';
import * as fa2 from '@oxheadalpha/fa2-interfaces';
import { address, tezosApi } from '@oxheadalpha/fa2-interfaces';

export const createStorage = fa2.contractStorage
  .with(fa2.pausableSimpleAdminStorage)
  .with(fa2.fungibleTokenStorage)
  .build;

export const createContractInterface = async (
  toolkit: TezosToolkit,
  address: address
) =>
  (await tezosApi(toolkit).at(address))
    .withFa2()
    .withPausableSimpleAdmin()
    ;

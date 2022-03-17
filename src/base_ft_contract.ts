import { TezosToolkit } from '@taquito/taquito';
import * as fa2 from '@oxheadalpha/fa2-interfaces';
import { address, tezosApi } from '@oxheadalpha/fa2-interfaces';

export const createStorage = fa2.contractStorage
  .with(fa2.pausableSimpleAdminStorage)
  .with(fa2.fungibleTokenStorage)
  .build;

export const createContractInterface = async (
  toolkit: TezosToolkit,
  contractAddress: address,
  lambdaView?: address
) =>
  (await tezosApi(toolkit, lambdaView).at(contractAddress))
    .withFa2()
    .withPausableSimpleAdmin()
    ;

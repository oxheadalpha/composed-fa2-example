import * as path from 'path';
import { TezosToolkit } from "@taquito/taquito";
import { loadFile, mutez } from '../src/utils';
import { address } from '@oxheadalpha/fa2-interfaces';
import { originateCustomContract } from '../src/origination';

export const originateTestContract = async (
  tz: TezosToolkit,
  fee: mutez
): Promise<address> => {
  const code = await loadFile(
    path.join(__dirname, '../dist/tzfa2_contract.tz')
  );
  const address = await originateCustomContract(tz, code, fee);
  return address;
};
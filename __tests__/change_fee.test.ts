import * as path from 'path';
import { BigNumber } from 'bignumber.js';
import { TezosToolkit } from '@taquito/taquito';
import { loadFile, mutez } from '../src/utils';
import { address, runMethod, tezosApi } from '@oxheadalpha/fa2-interfaces';
import { originateCustomContract } from '../src/origination';
import { ExchangeAdmin } from '../src/contract_interface';

import { getBootstrapAccount } from './test_bootstrap';

jest.setTimeout(240000);

const originateTestContract = async (
  tz: TezosToolkit,
  fee: mutez
): Promise<address> => {
  const code = await loadFile(
    path.join(__dirname, '../dist/tzfa2_contract.tz')
  );
  const address = await originateCustomContract(tz, code, fee);
  return address;
};

const getTezBalance = async (tz: TezosToolkit): Promise<number> => {
  const accAddress = await tz.signer.publicKeyHash();
  const balance = await tz.tz.getBalance(accAddress);
  return balance.toNumber();
};

describe('Custom mint and burn test', () => {
  let tz: TezosToolkit;

  beforeAll(async () => {
    tz = await getBootstrapAccount();
  });

  test('originate', async () => {
    const contractAddress = await originateTestContract(tz, 1);
    const contract = await tz.contract.at(contractAddress);
    const storage = await contract.storage<{
      fee: BigNumber;
      collected_fees: BigNumber;
    }>();
    expect(storage.fee.toNumber()).toBe(1);
    expect(storage.collected_fees.toNumber()).toBe(0);
  });

  test('not an admin change fee', async () => {
    const contractAddress = await originateTestContract(tz, 1);
    const alice = await getBootstrapAccount(
      'edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq'
    );
    const contractApi = (await tezosApi(alice).at(contractAddress)).with(
      ExchangeAdmin
    );
    const run = runMethod(contractApi.changeFee(1, 2));
    expect(run).rejects.toThrow('NOT_AN_ADMIN');
  });

  test('change fee, invalid old value', async () => {
    const contractAddress = await originateTestContract(tz, 1);
    const contractApi = (await tezosApi(tz).at(contractAddress)).with(
      ExchangeAdmin
    );
    const run = runMethod(contractApi.changeFee(5, 2));
    expect(run).rejects.toThrow('UNEXPECTED_FEE');
  });

  test('change fee', async () => {
    const contractAddress = await originateTestContract(tz, 1);
    const contractApi = (await tezosApi(tz).at(contractAddress)).with(
      ExchangeAdmin
    );
    await runMethod(contractApi.changeFee(1, 5));

    const contract = await tz.contract.at(contractAddress);
    const storage = await contract.storage<{
      fee: BigNumber;
      collected_fees: BigNumber;
    }>();
    expect(storage.fee.toNumber()).toBe(5);
    expect(storage.collected_fees.toNumber()).toBe(0);

  });
});

import { BigNumber } from 'bignumber.js';
import { TezosToolkit } from '@taquito/taquito';
import { getBootstrapAccount } from './test_bootstrap';
import { originateTestContract } from './originate_test_contract';
import { runMethod, tezosApi } from '@oxheadalpha/fa2-interfaces';
import { ExchangeAdmin } from '../src/contract_interface';

jest.setTimeout(240000);


describe('Custom mint and burn test', () => {
  let tz: TezosToolkit;

  beforeAll(async () => {
    tz = await getBootstrapAccount();
  });

  test('originate', async () => {
    const contractAddress = await originateTestContract(tz, 1000000);
    const contract = await tz.contract.at(contractAddress);
    const storage = await contract.storage<{
      fee: BigNumber;
      collected_fees: BigNumber;
    }>();
    expect(storage.fee.toNumber()).toBe(1000000);
    expect(storage.collected_fees.toNumber()).toBe(0);
  });

  test('not an admin change fee', async () => {
    const contractAddress = await originateTestContract(tz, 1000000);
    const alice = await getBootstrapAccount(
      'edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq'
    );
    const contractApi = (await tezosApi(alice).at(contractAddress)).with(
      ExchangeAdmin
    );
    const run = runMethod(contractApi.changeFee(1, 2));
    await expect(run).rejects.toThrow('NOT_AN_ADMIN');
  });

  test('change fee, invalid old value', async () => {
    const contractAddress = await originateTestContract(tz, 1000000);
    const contractApi = (await tezosApi(tz).at(contractAddress)).with(
      ExchangeAdmin
    );
    const run = runMethod(contractApi.changeFee(5000000, 2000000));
    await expect(run).rejects.toThrow('UNEXPECTED_FEE');
  });

  test('change fee', async () => {
    const contractAddress = await originateTestContract(tz, 1000000);
    const contractApi = (await tezosApi(tz).at(contractAddress)).with(
      ExchangeAdmin
    );
    await runMethod(contractApi.changeFee(1000000, 5000000));

    const contract = await tz.contract.at(contractAddress);
    const storage = await contract.storage<{
      fee: BigNumber;
      collected_fees: BigNumber;
    }>();
    expect(storage.fee.toNumber()).toBe(5000000);
    expect(storage.collected_fees.toNumber()).toBe(0);
  });
});

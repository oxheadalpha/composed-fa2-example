import { TezosToolkit } from '@taquito/taquito';
import { originateTestContract } from './originate_test_contract';
import { getBootstrapAccount } from './test_bootstrap';
import { createCustomContractInterface } from '../src/contract_interface';
import { runMethod } from '@oxheadalpha/fa2-interfaces';

jest.setTimeout(240000);

describe('Pause contract guard test', () => {
  let bob: TezosToolkit;

  beforeAll(async () => {
    bob = await getBootstrapAccount();
  });

  test('pause contract', async () => {
    const contractAddress = await originateTestContract(bob, 2000000);
    const api = await createCustomContractInterface(bob, contractAddress);

    await runMethod(api.pause(true));

    const run1 = runMethod(api.mint(2000000), { amount: 5000000, mutez: true });
    await expect(run1).rejects.toThrow('PAUSED');

    const run2 = runMethod(api.burn(1000000), { amount: 2000000, mutez: true });
    await expect(run2).rejects.toThrow('PAUSED');
  });
});

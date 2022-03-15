import { BigNumber } from 'bignumber.js';
import {
  ContractMethod,
  ContractProvider,
  SendParams,
  TezosToolkit,
  TransactionOperation
} from '@taquito/taquito';
import {
  getBootstrapAccount,
  createTestAccount,
  originateLambdaViewContract
} from './test_bootstrap';
import { originateTestContract } from './originate_test_contract';
import { address, nat, tezosApi } from '@oxheadalpha/fa2-interfaces';
import { ExchangeAdmin, Minter } from '../src/contract_interface';

jest.setTimeout(240000);

const getTezBalance = async (
  tz: TezosToolkit,
  address?: address
): Promise<number> => {
  const accAddress = address || (await tz.signer.publicKeyHash());
  const balance = await tz.tz.getBalance(accAddress);
  return balance.toNumber();
};

const getCollectedFees = async (
  tz: TezosToolkit,
  contractAddress: address
): Promise<number> => {
  const contract = await tz.contract.at(contractAddress);
  const storage = await contract.storage<{ collected_fees: BigNumber }>();
  return storage.collected_fees.toNumber();
};

const natAsNumber = (n: nat): number =>
  typeof n === 'number' ? n : n.toNumber();

describe('Minting Test', () => {
  let mike: TezosToolkit;
  let jane: TezosToolkit;
  let lambdaView: address;

  beforeAll(async () => {
    const tz = await getBootstrapAccount();
    mike = await createTestAccount(
      tz,
      'edskRfLsHb49bP4dTpYzAZ7qHCX4ByK2g6Cwq2LWqRYAQSeRpziaZGBW72vrJnp1ahLGKd9rXUf7RHzm8EmyPgseUi3VS9putT'
    );
    jane = await createTestAccount(
      tz,
      'edskRqb8GgnD4d2B7nR3ofJajDU7kwooUzXz7yMwRdLDP9j7Z1DvhaeBcs8WkJ4ELXXJgVkq5tGwrFibojDjYVaG7n4Tq1qDxZ'
    );
    lambdaView = await originateLambdaViewContract(tz);
  });

  const runMethod = async (
    cm: ContractMethod<ContractProvider>,
    sendParams?: SendParams
  ): Promise<TransactionOperation> => {
    const op = await cm.send(sendParams);
    await op.confirmation();
    return op;
  };

  test('Invalid Mint', async () => {
    const contractAddress = await originateTestContract(mike, 2000000);
    const ownerApi = (await tezosApi(jane).at(contractAddress)).with(Minter);

    const run1 = runMethod(ownerApi.mint(3000000), {
      amount: 5000000,
      mutez: true
    });
    await expect(run1).rejects.toThrow('UNEXPECTED_FEE');

    const run2 = runMethod(ownerApi.mint(2000000), {
      amount: 1000000,
      mutez: true
    });
    await expect(run2).rejects.toThrow('INSUFFICIENT_AMOUNT');

    // const adminApi = (await tezosApi(mike).at(contractAddress)).with(
    //   ExchangeAdmin
    // );
  });

  test('Mint', async () => {
    const contractAddress = await originateTestContract(mike, 2000000);
    const ownerApi = (await tezosApi(jane, lambdaView).at(contractAddress))
      .with(Minter)
      .withFa2();

    const beforeMintBal = await getTezBalance(jane);

    await runMethod(ownerApi.mint(2000000), { amount: 5000000, mutez: true });

    //check owner Tez balance
    const afterMintBal = await getTezBalance(jane);
    const diffBal = beforeMintBal - afterMintBal;
    expect(diffBal / 1000000).toBeCloseTo(5, 1);

    //check contract balances
    const contractBal = await getTezBalance(jane, contractAddress);
    expect(contractBal).toBe(5000000); //2tez fee + 3tez exchanged for tokens

    const fees = await getCollectedFees(jane, contractAddress);
    expect(fees).toBe(2000000);

    //check owner token balance
    const janeAddress = await jane.signer.publicKeyHash();
    const tokenBal = await ownerApi.queryBalances([
      { owner: janeAddress, token_id: 0 }
    ]);
    expect(natAsNumber(tokenBal[0].balance) / 1000000).toBeCloseTo(3, 1);
  });
});

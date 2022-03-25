import { BigNumber } from 'bignumber.js';
import { TezosToolkit } from '@taquito/taquito';
import { getBootstrapAccount, createTestAccount } from './test_bootstrap';
import { originateTestContract } from './originate_test_contract';
import {
  address,
  Fa2Contract,
  runMethod,
  tezosApi
} from '@oxheadalpha/fa2-interfaces';
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

const getTokenBalance = async (
  contract: Fa2Contract,
  owner: address
): Promise<number> => {
  const tokenBal = await contract.queryBalances([{ owner, token_id: 0 }]);
  const bal = tokenBal[0].balance;
  return typeof bal === 'number' ? bal : bal.toNumber();
};

const getCollectedFees = async (
  tz: TezosToolkit,
  contractAddress: address
): Promise<number> => {
  const contract = await tz.contract.at(contractAddress);
  const storage = await contract.storage<{ collected_fees: BigNumber }>();
  return storage.collected_fees.toNumber();
};

const getTotalSupply = async (
  tz: TezosToolkit,
  contractAddress: address
): Promise<number> => {
  const contract = await tz.contract.at(contractAddress);
  const storage = await contract.storage<{
    asset: { assets: { total_supply: BigNumber } };
  }>();
  return storage.asset.assets.total_supply.toNumber();
};

describe('Mint/Burn/Withdraw', () => {
  let mike: TezosToolkit;
  let jane: TezosToolkit;

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
  });

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
  });

  test('Mint', async () => {
    const contractAddress = await originateTestContract(mike, 2000000);
    const ownerApi = (await tezosApi(jane).at(contractAddress))
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
    const tokenBal = await getTokenBalance(ownerApi, janeAddress);
    expect(tokenBal / 1000000).toBeCloseTo(3, 1);

    const totalSupply = await getTotalSupply(jane, contractAddress);
    expect(totalSupply).toBe(tokenBal);
  });

  test('Invalid Burn', async () => {
    const contractAddress = await originateTestContract(mike, 2000000);
    const ownerApi = (await tezosApi(jane).at(contractAddress))
      .with(Minter)
      .withFa2();

    await runMethod(ownerApi.mint(2000000), { amount: 5000000, mutez: true });
    //token balance ~3,000,000 mutez

    //insufficient token balance to burn
    const run1 = runMethod(ownerApi.burn(4000000), {
      amount: 2000000, //fee
      mutez: true
    });
    await expect(run1).rejects.toThrow('FA2_INSUFFICIENT_BALANCE');

    //fee amount is too high
    const run2 = runMethod(ownerApi.burn(2000000), {
      amount: 5000000, //fee
      mutez: true
    });
    await expect(run2).rejects.toThrow('UNEXPECTED_FEE');

    //fee amount is too low
    const run3 = runMethod(ownerApi.burn(2000000), {
      amount: 1000000, //fee
      mutez: true
    });
    await expect(run3).rejects.toThrow('UNEXPECTED_FEE');
  });

  test('Burn', async () => {
    const contractAddress = await originateTestContract(mike, 1000000);
    const ownerApi = (await tezosApi(jane).at(contractAddress))
      .with(Minter)
      .withFa2();

    // ~ 4,000,000 tokens minted
    await runMethod(ownerApi.mint(1000000), { amount: 5000000, mutez: true });

    const janeAddress = await jane.signer.publicKeyHash();
    const tokenBalanceBeforeBurn = await getTokenBalance(ownerApi, janeAddress);
    const tezBalanceBeforeBurn = await getTezBalance(jane);

    await runMethod(ownerApi.burn(3000000), {
      amount: 1000000, //fee
      mutez: true
    });

    const tokenBalanceAfterBurn = await getTokenBalance(ownerApi, janeAddress);
    expect(tokenBalanceBeforeBurn - tokenBalanceAfterBurn).toBe(3000000);

    const fees = await getCollectedFees(jane, contractAddress);
    expect(fees).toBe(2000000); //mint + burn fees

    const totalSupply = await getTotalSupply(jane, contractAddress);
    expect(totalSupply).toBe(tokenBalanceAfterBurn);

    const contractBalance = await getTezBalance(jane, contractAddress);
    //mint fee 1tez + burn fee 1tez + 4tez mint - 3 tez burn = 3tez
    expect(contractBalance / 1000000).toBeCloseTo(3, 1);

    const tezBalanceAfterBurn = await getTezBalance(jane);
    const tezBalanceDiff = tezBalanceAfterBurn - tezBalanceBeforeBurn;
    //3tez worth is burned minus 1tez fee
    expect(tezBalanceDiff / 1000000).toBeCloseTo(2, 1);
  });

  test('Withdraw Non Admin', async () => {
    const contractAddress = await originateTestContract(mike, 1000000);
    const adminApi = (await tezosApi(jane).at(contractAddress)).with(
      ExchangeAdmin
    );
    const run = runMethod(adminApi.withdrawFees());
    await expect(run).rejects.toThrow('NOT_AN_ADMIN');
  });

  test('Withdraw', async () => {
    const contractAddress = await originateTestContract(mike, 1000000);
    const ownerApi = (
      await tezosApi(jane).at(contractAddress)
    ).with(Minter);

    await runMethod(ownerApi.mint(1000000), { amount: 5000000, mutez: true });
    await runMethod(ownerApi.burn(3000000), {
      amount: 1000000, //fee
      mutez: true
    });

    const feesBefore = await getCollectedFees(jane, contractAddress);
    expect(feesBefore).toBe(2000000);
    const contractBalanceBeforeWithdraw = await getTezBalance(
      mike,
      contractAddress
    );
    const adminBalanceBeforeWithdraw = await getTezBalance(mike);

    const adminApi = (await tezosApi(mike).at(contractAddress)).with(
      ExchangeAdmin
    );

    await runMethod(adminApi.withdrawFees());

    const feesAfter = await getCollectedFees(jane, contractAddress);
    expect(feesAfter).toBe(0);
    const contractBalanceAfterWithdraw = await getTezBalance(
      mike,
      contractAddress
    );
    const contractBalanceDiff =
      contractBalanceBeforeWithdraw - contractBalanceAfterWithdraw;
    // withdrawn 2 tez
    expect(contractBalanceDiff).toBe(2000000);

    const adminBalanceAfterWithdraw = await getTezBalance(mike);
    const adminBalanceDiff =
      adminBalanceAfterWithdraw - adminBalanceBeforeWithdraw;
    //received 2 tez
    expect(adminBalanceDiff / 1000000).toBeCloseTo(2, 1);
  });
});

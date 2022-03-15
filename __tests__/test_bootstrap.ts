import { TezosToolkit, VIEW_LAMBDA } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import { awaitForSandbox } from '@oxheadalpha/tezos-tools';
import { address } from '@oxheadalpha/fa2-interfaces';

export type TestApi = {
  bob: TezosToolkit;
  mike: TezosToolkit;
  jane: TezosToolkit;
  lambdaView?: string;
};

export async function bootstrap(): Promise<TestApi> {
  const bob = await createToolkit(
    'http://localhost:20000',
    'edsk3RFgDiCt7tWB2oe96w1eRw72iYiiqZPLu9nnEY23MYRp2d8Kkx'
  );
  await awaitForSandbox(bob);
  const lambdaView = await originateLambdaViewContract(bob);
  const mike = await createTestAccount(
    bob,
    'edskRfLsHb49bP4dTpYzAZ7qHCX4ByK2g6Cwq2LWqRYAQSeRpziaZGBW72vrJnp1ahLGKd9rXUf7RHzm8EmyPgseUi3VS9putT'
  );
  const jane = await createTestAccount(
    bob,
    'edskRqb8GgnD4d2B7nR3ofJajDU7kwooUzXz7yMwRdLDP9j7Z1DvhaeBcs8WkJ4ELXXJgVkq5tGwrFibojDjYVaG7n4Tq1qDxZ'
  );
  return {bob, mike, jane, lambdaView};
}

async function createToolkit(
  rpc: string,
  secretKey: string
): Promise<TezosToolkit> {
  const signer = await InMemorySigner.fromSecretKey(secretKey);
  const toolkit = new TezosToolkit(rpc);
  toolkit.setProvider({ rpc, signer });
  return toolkit;
}

async function originateLambdaViewContract(
  tezos: TezosToolkit
): Promise<address> {
  console.log('originating Taquito lambda view contract...');
  const op = await tezos.contract.originate({
    code: VIEW_LAMBDA.code,
    storage: VIEW_LAMBDA.storage
  });
  const lambdaContract = await op.contract();

  console.log(`originated Taquito lambda view ${lambdaContract.address}`);
  return lambdaContract.address;
}

async function createTestAccount(
  tz: TezosToolkit,
  secretKey: string
): Promise<TezosToolkit> {
  const toolkit = new TezosToolkit(tz.rpc);
  const signer = await InMemorySigner.fromSecretKey(secretKey);
  toolkit.setProvider({ signer });
  const accountAddress = await signer.publicKeyHash();
  console.log(`creating test account ${accountAddress}`);
  const op = await tz.contract.transfer({
    to: accountAddress,
    amount: 1000
  });
  await op.confirmation();
  return toolkit;
}

import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import { awaitForSandbox } from '@oxheadalpha/tezos-tools';
import { address } from '@oxheadalpha/fa2-interfaces';


export async function getBootstrapAccount(
  secretKey?: string
): Promise<TezosToolkit> {
  const bob = await createToolkit(
    'http://localhost:20000',
    secretKey || 'edsk3RFgDiCt7tWB2oe96w1eRw72iYiiqZPLu9nnEY23MYRp2d8Kkx'
  );
  await awaitForSandbox(bob);
  return bob;
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

export async function createTestAccount(
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

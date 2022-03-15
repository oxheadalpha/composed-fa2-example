import * as path from 'path';
import { TezosToolkit } from '@taquito/taquito';
import { bootstrap, TestApi } from './test_bootstrap';
import {loadFile, mutez } from '../src/utils';
import { TezosApi, address } from '@oxheadalpha/fa2-interfaces';
import {originateCustomContract} from '../src/origination';

jest.setTimeout(240000);

const originateTestContract = async (tz: TezosToolkit, fee: mutez): Promise<address> => {
  const code = await loadFile(path.join(__dirname, '../dist/tzfa2_contract.tz'));
  const address = await originateCustomContract(tz, code, fee);
  return address;
}

const getTezBalance = async (tz: TezosToolkit): Promise<number> => {
  const accAddress = await tz.signer.publicKeyHash();
  const balance = await tz.tz.getBalance(accAddress);
  return balance.toNumber();
}

describe('Custom mint and burn test', () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await bootstrap();
    const mikeBalance = await getTezBalance(api.mike);
    console.log(`Mike balance ${mikeBalance.toLocaleString()}`);
  });


  test('originate', async () => {
    const address = await originateTestContract(api.mike, 1);
  });
});

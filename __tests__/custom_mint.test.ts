import { bootstrap, TestApi } from './test_bootstrap';

jest.setTimeout(240000);

describe('Custom mint and burn test', () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await bootstrap();
  });
  test('hello', async () => {
    console.log('HELLO WORLD');
    const mikeAddress = await api.mike.signer.publicKeyHash();
    const mikeBalance = await api.mike.tz.getBalance(mikeAddress);
    console.log(`Mike balance ${mikeBalance.toNumber().toLocaleString()}`);
  });
});

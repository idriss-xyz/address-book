const { IdrissCrypto } = require('../../lib');
const assert = require('assert');
const { BaseIdrissCrypto } = require('../../lib/baseIdrissCrypto');

const createProvider = async () => {
  const obj = new IdrissCrypto(undefined, { providerType: 'web3' });
  return obj;
};

describe('translating address', () => {
  it('Email', async () => {
    const obj = await createProvider();
    const resultAddress = await obj.resolve('hello@idriss.xyz');
    assert.equal(
      resultAddress['Metamask ETH'],
      '0x11E9F9344A9720d2B2B5F0753225bb805161139B',
    );
    assert.equal(
      resultAddress['Coinbase BTC'],
      'bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh',
    );
  }).timeout(10000);

  it('Phone', async () => {
    const obj = await createProvider();
    const resultPhone = await obj.resolve('+16506655942');
    assert.equal(
      resultPhone['Phantom SOL'],
      '6GmzRK2qLhBPK2WwYM14EGnxh95jBTsJGXMgFyM3VeVk',
    );
    assert.equal(
      resultPhone['Essentials ELA'],
      'EL4bLnZALyJKkoEf99qjZMrKVresHU76JU',
    );
    assert.equal(
      resultPhone['Binance BTC'],
      '1FdqxZsS6HVEs1NaQUdkoQWKYA9R9yfhdz',
    );
  }).timeout(10000);

  it('Twitter', async () => {
    const obj = await createProvider();
    const resultTwitter = await obj.resolve('@IDriss_xyz');
    assert.equal(
      resultTwitter['Metamask ETH'],
      '0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9',
    );
    assert.equal(
      resultTwitter['Coinbase ETH'],
      '0x995945Fb74e0f8e345b3f35472c3e07202Eb38Ac',
    );
    assert.equal(
      resultTwitter['Argent ETH'],
      '0x4B994A4b85378906B3FE9C5292C749f79c9aD661',
    );
    assert.equal(
      resultTwitter['Tally ETH'],
      '0xa1ce10d433bb841cefd82a43f10b6b597538fa1d',
    );
    assert.equal(
      resultTwitter['Trust ETH'],
      '0xE297b1E893e7F8849413D8ee7407DB343979A449',
    );
    assert.equal(
      resultTwitter['Rainbow ETH'],
      '0xe10A2331Ac5498e7544579167755d6a756786a9F',
    );
  }).timeout(10000);

  it('Multi Resolve', async () => {
    const obj = await createProvider();
    const resultAddress = await obj.multiResolve([
      'hello@idriss.xyz',
      '@IDriss_xyz',
    ]);
    console.log(resultAddress);
    assert.equal(
      resultAddress['hello@idriss.xyz']['Metamask ETH'],
      '0x11E9F9344A9720d2B2B5F0753225bb805161139B',
    );
    assert.equal(
      resultAddress['hello@idriss.xyz']['Coinbase BTC'],
      'bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh',
    );
    assert.equal(
      resultAddress['@IDriss_xyz']['Metamask ETH'],
      '0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9',
    );
    assert.equal(
      resultAddress['@IDriss_xyz']['Coinbase ETH'],
      '0x995945Fb74e0f8e345b3f35472c3e07202Eb38Ac',
    );
    assert.equal(
      resultAddress['@IDriss_xyz']['Argent ETH'],
      '0x4B994A4b85378906B3FE9C5292C749f79c9aD661',
    );
    assert.equal(
      resultAddress['@IDriss_xyz']['Tally ETH'],
      '0xa1ce10d433bb841cefd82a43f10b6b597538fa1d',
    );
    assert.equal(
      resultAddress['@IDriss_xyz']['Trust ETH'],
      '0xE297b1E893e7F8849413D8ee7407DB343979A449',
    );
    assert.equal(
      resultAddress['@IDriss_xyz']['Rainbow ETH'],
      '0xe10A2331Ac5498e7544579167755d6a756786a9F',
    );
  }).timeout(10000);

  it('Basic request 2', async () => {
    const obj = await createProvider();
    const resultTwitter = await obj.resolve('@idriss_xyz');
    assert.equal(
      resultTwitter['Tally ETH'],
      '0xa1ce10d433bb841cefd82a43f10b6b597538fa1d',
    );
  }).timeout(10000);
  it('Parametrized request 1', async () => {
    const obj = await createProvider();
    const resultEmail = await obj.resolve('hello@idriss.xyz', {
      network: 'btc',
      coin: 'BTC',
    });
    assert.equal(
      resultEmail['Coinbase BTC'],
      'bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh',
    );
    assert(Object.keys(resultEmail).every((x) => x.includes('BTC')));
    const resultPhone = await obj.resolve('+16506655942', {
      network: 'btc',
      coin: 'ELA',
    });
    assert.equal(
      resultPhone['Essentials ELA'],
      'EL4bLnZALyJKkoEf99qjZMrKVresHU76JU',
    );
    assert(Object.keys(resultPhone).every((x) => x.includes('ELA')));
    const resultTwitter = await obj.resolve('@IDriss_xyz', {
      network: 'evm',
      coin: 'ETH',
    });
    assert.equal(
      resultTwitter['Metamask ETH'],
      '0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9',
    );
    assert(Object.keys(resultTwitter).every((x) => x.includes('ETH')));
  }).timeout(10000);

  it('Parametrized request 2', async () => {
    const obj = await createProvider();
    const resultEmail = await obj.resolve('hello@idriss.xyz', { coin: 'BTC' });
    assert.equal(
      resultEmail['Coinbase BTC'],
      'bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh',
    );
    assert.equal(Object.keys(resultEmail).length, 1);
    const resultPhone = await obj.resolve('+16506655942', { coin: 'BTC' });
    assert.equal(
      resultPhone['Binance BTC'],
      '1FdqxZsS6HVEs1NaQUdkoQWKYA9R9yfhdz',
    );
    assert.equal(Object.keys(resultPhone).length, 1);
    const resultTwitter = await obj.resolve('@IDriss_xyz', { coin: 'ETH' });
    assert.equal(
      resultTwitter['Tally ETH'],
      '0xa1ce10d433bb841cefd82a43f10b6b597538fa1d',
    );
    assert.equal(Object.keys(resultTwitter).length, 6);
  }).timeout(10000);
  it('Empty response', async () => {
    const obj = await createProvider();
    const result = await obj.resolve('not@existing.email');
    assert.deepEqual(result, {});
  }).timeout(10000);

  it('Checking matching input', async () => {
    assert.equal(BaseIdrissCrypto.matchInput('+48123456789'), 'phone');
    assert.equal(BaseIdrissCrypto.matchInput('name@gmail.com'), 'mail');
    assert.equal(BaseIdrissCrypto.matchInput('name@name.studio'), 'mail');
    assert.equal(BaseIdrissCrypto.matchInput('@twitter_username'), 'twitter');
    assert.equal(BaseIdrissCrypto.matchInput('something_else'), null);
  });
});

describe('Reversed translation', () => {
  it('Twitter2', async () => {
    const obj = await createProvider();

    const result1 = await obj.reverseResolve(
      '0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9',
    );
    assert.equal(result1, '@idriss_xyz');
  }).timeout(10000);
  it('Can reverse resolve batch addresses', async () => {
    const obj = await createProvider();

    const resultReverseBatch = await obj.reverseResolve([
      '0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9',
      '0x4a3755eB99ae8b22AaFB8f16F0C51CF68Eb60b85',
      'bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh',
    ]);
    assert.equal(
      resultReverseBatch['0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9'],
      '@idriss_xyz',
    );
    assert.equal(
      resultReverseBatch['0x4a3755eB99ae8b22AaFB8f16F0C51CF68Eb60b85'],
      '@levertz_',
    );
    assert.equal(
      resultReverseBatch['bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh'],
      '',
    );
  }).timeout(10000);
});

describe('getIDriss', () => {
  it('should return correct address', async () => {
    const obj = await createProvider();

    const result = await obj.getIDriss(
      'aca95d99741f8f2de25a39b62b0cd16e91ae572ac4b54ecf27334a6edc285d77',
    );
    assert.equal(result, '0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9');
  }).timeout(10000);

  it('should return error', async () => {
    const obj = await createProvider();

    let error;
    try {
      await obj.getIDriss('wrongString');
    } catch (e) {
      error = e;
    }

    assert(error instanceof Error);
    assert.equal(
      error.message,
      'Returned error: execution reverted: Binding does not exist.',
    );
  }).timeout(10000);
});

import { provider } from 'web3-core';
import Web3 from 'web3';
import { ethers } from 'ethers';

import { ConnectionOptions } from './types/connectionOptions';
import { Web3Provider, Web3ProviderAdapter } from './web3Provider';
import { BaseIdrissCrypto } from './baseIdrissCrypto';

type IdrissCryptoConnectionOptions = Omit<ConnectionOptions, 'web3Provider'> &
  (
    | {
        providerType?: 'web3';
        web3Provider?: provider;
      }
    | {
        providerType: 'ethersv5';
        web3Provider?: ConstructorParameters<
          typeof ethers.providers.Web3Provider
        >[0];
      }
  );

export class IdrissCrypto extends BaseIdrissCrypto {
  constructor(
    url: string = 'https://polygon-rpc.com/',
    connectionOptions: IdrissCryptoConnectionOptions = {},
  ) {
    let web3Provider: Web3Provider;

    if (connectionOptions.providerType === 'ethersv5') {
      const ethersProvider = connectionOptions.web3Provider
        ? new ethers.providers.Web3Provider(connectionOptions.web3Provider)
        : new ethers.providers.JsonRpcProvider(url);
      web3Provider = Web3ProviderAdapter.fromEthersV5(ethersProvider);
    } else {
      web3Provider = Web3ProviderAdapter.fromWeb3(
        new Web3(
          connectionOptions.web3Provider ??
            new Web3.providers.HttpProvider(url),
        ),
      );
    }

    super(url, { ...connectionOptions, web3Provider });
  }

  protected async digestMessage(message: string) {
    const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash the message
    const hashArray = [...new Uint8Array(hashBuffer)]; // convert buffer to byte array
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(''); // convert bytes to hex string
    return hashHex;
  }

  public async getConnectedAccount(): Promise<string> {
    return this.web3Provider.getConnectedAccount();
  }
}

import type { TransactionReceipt } from 'web3-core/types';
import type { BigNumberish } from '@ethersproject/bignumber';
import { BigNumber } from '@ethersproject/bignumber';
import Web3 from 'web3';

import { reverseTwitterID } from './twitter/utils';
import type { Web3Provider } from './web3Provider';
import { Web3ProviderAdapter } from './web3Provider';
import { ABIS } from './abi/constants';
import { NonOptional } from './utils-types';
import { CONTRACTS_ADDRESSES } from './contract/constants';
import type { ContractsAddresses } from './contract/constants';
import type { Contract } from './contract/types';
import type { ConnectionOptions } from './types/connectionOptions';
import { matchInput } from './utils/matchInput';
import type { ResolveOptions } from './wallet/types';
import { transformIdentifier } from './utils/transformIdentifier';
import { filterWalletTags, getWalletTagAddress } from './wallet/utils';
import type { SendToAnyoneParams } from './types/sendToAnyoneParams';
import type {
  PreparedTransaction,
  TransactionOptions,
} from './types/transactionOptions';
import type {
  MultiSendToHashTransactionReceipt,
  SendToHashTransactionReceipt,
} from './types/sendToHashTransactionReceipt';
import type { AssetLiability } from './types/assetLiability';
import { AssetType } from './types/assetType';
import type { VotingParams } from './types/votingParams';

export abstract class BaseIdrissCrypto {
  protected web3Provider: Web3Provider;
  protected registryWeb3Provider: Web3Provider;
  protected contractsAddressess: ContractsAddresses;

  private idrissRegistryContract: Contract;
  private idrissMultipleRegistryContract: Contract;
  private idrissSendToAnyoneContract: Contract;
  private priceOracleContract: Contract;
  private tippingContract: Contract;

  protected abstract digestMessage(message: string): Promise<string>;
  public abstract getConnectedAccount(): Promise<string>;

  // we split web3 from web3 for registry, as registry is only accessible on Polygon,
  // and library is about to support multiple chains
  constructor(url: string, connectionOptions: ConnectionOptions) {
    this.contractsAddressess = {
      ...CONTRACTS_ADDRESSES,
      idrissRegistry:
        connectionOptions.idrissRegistryContractAddress ??
        CONTRACTS_ADDRESSES.idrissRegistry,
      idrissMultipleRegistry:
        connectionOptions.idrissMultipleRegistryContractAddress ??
        CONTRACTS_ADDRESSES.idrissMultipleRegistry,
      idrissReverseMapping:
        connectionOptions.reverseIDrissMappingContractAddress ??
        CONTRACTS_ADDRESSES.idrissReverseMapping,
      priceOracle:
        connectionOptions.priceOracleContractAddress ??
        CONTRACTS_ADDRESSES.priceOracle,
      idrissTipping:
        connectionOptions.tippingContractAddress ??
        CONTRACTS_ADDRESSES.idrissTipping,
    };

    this.web3Provider = connectionOptions.web3Provider;

    this.registryWeb3Provider = Web3ProviderAdapter.fromWeb3(
      new Web3(new Web3.providers.HttpProvider(url)),
    );

    this.idrissRegistryContract = this.registryWeb3Provider.createContract(
      ABIS.IDrissRegistryAbi,
      this.contractsAddressess.idrissRegistry,
    );

    this.idrissMultipleRegistryContract =
      this.registryWeb3Provider.createContract(
        ABIS.IDrissMultipleRegistryAbiJson,
        this.contractsAddressess.idrissMultipleRegistry,
      );

    this.idrissSendToAnyoneContract = this.web3Provider.createContract(
      ABIS.IDrissSendToAnyoneAbi,
      this.contractsAddressess.idrissSendToAnyone,
    );
    this.priceOracleContract = this.web3Provider.createContract(
      ABIS.PriceOracleAbi,
      this.contractsAddressess.priceOracle,
    );
    this.tippingContract = this.web3Provider.createContract(
      ABIS.IDrissTippingAbi,
      this.contractsAddressess.idrissTipping,
    );
  }

  public static matchInput(input: string) {
    return matchInput(input);
  }

  public getIDriss(hash: string) {
    return this.idrissRegistryContract.callMethod({
      method: { name: 'getIDriss', args: [hash] },
    });
  }

  public async resolve(input: string, resolveOptions: ResolveOptions = {}) {
    const identifier = await transformIdentifier(input);
    const filteredWalletTags = filterWalletTags(resolveOptions);

    const digestPromises = filteredWalletTags.map(
      async ({ tagAddress, tagName }) => {
        const digested = await this.digestMessage(identifier + tagAddress);
        return { digested, tagName };
      },
    );

    const digestionResult = await Promise.all(digestPromises);
    const digestedMessages = digestionResult.map((v) => v.digested);

    const getMultipleIDrissResponse: Array<[string, string]> =
      await this.idrissMultipleRegistryContract.callMethod({
        method: { name: 'getMultipleIDriss', args: [digestedMessages] },
      });

    return Object.fromEntries(
      getMultipleIDrissResponse
        .map(([digested, resolvedAddress]) => {
          if (!resolvedAddress) {
            return;
          }

          const foundResult = digestionResult.find(
            (v) => v.digested === digested,
          );

          if (!foundResult) {
            throw new Error(`Expected digested message: ${digested}`);
          }

          return [foundResult.tagName, resolvedAddress];
        })
        .filter(Boolean),
    );
  }

  public async multiResolve(
    inputs: string[],
    resolveOptions: ResolveOptions = {},
  ): Promise<{ [input: string]: { [tagName: string]: string } }> {
    const allDigestionPromises = inputs.map(async (input) => {
      try {
        const identifier = await transformIdentifier(input);
        const filteredWalletTags = filterWalletTags(resolveOptions);

        return Promise.all(
          filteredWalletTags.map(async ({ tagAddress, tagName }) => {
            const digested = await this.digestMessage(identifier + tagAddress);
            return { digested, tagName, input };
          }),
        );
      } catch (error) {
        console.error(`Error processing ${input}`);
        return [];
      }
    });

    const allDigestions = (await Promise.all(allDigestionPromises))
      .flat()
      .filter((v) => v);
    const digestedMessages = allDigestions.map((v) => v.digested);

    const getMultipleIDrissResponse: Array<[string, string]> =
      await this.idrissMultipleRegistryContract.callMethod({
        method: { name: 'getMultipleIDriss', args: [digestedMessages] },
      });

    const results: { [input: string]: { [tagName: string]: string } } = {};

    getMultipleIDrissResponse.forEach(([digested, resolvedAddress]) => {
      if (!resolvedAddress) return;

      const foundResult = allDigestions.find((v) => v.digested === digested);
      if (!foundResult)
        throw new Error(`Expected digested message: ${digested}`);

      if (!results[foundResult.input]) {
        results[foundResult.input] = {};
      }

      results[foundResult.input][foundResult.tagName] = resolvedAddress;
    });

    return results;
  }

  public async multitransferToIDriss(
    sendParams: SendToAnyoneParams[],
    transactionOptions: TransactionOptions = {},
  ) {
    let result: MultiSendToHashTransactionReceipt | TransactionReceipt;

    const tippingContractAllowances = new Map<string, AssetLiability>();

    const registeredUsersSendParams = [];

    for (const sendParam of sendParams) {
      if (this.web3Provider.isAddress(sendParam.beneficiary)) {
        sendParam.hash = sendParam.beneficiary;
        this.addAssetForAllowanceToMap(
          tippingContractAllowances,
          sendParam.asset,
        );
        registeredUsersSendParams.push(sendParam);
        continue;
      }

      const resolvedIDriss = await this.resolve(sendParam.beneficiary);

      //TODO: add approve for all for ERC721
      if (
        resolvedIDriss &&
        resolvedIDriss[sendParam.walletType!.walletTag!] &&
        resolvedIDriss[sendParam.walletType!.walletTag!].length > 0
      ) {
        sendParam.hash = resolvedIDriss[sendParam.walletType!.walletTag!];
        this.addAssetForAllowanceToMap(
          tippingContractAllowances,
          sendParam.asset,
        );
        registeredUsersSendParams.push(sendParam);
      }
    }

    const signer = await this.getConnectedAccount();

    await this.approveAssets(
      [...tippingContractAllowances.values()],
      signer,
      this.contractsAddressess.idrissTipping,
      transactionOptions,
    );

    if (registeredUsersSendParams.length > 0) {
      result = await this.callWeb3multiTipping(
        registeredUsersSendParams,
        transactionOptions,
      );
    }

    return result!;
  }

  private async encodeTippingToHex(param: SendToAnyoneParams) {
    const method = await this.getTippingMethod(param);
    return method.encodeABI();
  }

  private addAssetForAllowanceToMap(
    assetsMap: Map<string, AssetLiability>,
    asset: AssetLiability,
  ) {
    if (asset.type !== AssetType.Native) {
      if (!asset.assetContractAddress || asset.assetContractAddress === '') {
        throw new Error('Asset address cannot be undefined');
      }

      // because for ERC721 we have to approve each id separately
      const assetMapKey =
        asset.type === AssetType.ERC721
          ? `${asset.assetContractAddress}-${asset.assetId}`
          : `${asset.assetContractAddress}`;

      const savedAsset: AssetLiability = assetsMap.get(assetMapKey) ?? {
        ...asset,
        amount: 0,
      };

      savedAsset.amount = BigNumber.from(savedAsset.amount).add(asset.amount);
      assetsMap.set(assetMapKey, savedAsset);
    }
  }

  public async transferToIDriss(
    beneficiary: string,
    resolveOptions: NonOptional<ResolveOptions>,
    asset: AssetLiability,
    message: string,
    transactionOptions: TransactionOptions = {},
  ) {
    if (resolveOptions.network !== 'evm') {
      throw new Error('Only transfers on Polygon are supported at the moment');
    }

    let result: SendToHashTransactionReceipt | TransactionReceipt;

    if (this.web3Provider.isAddress(beneficiary)) {
      result = await this.callWeb3Tipping(
        beneficiary,
        asset,
        message,
        transactionOptions,
      );
      return result;
    }

    const resolvedIDriss = await this.resolve(beneficiary);

    if (
      resolvedIDriss &&
      resolvedIDriss[resolveOptions.walletTag!] &&
      resolvedIDriss[resolveOptions.walletTag!].length > 0
    ) {
      return await this.callWeb3Tipping(
        resolvedIDriss[resolveOptions.walletTag!],
        asset,
        message,
        transactionOptions,
      );
    }
    return null;
  }

  vote(
    encodedVote: string,
    asset: AssetLiability,
    roundContractAddress: string,
    transactionOptions: TransactionOptions = {},
  ) {
    return this.callWeb3Vote(
      encodedVote,
      asset,
      roundContractAddress,
      transactionOptions,
    );
  }

  public async getUserHash(
    resolveOptions: NonOptional<ResolveOptions>,
    beneficiary: string,
  ) {
    const cleanedTagAddress = getWalletTagAddress(resolveOptions);
    const transformedBeneficiary = await transformIdentifier(beneficiary);
    return this.digestMessage(transformedBeneficiary + cleanedTagAddress);
  }

  public async getHashForIdentifier(
    identifier: string,
    walletType: NonOptional<ResolveOptions>,
    claimPassword: string,
  ): Promise<string> {
    const hash = await this.getUserHash(walletType, identifier);
    return this.generateHashWithPassword(hash, claimPassword);
  }

  private async generateHashWithPassword(
    hash: string,
    claimPassword: string,
  ): Promise<string> {
    return this.idrissSendToAnyoneContract.callMethod({
      method: { name: 'hashIDrissWithPassword', args: [hash, claimPassword] },
    });
  }

  private async callWeb3Vote(
    encodedVote: string,
    asset: AssetLiability,
    roundContractAddress: string,
    transactionOptions: TransactionOptions,
  ): Promise<TransactionReceipt> {
    const nativeToSend =
      asset.type === AssetType.Native
        ? BigNumber.from(asset.amount)
        : BigNumber.from('0');
    const signer = await this.getConnectedAccount();

    await this.approveAssets(
      [asset],
      signer,
      roundContractAddress,
      transactionOptions,
    );

    if (!transactionOptions.gas) {
      try {
        const votingMethod = await this.getVotingMethod({
          encodedVote: encodedVote,
          roundContractAddress: roundContractAddress,
          asset: asset,
        });
        transactionOptions.gas = await votingMethod.estimateGas({
          from: transactionOptions.from ?? signer,
          value: nativeToSend.toString(),
        });
      } catch (error) {
        console.log('Could not estimate gas:', error);
      }
    }

    const sendOptions = {
      ...transactionOptions,
      from: transactionOptions.from ?? signer,
      value: nativeToSend.toString(),
    };

    const votingMethod = await this.getVotingMethod({
      encodedVote: encodedVote,
      roundContractAddress: roundContractAddress,
      asset: asset,
    });

    const transactionReceipt = await votingMethod.send(sendOptions);

    return transactionReceipt;
  }

  private async callWeb3Tipping(
    resolvedAddress: string,
    asset: AssetLiability,
    message: string,
    transactionOptions: TransactionOptions,
  ): Promise<TransactionReceipt> {
    const paymentFee = await this.calculateTippingPaymentFee(
      asset.amount,
      asset.type,
    );

    const polToSend =
      asset.type === AssetType.Native
        ? BigNumber.from(asset.amount)
        : paymentFee;
    const signer = await this.getConnectedAccount();

    await this.approveAssets(
      [asset],
      signer,
      this.contractsAddressess.idrissTipping,
      transactionOptions,
    );

    message = message ?? '';

    if (!transactionOptions.gas) {
      try {
        const tippingMethod = await this.getTippingMethod({
          asset: asset,
          message: message,
          beneficiary: message,
          hash: resolvedAddress,
        });
        transactionOptions.gas = await tippingMethod.estimateGas({
          from: transactionOptions.from ?? signer,
          value: polToSend.toString(),
        });
      } catch (error) {
        console.log('Could not estimate gas:', error);
      }
    }

    const sendOptions = {
      ...transactionOptions,
      from: transactionOptions.from ?? signer,
      value: polToSend.toString(),
    };

    const tippingMethod = await this.getTippingMethod({
      asset: asset,
      message: message,
      beneficiary: message,
      hash: resolvedAddress,
    });

    const transactionReceipt = await tippingMethod.send(sendOptions);

    return transactionReceipt;
  }

  private async getVotingMethod(
    params: VotingParams,
  ): Promise<PreparedTransaction> {
    if (params.asset.type !== AssetType.Native) {
      throw new Error(
        `Expected native asset type, received: ${params.asset.type}`,
      );
    }

    const votingContract = this.web3Provider.createContract(
      ABIS.GitcoinVotingAbi,
      params.roundContractAddress,
    );

    return votingContract.prepareTransaction({
      method: {
        name: 'vote',
        args: [params.encodedVote],
      },
    });
  }

  private async getTippingMethod(
    params: SendToAnyoneParams,
  ): Promise<PreparedTransaction> {
    let method: PreparedTransaction;
    const message = params.message ?? '';

    switch (params.asset.type) {
      case AssetType.Native: {
        method = await this.tippingContract.prepareTransaction({
          method: {
            name: 'sendTo',
            args: [params.hash, params.asset.amount.toString(), message],
          },
        });
        break;
      }
      case AssetType.ERC20: {
        method = await this.tippingContract.prepareTransaction({
          method: {
            name: 'sendTokenTo',
            args: [
              params.hash,
              params.asset.amount.toString(),
              params.asset.assetContractAddress,
              message,
            ],
          },
        });
        break;
      }
      case AssetType.ERC721: {
        method = await this.tippingContract.prepareTransaction({
          method: {
            name: 'sendERC721To',
            args: [
              params.hash,
              params.asset.assetId,
              params.asset.assetContractAddress,
              message,
            ],
          },
        });
        break;
      }
      case AssetType.ERC1155: {
        method = await this.tippingContract.prepareTransaction({
          method: {
            name: 'sendERC1155To',
            args: [
              params.hash,
              params.asset.assetId,
              params.asset.amount.toString(),
              params.asset.assetContractAddress,
              message,
            ],
          },
        });
        break;
      }
    }
    return method;
  }

  private async callWeb3multiTipping(
    params: SendToAnyoneParams[],
    transactionOptions: TransactionOptions,
  ): Promise<TransactionReceipt> {
    let polToSend: BigNumberish = BigNumber.from(0);

    const signer = await this.getConnectedAccount();
    const encodedCalldata = [];

    for (const param of params) {
      const paymentFee = await this.calculateTippingPaymentFee(
        param.asset.amount,
        param.asset.type,
      );
      const properParamAmountToSend =
        param.asset.type === AssetType.Native ? param.asset.amount : paymentFee;

      polToSend = polToSend.add(properParamAmountToSend);

      encodedCalldata.push(await this.encodeTippingToHex(param));
    }

    if (!transactionOptions.gas) {
      try {
        transactionOptions.gas = await this.tippingContract.estimateGas({
          method: { name: 'batch', args: [encodedCalldata] },
          estimateGasOptions: {
            from: transactionOptions.from ?? signer,
            value: polToSend.toString(),
          },
        });
      } catch (error) {
        console.log('Could not estimate gas:', error);
      }
    }

    const transactionReceipt = await this.tippingContract.sendTransaction({
      method: {
        name: 'batch',
        args: [encodedCalldata],
      },
      transactionOptions: {
        ...transactionOptions,
        from: transactionOptions.from ?? signer,
        value: polToSend.toString(),
      },
    });

    delete transactionOptions.gas;

    return transactionReceipt;
  }

  private async approveAssets(
    assets: AssetLiability[],
    signer: string,
    toContract: string,
    transactionOptions: TransactionOptions,
  ) {
    let approvalTransactionReceipt: TransactionReceipt | boolean = false;

    for (const asset of assets) {
      switch (asset.type) {
        case AssetType.ERC20: {
          approvalTransactionReceipt = await this.authorizeERC20ForContract(
            signer,
            toContract,
            asset,
            transactionOptions,
          );

          break;
        }
        case AssetType.ERC721: {
          approvalTransactionReceipt = await this.authorizeERC721ForContract(
            signer,
            toContract,
            asset,
            transactionOptions,
          );

          break;
        }
        case AssetType.ERC1155: {
          approvalTransactionReceipt =
            await this.setAuthorizationForERC1155Contract(
              signer,
              toContract,
              asset,
              true,
              transactionOptions,
            );

          break;
        }
        // No default
      }

      if (
        approvalTransactionReceipt !== true &&
        approvalTransactionReceipt &&
        !approvalTransactionReceipt.status
      ) {
        throw new Error(
          `Setting asset allowance failed for address ${asset.assetContractAddress}. Please check your asset balance.`,
        );
      }
    }

    return approvalTransactionReceipt;
  }

  public async calculateTippingPaymentFee(
    paymentAmount: BigNumberish,
    assetType: AssetType,
  ) {
    if (assetType === AssetType.ERC20) return '0';
    return this.tippingContract.callMethod({
      method: {
        name: 'getPaymentFee',
        args: [paymentAmount, assetType],
      },
    });
  }

  private async authorizeERC20ForContract(
    signer: string,
    contractToAuthorize: string,
    asset: AssetLiability,
    transactionOptions: TransactionOptions = {},
  ): Promise<TransactionReceipt | boolean> {
    const contract = this.web3Provider.createContract(
      ABIS.IERC20Abi,
      asset.assetContractAddress!,
    );

    const allowance = await contract.callMethod({
      method: {
        name: 'allowance',
        args: [signer, contractToAuthorize],
      },
    });

    const allowanceAsBigNumber = BigNumber.isBigNumber(allowance)
      ? allowance
      : BigNumber.from(allowance);

    if (allowanceAsBigNumber.lte(asset.amount)) {
      if (!transactionOptions.gas) {
        try {
          transactionOptions.gas = await contract.estimateGas({
            method: {
              name: 'approve',
              args: [
                contractToAuthorize,
                BigNumber.from(asset.amount).toString(),
              ],
            },
            estimateGasOptions: {
              from: transactionOptions.from ?? signer,
            },
          });
          transactionOptions.gas = BigNumber.isBigNumber(transactionOptions.gas)
            ? transactionOptions.gas.toNumber()
            : transactionOptions.gas;
        } catch (error) {
          console.log('Could not estimate gas:', error);
        }
      }

      const approval = await contract.sendTransaction({
        method: {
          name: 'approve',
          args: [contractToAuthorize, BigNumber.from(asset.amount).toString()],
        },
        transactionOptions: {
          ...transactionOptions,
          from: transactionOptions.from ?? signer,
        },
      });
      delete transactionOptions.gas;
      return approval;
    }

    return true;
  }

  private async authorizeERC721ForContract(
    signer: string,
    contractToAuthorize: string,
    asset: AssetLiability,
    transactionOptions: TransactionOptions,
  ): Promise<TransactionReceipt | boolean> {
    const contract = this.web3Provider.createContract(
      ABIS.IERC721Abi,
      asset.assetContractAddress!,
    );

    const approvedAccount = await contract.callMethod({
      method: {
        name: 'getApproved',
        args: [asset.assetId],
      },
    });

    if (
      `${approvedAccount}`.toLowerCase() !==
      `${contractToAuthorize}`.toLowerCase()
    ) {
      if (!transactionOptions.gas) {
        try {
          transactionOptions.gas = await contract.estimateGas({
            method: {
              name: 'approve',
              args: [contractToAuthorize, asset.assetId],
            },
            estimateGasOptions: {
              from: transactionOptions.from ?? signer,
            },
          });
        } catch (error) {
          console.log('Could not estimate gas:', error);
        }
      }

      const approval = await contract.sendTransaction({
        method: { name: 'approve', args: [contractToAuthorize, asset.assetId] },
        transactionOptions: {
          ...transactionOptions,
          from: transactionOptions.from ?? signer,
        },
      });
      delete transactionOptions.gas;
      return approval;
    }
    return true;
  }

  private async setAuthorizationForERC1155Contract(
    signer: string,
    contractToAuthorize: string,
    asset: AssetLiability,
    authToSet: boolean,
    transactionOptions: TransactionOptions,
  ): Promise<TransactionReceipt | boolean> {
    const contract = this.web3Provider.createContract(
      ABIS.IERC1155Abi,
      asset.assetContractAddress!,
    );

    const isApproved = await contract.callMethod({
      method: {
        name: 'isApprovedForAll',
        args: [signer, contractToAuthorize],
      },
    });

    if (isApproved !== authToSet) {
      if (!transactionOptions.gas) {
        try {
          transactionOptions.gas = await contract.estimateGas({
            method: {
              name: 'setApprovalForAll',
              args: [contractToAuthorize, true],
            },
            estimateGasOptions: {
              from: transactionOptions.from ?? signer,
            },
          });
        } catch (error) {
          console.log('Could not estimate gas:', error);
        }
      }
      // unfortunately ERC1155 standard does not allow granular permissions, and only option is to approve all user tokens
      const approval = await contract.sendTransaction({
        method: {
          name: 'setApprovalForAll',
          args: [contractToAuthorize, true],
        },
        transactionOptions: {
          ...transactionOptions,
          from: transactionOptions.from ?? signer,
        },
      });
      delete transactionOptions.gas;
      return approval;
    }
    return true;
  }

  public async getDollarPriceInWei(): Promise<BigNumberish> {
    const currentPriceData = await this.priceOracleContract.callMethod({
      method: { name: 'latestRoundData', args: [] },
    });
    const priceDecimals = await this.priceOracleContract.callMethod({
      method: { name: 'decimals', args: [] },
    });

    // because the Oracle provides only POL price, we calculate the opposite: dollar price in POL
    const etherInWei = BigNumber.from(10).pow(18);
    const priceDecimalsMul = BigNumber.from(10).pow(priceDecimals);
    return etherInWei.mul(priceDecimalsMul).div(currentPriceData.answer);
  }

  public async reverseResolve(input: string | string[]) {
    const addresses = Array.isArray(input) ? input : [input];
    const resultObject: { [key: string]: string } = Object.fromEntries(
      addresses.map((address) => [address, '']),
    );
    const evmCompatibleAddresses = addresses.filter((address) =>
      this.web3Provider.isAddress(address),
    );

    const results: Array<[string, string]> =
      await this.idrissMultipleRegistryContract.callMethod({
        method: { name: 'getMultipleReverse', args: [evmCompatibleAddresses] },
      });

    if (!Array.isArray(input)) {
      return +results[0][1]
        ? ('@' + (await reverseTwitterID(results[0][1]))).toLowerCase()
        : results[0][1];
    }

    for (const [address, result] of results) {
      if (result) {
        resultObject[address] = (
          '@' + (await reverseTwitterID(result))
        ).toLowerCase();
      } else {
        resultObject[address] = '';
      }
    }

    return resultObject;
  }
}

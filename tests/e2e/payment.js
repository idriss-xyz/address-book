const crypto = require('crypto');
const assert = require('assert');
const hre = require('hardhat');
const HDWalletProvider = require('@truffle/hdwallet-provider');

const { IdrissCrypto } = require('../../lib');
const { AssetType } = require('../../lib/types/assetType');

const IDrissArtifact = require('../artifacts/tests/contracts/src/contracts/mocks/IDrissRegistryMock.sol/IDriss.json');
const IDrissWrapperArtifact = require('../artifacts/tests/contracts/src/contracts/mocks/IDrissWrapperMock.sol/IDrissWrapperContractMock.json');
const MaticPriceAggregatorV3MockArtifact = require('../artifacts/tests/contracts/src/contracts/mocks/MaticPriceAggregatorV3Mock.sol/MaticPriceAggregatorV3Mock.json');
const MockERC1155Artifact = require('../artifacts/tests/contracts/src/contracts/mocks/IDrissRegistryMock.sol/MockERC1155.json');
const MockNFTArtifact = require('../artifacts/tests/contracts/src/contracts/mocks/IDrissRegistryMock.sol/MockNFT.json');
const MockTokenArtifact = require('../artifacts/tests/contracts/src/contracts/mocks/IDrissRegistryMock.sol/MockToken.json');
const TippingArtifact = require('../artifacts/tests/contracts/src/contracts/Tipping.sol/Tipping.json');
const { BigNumber } = require('ethers');

describe('Payments', async () => {
  let url;
  let sendToHashContract;
  let tippingContract;
  let testProvider;
  let idrissContract;
  let idrissCryptoLib;
  let mockTokenContract;
  let mockToken2Contract;
  let mockNFTContract;
  let mockNFT2Contract;
  let mockERC1155Contract;
  let mockERC1155_2Contract;
  let mockPriceOracleContract;
  let mockMultiResolver;
  let ownerAddress;
  let signer1Address;
  let signer2Address;
  let signer3Address;
  let signer4Address;
  let signer1Hash;
  let signer2Hash;
  let signer3Hash;
  let signer4Hash;
  const testWalletType = {
    network: 'evm',
    coin: 'ETH',
    walletTag: 'Metamask ETH',
  };

  const digestMessage = async (message) => {
    return crypto.createHash('sha256').update(message).digest('hex');
  };

  before(async () => {
    url = hre.network.config.url;
    [
      ownerAddress,
      signer1Address,
      signer2Address,
      signer3Address,
      signer4Address,
      signer5Address,
    ] = await web3.eth.getAccounts();

    signer1Hash = await digestMessage(
      'hello@idriss.xyz' +
        '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321',
    );
    signer2Hash = await digestMessage(
      '+16506655942' +
        '92c7f97fb58ddbcb06c0d5a7cb720d74bc3c3aa52a0d706e477562cba68eeb73',
    );
    signer3Hash = await digestMessage(
      '@IDriss_xyz' +
        '4b118a4f0f3f149e641c6c43dd70283fcc07eacaa624efc762aa3843d85b2aba',
    );
    signer4Hash = await digestMessage(
      'deliriusz.eth@gmail.com' +
        'ec72020f224c088671cfd623235b59c239964a95542713390a2b6ba07dd1151c',
    );

    mockPriceOracleContract = await hre.ethers
      .getContractFactoryFromArtifact(MaticPriceAggregatorV3MockArtifact)
      .then((contract) => contract.deploy());
    idrissContract = await hre.ethers
      .getContractFactoryFromArtifact(IDrissArtifact)
      .then((contract) => contract.deploy());

    await Promise.all([
      mockPriceOracleContract.deployed(),
      idrissContract.deployed(),
    ]);

    mockMultiResolver = await hre.ethers
      .getContractFactoryFromArtifact(IDrissWrapperArtifact)
      .then((contract) => contract.deploy(idrissContract.address));
    tippingContract = await hre.ethers
      .getContractFactoryFromArtifact(TippingArtifact)
      .then((contract) => contract.deploy(mockPriceOracleContract.address));
    mockERC1155Contract = await hre.ethers
      .getContractFactoryFromArtifact(MockERC1155Artifact)
      .then((contract) => contract.deploy());
    mockERC1155_2Contract = await hre.ethers
      .getContractFactoryFromArtifact(MockERC1155Artifact)
      .then((contract) => contract.deploy());
    mockNFTContract = await hre.ethers
      .getContractFactoryFromArtifact(MockNFTArtifact)
      .then((contract) => contract.deploy());
    mockNFT2Contract = await hre.ethers
      .getContractFactoryFromArtifact(MockNFTArtifact)
      .then((contract) => contract.deploy());
    mockTokenContract = await hre.ethers
      .getContractFactoryFromArtifact(MockTokenArtifact)
      .then((contract) => contract.deploy());
    mockToken2Contract = await hre.ethers
      .getContractFactoryFromArtifact(MockTokenArtifact)
      .then((contract) => contract.deploy());

    await Promise.all([
      mockMultiResolver.deployed(),
      tippingContract.deployed(),
      mockERC1155Contract.deployed(),
      mockERC1155_2Contract.deployed(),
      mockNFTContract.deployed(),
      mockNFT2Contract.deployed(),
      mockTokenContract.deployed(),
      mockToken2Contract.deployed(),
    ]);

    testProvider = new HDWalletProvider({
      mnemonic: {
        phrase: hre.config.networks.hardhat_node.accounts.mnemonic,
      },
      providerOrUrl: url,
    });

    idrissCryptoLib = new IdrissCrypto(url, {
      web3Provider: testProvider,
      providerType: 'web3',
      tippingContractAddress: tippingContract.address,
      idrissRegistryContractAddress: idrissContract.address,
      priceOracleContractAddress: mockPriceOracleContract.address,
      idrissMultipleRegistryContractAddress: mockMultiResolver.address,
    });

    await idrissContract.functions.addIDriss(signer1Hash, signer1Address);
    await idrissContract.functions.addIDriss(signer2Hash, signer2Address);
    await idrissContract.functions.addIDriss(signer3Hash, signer3Address);
    await idrissContract.functions.addIDriss(signer4Hash, signer4Address);
    await mockERC1155Contract.functions
      .mint(ownerAddress, 0, 1)
      .catch((_) => {});
    await mockERC1155Contract.functions
      .mint(ownerAddress, 1, 1)
      .catch((_) => {});
    await mockERC1155Contract.functions
      .mint(ownerAddress, 2, 10)
      .catch((_) => {});
    await mockERC1155Contract.functions
      .mint(ownerAddress, 3, 90)
      .catch((_) => {});
    await mockERC1155Contract.functions
      .mint(ownerAddress, 4, 500)
      .catch((_) => {});
    await mockERC1155_2Contract.functions
      .mint(ownerAddress, 0, 1)
      .catch((_) => {});
    await mockERC1155_2Contract.functions
      .mint(ownerAddress, 1, 1_000_000)
      .catch((_) => {});
    await mockNFTContract.functions.safeMint(ownerAddress, 0).catch((e) => {
      console.log(e);
    });
    await mockNFTContract.functions.safeMint(ownerAddress, 1).catch((e) => {
      console.log(e);
    });
    await mockNFTContract.functions.safeMint(ownerAddress, 2).catch((e) => {
      console.log(e);
    });
    await mockNFTContract.functions.safeMint(ownerAddress, 3).catch((e) => {
      console.log(e);
    });
    await mockNFTContract.functions.safeMint(ownerAddress, 10).catch((e) => {
      console.log(e);
    });
    await mockNFTContract.functions.safeMint(ownerAddress, 11).catch((e) => {
      console.log(e);
    });
    await mockNFTContract.functions.safeMint(ownerAddress, 12).catch((e) => {
      console.log(e);
    });
    await mockToken2Contract.functions.transfer(
      signer4Address,
      (await mockToken2Contract.functions.totalSupply()).toString(),
    );
    await mockNFT2Contract.functions.safeMint(signer4Address, 1).catch((e) => {
      console.log(e);
    });
  });

  describe('Price feed', () => {
    it('is able to retrieve a price feed', async () => {
      const result = await idrissCryptoLib.getDollarPriceInWei();
      assert(result > 0);
    });
  });

  describe('Send to existing hash', () => {
    it('is able to send coins to existing IDriss', async () => {
      const payerBalanceBefore = await web3.eth.getBalance(ownerAddress);
      const payerBalanceBeforeAsBigNumber = BigNumber.from(payerBalanceBefore);

      const recipientBalanceBefore = await web3.eth.getBalance(signer1Address);
      const recipientBalanceBeforeAsBigNumber = BigNumber.from(
        recipientBalanceBefore,
      );

      const amount = '10000000000000000000';

      const result = await idrissCryptoLib.transferToIDriss(
        'hello@idriss.xyz',
        testWalletType,
        {
          amount: amount,
          type: AssetType.Native,
        },
      );

      const weiUsed = BigNumber.from(result.gasUsed).mul(
        result.effectiveGasPrice,
      );
      const recipientBalanceAfter = await web3.eth.getBalance(signer1Address);
      const recipientBalanceAfterAsBigNumber = BigNumber.from(
        recipientBalanceAfter,
      );

      const payerBalanceAfter = await web3.eth.getBalance(ownerAddress);

      assert(result.status);
      assert.equal(
        recipientBalanceAfterAsBigNumber
          .sub(recipientBalanceBeforeAsBigNumber)
          .toString(),
        BigNumber.from(amount).sub(BigNumber.from(amount).div(100)).toString(),
      );
      assert.equal(
        payerBalanceBeforeAsBigNumber
          .sub(BigNumber.from(payerBalanceAfter))
          .sub(weiUsed)
          .toString(),
        amount,
      ); //1% fee
    });

    it('is able to multisend coins to existing IDriss', async () => {
      const recipientBalanceBefore = await web3.eth.getBalance(signer1Address);
      const payerBalanceBefore = await web3.eth.getBalance(ownerAddress);
      const balance1 = BigNumber.from('10000000000000000000');
      const balance2 = BigNumber.from('35000');

      const result = await idrissCryptoLib.multitransferToIDriss([
        {
          beneficiary: 'hello@idriss.xyz',
          walletType: testWalletType,
          asset: {
            amount: balance1,
            type: AssetType.Native,
          },
        },
        {
          beneficiary: 'hello@idriss.xyz',
          walletType: testWalletType,
          asset: {
            amount: balance2,
            type: AssetType.Native,
          },
        },
      ]);

      const weiUsed = BigNumber.from(result.gasUsed).mul(
        result.effectiveGasPrice,
      );
      const recipientBalanceAfter = await web3.eth.getBalance(signer1Address);
      const payerBalanceAfter = await web3.eth.getBalance(ownerAddress);

      assert(result.status);

      assert.equal(
        BigNumber.from(payerBalanceBefore)
          .sub(BigNumber.from(payerBalanceAfter))
          .sub(weiUsed)
          .toString(),
        balance1.add(balance2).toString(),
      ); //1% fee

      assert.equal(
        BigNumber.from(recipientBalanceAfter)
          .sub(BigNumber.from(recipientBalanceBefore))
          .toString(),
        balance1.add(balance2).sub(balance1.add(balance2).div(100)).toString(),
      );
    });

    it('is able to send ERC20 to existing IDriss', async () => {
      const balanceBefore =
        await mockTokenContract.functions.balanceOf(signer2Address);

      const result = await idrissCryptoLib.transferToIDriss(
        '+16506655942',
        { ...testWalletType, walletTag: 'Coinbase ETH' },
        {
          amount: 1000,
          type: AssetType.ERC20,
          assetContractAddress: mockTokenContract.address,
        },
      );

      const balanceAfter =
        await mockTokenContract.functions.balanceOf(signer2Address);

      assert(result.status);
      assert.equal(balanceAfter - balanceBefore, 990); //1% fee
    });

    //TODO: check getting the same IDriss from the registry twice
    it('is able to multisend ERC20 to existing IDriss', async () => {
      const balanceBefore =
        await mockTokenContract.functions.balanceOf(signer1Address);
      const balanceBefore2 =
        await mockTokenContract.functions.balanceOf(signer2Address);

      const result = await idrissCryptoLib.multitransferToIDriss([
        {
          beneficiary: 'hello@idriss.xyz',
          walletType: testWalletType,
          asset: {
            amount: 500,
            type: AssetType.ERC20,
            assetContractAddress: mockTokenContract.address,
          },
        },
        {
          beneficiary: '+16506655942',
          walletType: { ...testWalletType, walletTag: 'Coinbase ETH' },
          asset: {
            amount: 1000,
            type: AssetType.ERC20,
            assetContractAddress: mockTokenContract.address,
          },
        },
      ]);

      const balanceAfter =
        await mockTokenContract.functions.balanceOf(signer1Address);
      const balanceAfter2 =
        await mockTokenContract.functions.balanceOf(signer2Address);

      assert(result.status);

      assert(result.status);
      assert.equal(balanceAfter - balanceBefore, 495); //1% fee
      assert.equal(balanceAfter2 - balanceBefore2, 990); //1% fee
    });

    it('is able to send ERC721 to existing IDriss', async () => {
      const testNFTid = 0;
      const ownerBefore = await mockNFTContract.functions.ownerOf(testNFTid);

      const result = await idrissCryptoLib.transferToIDriss(
        'hello@idriss.xyz',
        testWalletType,
        {
          amount: 1,
          type: AssetType.ERC721,
          assetContractAddress: mockNFTContract.address,
          assetId: 0,
        },
      );

      const ownerAfter = await mockNFTContract.functions.ownerOf(testNFTid);

      assert(result.status);
      assert.equal(ownerBefore, ownerAddress);
      assert.equal(ownerAfter, signer1Address);
    });

    it('is able to multisend ERC721 to existing IDriss', async () => {
      const testNFTid = 1;
      const testNFTid2 = 2;
      const ownerBefore = await mockNFTContract.functions.ownerOf(testNFTid);
      const ownerBefore2 = await mockNFTContract.functions.ownerOf(testNFTid2);

      const result = await idrissCryptoLib.multitransferToIDriss([
        {
          beneficiary: 'hello@idriss.xyz',
          walletType: testWalletType,
          asset: {
            amount: 1,
            type: AssetType.ERC721,
            assetContractAddress: mockNFTContract.address,
            assetId: 1,
          },
        },
        {
          beneficiary: '+16506655942',
          walletType: { ...testWalletType, walletTag: 'Coinbase ETH' },
          asset: {
            amount: 1,
            type: AssetType.ERC721,
            assetContractAddress: mockNFTContract.address,
            assetId: 2,
          },
        },
      ]);

      const ownerAfter = await mockNFTContract.functions.ownerOf(testNFTid);
      const ownerAfter2 = await mockNFTContract.functions.ownerOf(testNFTid2);

      assert(result.status);
      assert.equal(ownerBefore, ownerAddress);
      assert.equal(ownerAfter, signer1Address);
      assert.equal(ownerBefore2, ownerAddress);
      assert.equal(ownerAfter2, signer2Address);
    });

    it('is able to send ERC1155 to existing IDriss', async () => {
      const testERC1155id = 0;
      const ownerBalanceBefore = await mockERC1155Contract.functions.balanceOf(
        ownerAddress,
        testERC1155id,
      );
      const signer1BalanceBefore =
        await mockERC1155Contract.functions.balanceOf(
          signer1Address,
          testERC1155id,
        );

      const result = await idrissCryptoLib.transferToIDriss(
        'hello@idriss.xyz',
        testWalletType,
        {
          amount: 1,
          type: AssetType.ERC1155,
          assetContractAddress: mockERC1155Contract.address,
          assetId: 0,
        },
      );

      const ownerBalanceAfter = await mockERC1155Contract.functions.balanceOf(
        ownerAddress,
        testERC1155id,
      );
      const signer1BalanceAfter = await mockERC1155Contract.functions.balanceOf(
        signer1Address,
        testERC1155id,
      );

      assert(result.status);
      assert.equal(ownerBalanceBefore, 1);
      assert.equal(ownerBalanceAfter, 0);
      assert.equal(signer1BalanceBefore, 0);
      assert.equal(signer1BalanceAfter, 1);
    });

    it('is able to multisend ERC1155 to existing IDriss', async () => {
      const testERC1155id = 1;
      const testERC1155id2 = 2;
      const ownerBalanceBefore = await mockERC1155Contract.functions.balanceOf(
        ownerAddress,
        testERC1155id,
      );
      const signer1BalanceBefore =
        await mockERC1155Contract.functions.balanceOf(
          signer1Address,
          testERC1155id,
        );
      const ownerBalanceBefore2 = await mockERC1155Contract.functions.balanceOf(
        ownerAddress,
        testERC1155id2,
      );
      const signer2BalanceBefore =
        await mockERC1155Contract.functions.balanceOf(
          signer2Address,
          testERC1155id2,
        );

      const result = await idrissCryptoLib.multitransferToIDriss([
        {
          beneficiary: 'hello@idriss.xyz',
          walletType: testWalletType,
          asset: {
            amount: 1,
            type: AssetType.ERC1155,
            assetContractAddress: mockERC1155Contract.address,
            assetId: testERC1155id,
          },
        },
        {
          beneficiary: '+16506655942',
          walletType: { ...testWalletType, walletTag: 'Coinbase ETH' },
          asset: {
            amount: 5,
            type: AssetType.ERC1155,
            assetContractAddress: mockERC1155Contract.address,
            assetId: testERC1155id2,
          },
        },
      ]);

      const ownerBalanceAfter = await mockERC1155Contract.functions.balanceOf(
        ownerAddress,
        testERC1155id,
      );
      const signer1BalanceAfter = await mockERC1155Contract.functions.balanceOf(
        signer1Address,
        testERC1155id,
      );
      const ownerBalanceAfter2 = await mockERC1155Contract.functions.balanceOf(
        ownerAddress,
        testERC1155id2,
      );
      const signer2BalanceAfter = await mockERC1155Contract.functions.balanceOf(
        signer2Address,
        testERC1155id2,
      );

      assert(result.status);
      assert.equal(ownerBalanceBefore, 1);
      assert.equal(ownerBalanceBefore2, 10);
      assert.equal(ownerBalanceAfter, 0);
      assert.equal(ownerBalanceAfter2, 5);
      assert.equal(signer1BalanceBefore, 0);
      assert.equal(signer1BalanceAfter, 1);
      assert.equal(signer2BalanceBefore, 0);
      assert.equal(signer2BalanceAfter, 5);
    });
  });

  describe('Send to IDriss hash and wallet address', () => {
    // Proof of concept test
    it('is able to multisend coins to existing IDriss and wallet address', async () => {
      const recipient1BalanceBefore = await web3.eth.getBalance(signer1Address);
      const recipient2BalanceBefore = await web3.eth.getBalance(signer2Address);
      const payerBalanceBefore = await web3.eth.getBalance(ownerAddress);
      const amountToSend = BigNumber.from('10000000000000000000');
      const amountToSend2 = BigNumber.from('35000');

      // TODO: for some reason sometimes it gives warning BigNumber.toString does not accept any parameters; base-10 is assumed
      const result = await idrissCryptoLib.multitransferToIDriss([
        {
          beneficiary: signer2Address,
          walletType: testWalletType,
          asset: {
            amount: amountToSend,
            type: AssetType.Native,
          },
        },
        {
          beneficiary: 'hello@idriss.xyz',
          walletType: testWalletType,
          asset: {
            amount: amountToSend2,
            type: AssetType.Native,
          },
        },
      ]);

      const weiUsed = BigNumber.from(result.gasUsed).mul(
        result.effectiveGasPrice,
      );
      const recipient1BalanceAfter = await web3.eth.getBalance(signer1Address);
      const recipient2BalanceAfter = await web3.eth.getBalance(signer2Address);
      const payerBalanceAfter = await web3.eth.getBalance(ownerAddress);

      assert(result.status);

      assert.equal(
        BigNumber.from(payerBalanceBefore)
          .sub(BigNumber.from(payerBalanceAfter))
          .sub(weiUsed)
          .toString(),
        amountToSend.add(amountToSend2).toString(),
      );

      //1% fee
      assert.equal(
        BigNumber.from(recipient1BalanceAfter)
          .add(BigNumber.from(recipient2BalanceAfter))
          .sub(BigNumber.from(recipient1BalanceBefore))
          .sub(BigNumber.from(recipient2BalanceBefore))
          .toString(),
        amountToSend
          .add(amountToSend2)
          .sub(amountToSend.add(amountToSend2).div(100))
          .toString(),
      );
    });
  });

  describe('Send to wallet address', () => {
    it('is able to send coins to wallet address', async () => {
      const recipientBalanceBefore = await web3.eth.getBalance(signer1Address);
      const payerBalanceBefore = await web3.eth.getBalance(ownerAddress);
      const amount = '10000000000000000000';

      const result = await idrissCryptoLib.transferToIDriss(
        signer1Address,
        testWalletType,
        {
          amount: amount,
          type: AssetType.Native,
        },
      );

      const weiUsed = BigNumber.from(result.gasUsed).mul(
        result.effectiveGasPrice,
      );
      const recipientBalanceAfter = await web3.eth.getBalance(signer1Address);
      const payerBalanceAfter = await web3.eth.getBalance(ownerAddress);

      assert(result.status);
      assert.equal(
        BigNumber.from(recipientBalanceAfter)
          .sub(BigNumber.from(recipientBalanceBefore))
          .toString(),
        BigNumber.from(amount).sub(BigNumber.from(amount).div(100)).toString(),
      );
      assert.equal(
        BigNumber.from(payerBalanceBefore)
          .sub(BigNumber.from(payerBalanceAfter))
          .sub(weiUsed)
          .toString(),
        amount,
      ); //1% fee
    });
  });
});

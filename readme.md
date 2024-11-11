# Integrate IDriss Into Your Project

<p align="center">
<img alt="Let's Integrate!" src="img/integrate_idriss.png"/>
</p>

This is a node.js and webpack library for integrating [IDriss](https://www.idriss.xyz/) into your project.

IDriss builds tools making web3 more usable for everyone 🤝

## Content

This library lets you integrate 3 independent functions from two products:

**IDriss Book** - decentralized mapping of emails, phone numbers and Twitter usernames to wallet addresses
1. [Resolving](#1-resolving)
2. [Reverse resolving](#2-reverse-resolving)

**IDriss Send** - mass web3 onboarding & asset distribution tool

3. [Sending crypto & NFTs to emails, phone numbers, and Twitter usernames](#3-sending-crypto--nfts-to-emails-phone-numbers-and-twitter-usernames)

## Benefits

- Improving UX by letting use familiar web2 identifiers in search bars and input fields
- Augmenting UI by replacing wallet addresses with human-readable names
- Scaling your app beyond a crypto-native userbase

## Cloning This Lib
```
git clone --recurse-submodules https://github.com/idriss-xyz/contracts.git
```

## Sample Usage and Quick Setup


```javascript
import {IdrissCrypto} from "@idriss-xyz/address-book";

const idriss = new IdrissCrypto();
const resultEmail = await idriss.resolve("hello@idriss.xyz");
console.log(resultEmail);
```

Yields this sample output:

```json
{
    "Coinbase BTC": "bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh",
    "Metamask ETH": "0x11E9F9344A9720d2B2B5F0753225bb805161139B"
}
```

The same is possible with Twitter usernames:

```javascript
    const resultTwitter = await idriss.resolve("@idriss_xyz");
    console.log(resultTwitter);
```
Resolves to: 
```json
{
    "Metamask ETH": "0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9",
    "Coinbase ETH": "0x995945Fb74e0f8e345b3f35472c3e07202Eb38Ac",
    "Argent ETH": "0x4B994A4b85378906B3FE9C5292C749f79c9aD661",
    "Tally ETH": "0xa1ce10d433bb841cefd82a43f10b6b597538fa1d",
    "Trust ETH": "0xE297b1E893e7F8849413D8ee7407DB343979A449",
    "Rainbow ETH": "0xe10A2331Ac5498e7544579167755d6a756786a9F"
}
```

And phone numbers:

```javascript
    const resultPhone = await idriss.resolve("+16506655942");
    console.log(resultPhone);
```
Resolves to: 
```javascript
{
    'Binance BTC': '1FdqxZsS6HVEs1NaQUdkoQWKYA9R9yfhdz',
    'Essentials ELA': 'EL4bLnZALyJKkoEf99qjZMrKVresHU76JU',
    'Phantom SOL': '6GmzRK2qLhBPK2WwYM14EGnxh95jBTsJGXMgFyM3VeVk'
}
```
# How to Load This Library?
## Webpage with webpack
```bash
npm install @idriss-xyz/address-book
#or
yarn add @idriss-xyz/address-book
```

And in code:

```javascript
import {IdrissCrypto} from "@idriss-xyz/address-book/browser";
```
## Webpage without webpack
If you prefer using ES6 modules, you can import the library with
```js
import {IdrissCrypto} from "https://unpkg.com/@idriss-xyz/address-book/lib/bundle/modules.js"
```

Alternatively, you can simply load it as a js file in your HTML environment using this <script> tag:

```html
<script src="https://unpkg.com/@idriss-xyz/address-book/lib/bundle/global.js"></script>
```
then the objects are available as global variables under IdrissCrypto, for example
```js
let idriss = new IdrissCrypto.IdrissCrypto();
idriss.resolve(...)
```
## node.js
From cli:
```bash
npm install @idriss-xyz/address-book
#or
yarn add @idriss-xyz/address-book
```

And in code:

```javascript
//for nodejs using ES6 modules
import {IdrissCrypto} from "@idriss-xyz/address-book";

//for nodejs using commonJS
const {IdrissCrypto} = require("@idriss-xyz/address-book");
```

The library is designed both for es6 and cjs.

# Functions
## 1. Resolving

### Resolve emails, phone numbers, and Twitter usernames to wallet addresses.

*Class IdrissCrypto*

#### constructor
```typescript
type ResolveOptions = {
  coin?: string|null,
  network?: string|null,
}

constructor(polygonEndpoint: string = "https://polygon-rpc.com/")
```
Params:
* polygonEndpoint (string) - uri to connect with blockchain. If no endpoint is provided, the default is https://polygon-rpc.com/.

#### resolve
Use IDriss resolver:
```typescript
public async resolve(input: string, options:ResolveOptions = {}): Promise<{ [index: string]: string }>
```
And in code:
```javascript
const idriss = new IdrissCrypto();

const resultEmail = await idriss.resolve("hello@idriss.xyz");

console.log(resultEmail);
```

This yields this sample output:

```json
{
    "Coinbase BTC": "bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh",
    "Metamask ETH": "0x11E9F9344A9720d2B2B5F0753225bb805161139B"
}
```

Converts input string (e-mail address, phone number or Twitter handle) to wallets addresses. This method connects to IDriss' API server (only if translation of Twitter usernames to Twitter IDs necessary) and then to the endpoint defined in the constructor.

Params:
* input (string) - e-mail address, phone number (starting with (+) country code) or Twitter handle (starting with "@") together with optional secret word (only for email and phone number)
* options (ResolveOptions object) - optional parameters
    * coin (string) - for example "ETH"
        * currently supported coins: ETH, BNB, USDT, USDC, ELA, MATIC, BTC, SOL and one ERC20 wildcard
    * network (string) - for example "evm"
        * currently supported network types: evm (for evm compatible addresses across different networks), btc and sol
    * currently, this library is supporting the following combinations:
        * network: evm
            * coin: ETH, BNB, USDT, USDC, ELA, MATIC, ERC20
        * network: btc
            * coin: BTC, ELA
        * network: sol
            * coin: SOL
* supported networks and coins will be updated on a regular basis and are based on community initiatives. Any  wishes regarding supported combinations? Please join our [Discord](https://discord.gg/RJhJKamjw5) and let us know.

Returns:
Promise, that resolves to dictionary (object), in which keys are wallet tags, and values are these addresses (see example). In case nothing was found, promise will resolve to empty object. If unknown network or coin (or combination) was provided, error returns. Example: "message": "Network not found." If no option is provided, all possible combinations are resolved.

An example implementation in the user interface of a wallet:

<p style="text-align: center">
<img alt="UI Implementation Example" src="img/resolving_idriss.png"/>
</p>

## 2. Reverse Resolving

### Display emails, phone numbers, and Twitter usernames instead of wallet addresses.

Use reverseResolve:

```typescript
public async reverseResolve(input: string): Promise<string>
```
And in code:

```typescript

const obj = new IdrissCrypto()

const reverse = await obj.reverseResolve("0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9")

console.log(reverse)

```
This resolves to: 
```javascript
"@idriss_xyz"
```

You can also call the smart contact directly:

```typescript
async function loadContractReverse(web3) {
    return await new web3.eth.Contract([{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"reverseIDriss","outputs":   [{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}],
        "0x561f1b5145897A52A6E94E4dDD4a29Ea5dFF6f64"
    );
}

let reverseContract = await loadContractReverse(defaultWeb3);
reverse = await reverseContract.methods.reverseIDriss(address).call();
```

*Note: Calling the contract directly provides resolution to Twitter IDs. The IDs still must be translated to usernames using Twitter's API. Our library takes care of this translation automatically.*

An example of implementation in the user interface:

<p align="center">
<img alt="UI Implementation Example" src="img/reverse_resolving.png"/>
</p>

## 3. Sending crypto & NFTs to emails, phone numbers, and Twitter usernames

**Use transferToIDriss**

```typescript
public async transferToIDriss (
    beneficiary: string,
    walletType: Required<ResolveOptions>,
    asset: AssetLiability
): Promise<TransactionReceipt>
```
And in code:

```typescript

const idriss = new IdrissCrypto()

const transactionReceipt = await idriss.transferToIDriss(
    "hello@idriss.xyz",
    {
        network: "evm",
        coin: "MATIC",
        walletTag: "Metamask ETH"
    },
    {
        type: AssetType.ERC20,
        amount: 150,
        assetContractAddress: "0x995945Fb74e0f8e345b3f35472c3e07202Eb38Ac"
    })

console.log(transactionReceipt)

```
This resolves to SendToHashTransactionReceipt object, which gives info about the transaction that was performed.

**Use multitransferToIDriss**

```typescript
public async multitransferToIDriss(
    sendParams: SendToAnyoneParams[],
    transactionOptions: TransactionOptions = {}
):Promise<MultiSendToHashTransactionReceipt | TransactionReceipt>
```
And in code:

```typescript

const obj = new IdrissCrypto()

const transactionReceipt = await obj.multitransferToIDriss([
                {
                    beneficiary: testMail,
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend,
                        type: AssetType.ERC721,
                        assetContractAddress: mockNFTContract.address,
                        assetId: 11
                    }
                },
                {
                    beneficiary: testMail2,
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend,
                        type: AssetType.ERC721,
                        assetContractAddress: mockNFTContract.address,
                        assetId: 12
                    }
                },
            ])

console.log(transactionReceipt)

```
This resolves to MultiSendToHashTransactionReceipt object, which gives info about the transaction that was performed. 

## Testing
In order to run tests, please execute following commands:
```
yarn compileWeb3
yarn hardhat node
yarn testE2e
```

## Working Examples


* For functions (1) and (2), check our [browser extension](https://github.com/idriss-xyz/core).

## License

This project is licensed under [GPLv3](https://github.com/idriss-xyz/address-book/blob/master/LICENSE).

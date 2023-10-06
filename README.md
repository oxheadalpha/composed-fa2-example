# Content

This is an example project to demonstrate usage of the
[@oxheadalpha/fa2-contracts](https://github.com/oxheadalpha/nft-tutorial/blob/master/packages/fa2-contracts/README.md)
package, a library and a tool to generate modular Tezos FA2 contracts and
TypeScript interfaces.

## Table of Contents

* [Initial Setup](#initial-setup)
* [Custom FA2 Contract](#custom-fa2-contract)
  * [Generate Base Fungible Token FA2 Contract](#generate-base-fungible-token-fa2-contract)
  * [Extend Base LIGO Contract](#extend-base-ligo-contract)
  * [Customize Contract Origination](#customize-contract-origination)
  * [Define TypeScript API to Access Custom Entry Points](#define-typescript-api-to-access-custom-entry-points)

## Initial Setup

Once we have created a TypeScript project, we need to add a development
dependency on `@oxheadalpha/fa2-contracts` package and dependency on
`@oxheadalpha/fa2-interfaces` package.

```sh
$ yarn add -D @oxheadalpha/fa2-contracts
...
$ yarn add @oxheadalpha/fa2-interfaces
```

## Custom FA2 Contract

As an example, we are going to implement a single fungible token FA2 contract
where the FA2 token can be exchanged for Tez. Any address can invoke the `mint`
contract entry point and transfer some Tez to exchange for the FA2 token. Any
FA2 token owner can also exchange FA2 tokens for Tez by calling the `burn`
contract entry point. The exchange rate is always one Mutez per one FA2 token.
In addition, the contract collects a flat exchange fee that can be set by the
contract admin. The contract admin can change the exchange fee and withdraw
collected fees. The contract admin can pause and unpause the contract. If the
contract is paused, token owners cannot transfer, mint and burn tokens.

First, we will generate the LIGO code and TypeScript API for the base fungible
token contract using `tzGen` tool from the `@oxheadalpha/fa2-contracts` package.
Then, we will extend the contract code with the custom `mint`, `burn` and the
admin entry points. Finally, we will extend generated TypeScript API with the new
entry points' methods and storage origination function.

### Generate Base Fungible Token FA2 Contract

Import LIGO library sources from `@oxheadalpha/fa2-contracts` package with the
`yarn tzGen import-ligo` command. We are using the default destination directory
for the LIGO code `./ligo`.

```sh
$ yarn tzgen import-ligo
importing LIGO sources from ~/composed-fa2-example/node_modules/@oxheadalpha/fa2-contracts/ligo to ~/composed-fa2-example/ligo
LIGO sources imported to ~/composed-fa2-example/ligo
```

Initialize `tzGen` tool environment. We are using the default settings for LIGO
source code directory (`./ligo`) and TypeScript source code directory (`./src`).
For the contract compilation output we specify `.\dist` directory.

```sh
$ yarn tzgen init --compile-out ./dist
~/composed-fa2-example/tzgen.json config file created
```

Generate base FA2 contract specification: single fungible token (FT) and simple
pausable admin. We do not specify any standard minting functionality since we
are going to extend the base contract with the custom implementation.

```sh
$ yarn tzgen spec my_contract.json --kind FT --admin PAUSABLE
~/composed-fa2-example/my_contract.json spec file created
```

Generate base contract LIGO source code

```sh
$ yarn tzgen contract my_contract.json base_ft_contract.mligo
~/composed-fa2-example/ligo/src/base_ft_contract.mligo is generated
```

Generate TypeScript API for the base contract.

```sh
$ yarn tzgen type-script my_contract.json base_ft_contract.ts
~/composed-fa2-example/src/base_ft_contract.ts is generated
```

The generated contract already has the standard FA2 functionality: token
transfer, operators etc. On the next step we are going to extend it with the
custom mint and burn implementation, and exchange admin entry points to
change the fee and withdraw collected fees.

### Extend Base LIGO Contract

First we need to define LIGO types for the custom contract storage and the main
entry point. In the [./ligo/src](./ligo/src) directory we create a new contract
file [tzfa2_contract.mligo](./ligo/src/tzfa2_contract.mligo) and include the
generated [base_ft_contract.mligo](./ligo/src/base_ft_contract.mligo). Then we
define a new storage type as a record combining `asset_storage` from the
generated contract and the exchange fee related fields:

```ocaml
#include "base_ft_contract.mligo"

type tzfa2_storage = {
  asset : asset_storage;
  fee : tez;
  collected_fees: tez;
}
```

Define the custom entry points type:

```ocaml
type change_fee_param = {
  old_fee : tez;
  new_fee : tez;
}

type tzfa2_entrypoints =
  | Mint of tez (* param is expected exchange fee *)
  | Burn of nat (* param is the number of tokens to burn *)
  | Change_fee of change_fee_param
  | Withdraw_fees (* the admin withdraws collected fees *)
```

Define a new main entry point function and dispatch the calls to handler functions:

```ocaml
let custom_entrypoints (param, storage : tzfa2_entrypoints * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  (* will add custom entry points handlers later *)
  ([] : operation list), storage

module TzFa2 = struct

  [@entry]
  let asset (param : Asset.entrypoints) (storage : tzfa2_storage)
      : (operation list) * tzfa2_storage =
    (* dispatch call to the generated contract main function implementation *)
    let ops, new_asset = Asset.main (param, storage.asset) in
    let new_s = { storage with asset = new_asset } in
    (ops, new_s)

  [@entry]
  let tzfa2 (param : tzfa2_entrypoints) (storage : tzfa2_storage)
      : (operation list) * tzfa2_storage =
    custom_entrypoints (param, storage)

end
```

To test that our contract code compiles, we can add a build script based on
`tzGen` to the `package.json` file:

```json
"build:contract": "yarn tzgen michelson tzfa2_contract tzfa2_contract --main TzFa2"
```

Now we can run the following command

```sh
$ yarn build:contract
```

any time we made changes to the contract code.

The next step is to implement handlers for the custom entry points. The final
implementation of custom entry points can be found in
[tzfa2_contract.mligo](./ligo/src/tzfa2_contract.mligo). The implementation uses
the `fail_if_not_admin` guard for the custom admin entry points, and
`fail_if_paused` and `fail_if_not_minter` guards for the `mint` and `burn` entry
points, Those guards are part of the public admin and minter admin modules API
(see
[LIGO modules](https://github.com/oxheadalpha/nft-tutorial/blob/master/packages/fa2-contracts/README.md#cameligo-modules)
description in `@oxheadalpha/fa2-contracts` package for more details). If we
decide to change the specification for the contract admin and/or minter admin and
regenerate the base FA2 contract, we do not need to change our custom extension
code, since the public modules API will remain the same.

### Customize Contract Origination

On previous steps we have generated the TypeScript
[createStorage()](./src/base_ft_contract.ts) function. The function accepts a
parameter object with three fields:

* `metadata` - a string representing the contract TZIP-16 metadata
* `owner` - the address of the contract owner/admin
* `token` - token metadata

The custom contract extension defines two extra fields: `fee` and `collected-fees`
that need to be initialized.

```ocaml
type tzfa2_storage = {
  asset : asset_storage;
  fee : tez;
  collected_fees: tez;
}
```

The `collected_fees` should be 0 mutez during the contract origination and we
would need an extra parameter specifying the initial fee. Based on the generated
`createStorage()` function, we can define the
[createCustomStorage()](./src/origination.ts) function like this:

```typescript
export const createCustomStorage = (
  metadata: string,
  owner: address,
  token: TokenMetadataInternal,
  fee: mutez //fee is a part of the custom storage extension
) => {
  const baseStorage = createStorage({
    metadata,
    owner,
    token
  });
  return { asset: baseStorage, fee, collected_fees: 0 };
};
```

### Define TypeScript API to Access Custom Entry Points

We have defined the following custom entry points:

* `change_fee` - the admin can change the exchange fee.
* `withdraw_fees` - the admin can withdraw collected fees.
* `mint` - any token owner can mint some FA2 tokens in exchange for transferred
  tez.
* `burn` - any token owner can exchange his FA2 tokens for tez.

We are going to split those entry points into two different TypeScript interfaces:
`ExchangeAdminContract` and `MinterContract`. Each entry point is represented by
the interface method that returns `ContractMethod<ContractProvider>`. The
underlying implementation will invoke Taquito's contract method and can be mixed
with other contract method calls.

```typescript
export interface ExchangeAdminContract {
  withdrawFees: () => ContractMethod<ContractProvider>;
  changeFee: (
    old_fee: mutez,
    new_fee: mutez
  ) => ContractMethod<ContractProvider>;
}

export interface MinterContract {
  mint: (expected_fee: mutez) => ContractMethod<ContractProvider>;
  burn: (ntokens: nat) => ContractMethod<ContractProvider>;
}
```

In the next step we are going to implement two constructor functions:
`ExchangeAdmin` and `Minter`. The actual implementation can be found
[here](./src/contract_interface.ts).
[See](https://github.com/oxheadalpha/nft-tutorial/tree/master/packages/fa2-interfaces#custom-contracts)
for more details.

Now we can use newly-defined API like this:

```typescript
const ownerApi = (
  await tezosApi(toolkit).at(contractAddress)
).with(Minter);

await runMethod(ownerApi.mint(1000000), { amount: 5000000, mutez: true });
```

and

```typescript
const adminApi = (await tezosApi(toolkit).at(contractAddress)).with(
  ExchangeAdmin
);
const run = runMethod(adminApi.changeFee(1, 2));
```

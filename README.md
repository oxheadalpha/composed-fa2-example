# Content

This is an example project to demonstrate usage of the
[@oxheadalpha/fa2-contracts](https://github.com/oxheadalpha/nft-tutorial/blob/master/packages/fa2-contracts/README.md)
package, a library and a tool to generate modular Tezos FA2 contracts and
TypeScript interfaces.

## Custom FA2 Contract

As an example, we are going to implement a single fungible token FA2 contract
where the FA2 token can be exchanged for Tez. Any address can invoke the `mint`
contract entry point and transfer some Tez to exchange for the FA2 token. Any
FA2 token owner can also exchange FA2 tokens for Tez by calling the `burn`
contract entry point. The exchange rate is always one Mutez per one FA2 token.
In addition, the contract collects an exchange fee that can set by the contract
admin. The contract admin can change the exchange fee percent and withdraw
collected fees. The contract admin can pause and unpause the contract. If the
contract is paused, token owners cannot transfer, mint and burn tokens.

First, we will generate the LIGO code and TypeScript API for the base fungible
token contract using `tzGen` tool from the `@oxheadalpha/fa2-contracts` package.
Then, we will extend the contract code with the custom `mint`, `burn` and the
admin entry points. Finally, we will extend generated TypeScript API with the new
entry points' methods and storage origination function.

### Generate Base Fungible Token FA2 Contract

Import LIGO library sources from `@oxheadalpha/fa2-contracts` package with the
`tzGen import-ligo` command. We are using the default destination directory for
the LIGO code `./ligo`.

```sh
$ yarn tzgen import-ligo
importing LIGO sources from ~/composed-fa2-example/node_modules/@oxheadalpha/fa2-contracts/ligo to ~/composed-fa2-example/ligo
LIGO sources imported to ~/composed-fa2-example/ligo
```

Initialize `tzGen` tool environment. We are using the default settings for LIGO
source code directory (`./ligo`) and TypeScript source code directory (`./src`).
For the compilation output we specify `.\dist` directory.

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

### Extend Base LIGO Contract

First we need to define LIGO types for the custom contract storage and the main
entry point. In the `./ligo/src` directory we create a new contract file
`tzfa2_contract.mligo` and include the generated `base_ft_contract.mligo`. Then
we define a new storage type as a record combining `asset_storage` from the
generated contract and the exchange fee related fields:

```ocaml
#include "base_ft_contract.mligo"

type tzfa2_storage = {
  asset : asset_storage;
  fee_percent : nat;
  collected_fees: tez;
}
```

Define custom entry points type:

```ocaml
type burn_param = {
  fee_percent: nat;
  tokens : nat;
}

type change_fee_param = {
  old_fee_percent : nat;
  new_fee_percent : nat;
}

type tzfa2_entrypoints =
  | Mint of nat (* accepts desired exchange fee percent *)
  | Burn of burn_param
  | Change_fee of change_fee_param
  | Withdraw_fees (* the admin withdraws collected fees *)
```

Define a new main entry point function and dispatch the calls to handler functions:

```ocaml
type tzfa2_main_entrypoint =
  | Asset of asset_entrypoints
  | Tzfa2 of tzfa2_entrypoints

let tzfa2_main (param, storage: tzfa2_main_entrypoint * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  match param with
  | Asset asset ->
    (* dispatch call to the generated contract main function implementation *)
    let ops, new_asset = asset_main (asset, storage.asset) in
    let new_s = { storage with asset = new_asset } in
    (ops, new_s)
  | Tzfa2 tzfa2_param  ->
    (* will add custom entry points handlers later *)
    ([] : operation list), storage
```

To test if our contract code compiles, we can add a build script based on `tzGen`
to the `package.json` file:

```json
"build:contract": "yarn tzgen michelson tzfa2_contract tzfa2_contract --main tzfa2_main"
```

Now we can run the following command

```sh
$ yarn build:contract
```

any time we made changes to the contract code.

The next step is to implement handlers for the custom entry points. The final
implementation of custom entry points can be found in
[tzfa2-contract.mligo](./ligo/src/tzfa2-contract.mligo). The implementation uses


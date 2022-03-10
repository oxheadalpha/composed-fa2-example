# Content

This is an example project to demonstrate usage of the
[@oxheadalpha/fa2-contracts](https://github.com/oxheadalpha/nft-tutorial/blob/master/packages/fa2-contracts/README.md)
package, a library and a tool to generate modular Tezos FA2 contracts and
TypeScript interfaces.


```sh
$ yarn tzgen import-ligo
importing LIGO sources from ~/composed-fa2-example/node_modules/@oxheadalpha/fa2-contracts/ligo to ~/composed-fa2-example/ligo
LIGO sources imported to ~/composed-fa2-example/ligo
```

```sh
$ yarn tzgen init --compile-out ./dist
~/composed-fa2-example/tzgen.json config file created
```

```sh
$ yarn tzgen spec my_contract.json --kind FT --admin PAUSABLE
~/composed-fa2-example/my_contract.json spec file created
```

```sh
$ yarn tzgen contract my_contract.json base_ft_contract.mligo
~/composed-fa2-example/ligo/src/base_ft_contract.mligo is generated
```

```sh
$ yarn tzgen type-script my_contract.json base_ft_contract.ts
~/composed-fa2-example/src/base_ft_contract.ts is generated
```

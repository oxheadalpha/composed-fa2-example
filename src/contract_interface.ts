import { nat, mutez, address } from '@oxheadalpha/fa2-interfaces';
import {
  ContractAbstraction,
  ContractMethod,
  ContractProvider,
  TezosToolkit
} from '@taquito/taquito';
import { createContractInterface } from './base_ft_contract';

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

export const ExchangeAdmin = (
  contract: ContractAbstraction<ContractProvider>
): ExchangeAdminContract => ({
  withdrawFees: () => contract.methods.withdraw_fees(),
  changeFee: (old_fee: mutez, new_fee: mutez) =>
    contract.methods.change_fee(old_fee, new_fee)
});

export const Minter = (
  contract: ContractAbstraction<ContractProvider>
): MinterContract => ({
  mint: (expected_fee: mutez) => contract.methods.mint(expected_fee),
  burn: (ntokens: nat) => contract.methods.burn(ntokens)
});

export const createCustomContractInterface = async (
  toolkit: TezosToolkit,
  contractAddress: address
) =>
  (await createContractInterface(toolkit, contractAddress))
    .with(Minter)
    .with(ExchangeAdmin);

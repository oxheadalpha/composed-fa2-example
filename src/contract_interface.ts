import { nat, mutez } from '@oxheadalpha/fa2-interfaces';
import {
  ContractAbstraction,
  ContractMethod,
  ContractProvider
} from '@taquito/taquito';

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

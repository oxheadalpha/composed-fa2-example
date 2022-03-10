#include "base_ft_contract.mligo"

type tzfa2_storage = {
  asset : asset_storage;
  fee_percent : nat;
  collected_fees: tez;
}


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

type tzfa2_main_entrypoint =
  | Asset of asset_entrypoints
  | Tzfa2 of tzfa2_entrypoints

let custom_entrypoints (param, storage : tzfa2_entrypoints * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  ([] : operation list), storage

let tzfa2_main (param, storage: tzfa2_main_entrypoint * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  match param with
  | Asset asset ->
    (* dispatch call to the generated contract main function implementation *)
    let ops, new_asset = asset_main (asset, storage.asset) in
    let new_s = { storage with asset = new_asset } in
    (ops, new_s)
  | Tzfa2 tzfa2_param  -> custom_entrypoints (tzfa2_param, storage)
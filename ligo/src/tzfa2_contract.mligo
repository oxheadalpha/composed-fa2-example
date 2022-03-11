#include "base_ft_contract.mligo"

type tzfa2_storage = {
  asset : asset_storage;
  fee : tez;
  collected_fees: tez;
}

type change_fee_param = {
  old_fee : tez;
  new_fee : tez;
}

type tzfa2_entrypoints =
  | Mint of tez (* accepts desired exchange fee percent *)
  | Burn of nat (* number of tokens to burn *)
  | Change_fee of change_fee_param
  | Withdraw_fees (* the admin withdraws collected fees *)

type tzfa2_main_entrypoint =
  | Asset of asset_entrypoints
  | Tzfa2 of tzfa2_entrypoints

[@inline]
let assert_fee (expected_fee, current_fee : tez * tez) : unit =
  if expected_fee <> current_fee
  then failwith "UNEXPECTED_FEE"
  else unit

let mint (fee, storage : tez * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  let _ = assert_fee (fee, storage.fee) in
  ([] : operation list), storage

let burn (ntokens, storage : nat * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  let _ = assert_fee (Tezos.amount, storage.fee) in
  ([] : operation list), storage

let withdraw_fees (storage : tzfa2_storage)
    : (operation list) * tzfa2_storage =
  let new_s = { storage with collected_fees = 0mutez; } in
  let callback : unit contract option =
    Tezos.get_contract_opt Tezos.sender in
  let op = match callback with
  | Some c -> Tezos.transaction unit storage.collected_fees c
  | None -> (failwith "NO_CALLBACK" : operation)
  in
  [op], new_s

let change_fee (param, storage : change_fee_param * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  let _ = assert_fee (storage.fee, param.old_fee) in
  let new_s = { storage with fee = param.new_fee; } in
  ([] : operation list), new_s

let custom_entrypoints (param, storage : tzfa2_entrypoints * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  match param with
  | Mint fee ->
    let _ = fail_if_paused storage.asset.admin in
    let _ = fail_if_not_minter storage.asset in
    mint (fee, storage)

  | Burn ntokens ->
    let _ = fail_if_paused storage.asset.admin in
    let _ = fail_if_not_minter storage.asset in
    burn (ntokens, storage)

  | Change_fee p ->
    let _ = fail_if_not_admin storage.asset.admin in
    change_fee (p, storage)
    
  | Withdraw_fees ->
    let _ = fail_if_not_admin storage.asset.admin in
    withdraw_fees storage

let tzfa2_main (param, storage: tzfa2_main_entrypoint * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  match param with
  | Asset asset ->
    (* dispatch call to the generated contract main function implementation *)
    let ops, new_asset = asset_main (asset, storage.asset) in
    let new_s = { storage with asset = new_asset } in
    (ops, new_s)
  | Tzfa2 tzfa2_param  -> custom_entrypoints (tzfa2_param, storage)
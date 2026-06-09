#!/bin/bash

# ローカル環境の gcloud 構成をチェック

: check gcloud config && {
    gcloud config configurations list
    read -p "アクティブな構成が正しいことを確認したら Enter を押してください:"
}

export const httpErrors = {
  // Authentication
  USER_EXISTED: {
    message: "ユーザーは既に存在します",
    code: "USER_00001",
  },
  USER_NOT_EXISTED: {
    message: "ユーザーが存在しません",
    code: "USER_00002",
  },
  CREATE_USER_FAILED: {
    message: "ユーザーの作成に失敗しました",
    code: "USER_00003",
  },
  UPDATE_USER_INFO_FAILED: {
    message: "ユーザー情報の更新に失敗しました",
    code: "USER_00009",
  },
  CONFIRM_SIGN_UP_FAILED: {
    message: "サインアップの確認に失敗しました",
    code: "USER_00011",
  },
  UNAUTHORIZED: {
    message: "認証されていません",
    code: "USER_00012",
  },

  CHANGE_PASSWORD_FAILED: {
    message: "パスワードの変更に失敗しました",
    caches: "USER_00013",
  },

  RESEND_SIGN_UP_CODE_FAILED: {
    message: "サインアップコードの再送信に失敗しました",
    caches: "USER_00014",
  },

  //Forbidden
  FORBIDDEN: {
    message: "許可されていません",
    code: "FORBIDDEN_00001",
  },

  // Validate
  IMAGE_ONLY: {
    message: "画像のみ許可されています",
    code: "VALIDATE_00001",
  },

  CAN_NOT_UPLOAD_IMAGE: {
    message: "画像をアップロードできません",
    code: "VALIDATE_00002",
  },

  YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION: {
    message: "この操作を実行する権限がありません",
    code: "VALIDATE_00003",
  },

  // Common from database

  AN_ERROR_OCCURRED_WHILE_UPDATING_DATA_IN_THE_DATABASE: {
    message: "リクエストが失敗しました",
    code: "DATABASE_00001",
  },

  AN_ERROR_OCCURRED_WHILE_CREATING_DATA_IN_THE_DATABASE: {
    message: "リクエストが失敗しました",
    code: "DATABASE_00002",
  },

  AN_ERROR_OCCURRED_WHILE_DELETING_DATA_IN_THE_DATABASE: {
    message: "リクエストが失敗しました",
    code: "DATABASE_00003",
  },

  // From database improvement

  AN_ERROR_OCCURRED_WHILE_CREATE_IMPROVEMENT: {
    message: "リクエストが失敗しました ",
    code: "IMPROVEMENT_00001",
  },

  AN_ERROR_OCCURRED_WHILE_CREATE_LABEL: {
    message: "リクエストが失敗しました ",
    code: "IMPROVEMENT_00002",
  },

  IMPROVEMENT_NOT_FOUND: {
    message: "Kaizen Hub の投稿が見つかりません",
    code: "IMPROVEMENT_00003",
  },

  IMPROVEMENT_TITLE_ALREADY_EXIST: {
    message: "タイトルが存在しました。",
    code: "IMPROVEMENT_00004",
  },

  // Pareto
  MODE_AND_DATA_HAVE_DIFFERENT: {
    message: "画像データとタイプが一致しません",
    code: "PARETO_00001",
  },
  PARETO_NOT_FOUND: {
    message: "パレートが見つかりません",
    code: "PARETO_00002",
  },

  //FishBone
  FISHBONE_NOT_FOUND: {
    message: "フィッシュボーン図の情報が見つかりません",
    code: "FISHBONE_00001",
  },
  FISHBONE_ASSISTANT_NOT_FOUND: {
    message: "フィッシュボーンアシスタントが見つかりません",
    code: "FISHBONE_00002",
  },

  //FTA
  FTA_NOT_FOUND: {
    message: "FTAの情報が見つかりません",
    code: "FTA_00001",
  },

  //Other
  NOT_ALLOWED_TO_SAVE_DATA: {
    message: "データを保存する許可がありません",
    code: "LICENSE_00001",
  },
  LIMITED_RECORDS_OF_USER: {
    message: "データを保存できる件数の上限に達していますので、再度お試しください。",
    code: "LIMITED_RECORDS_OF_USER_IS_REACHED",
  },

  //Google API
  AN_ERROR_OCCURRED_WHILE_EXECUTING_GOOGLE_API: {
    message: "ネットワーク接続が失われました。もう一度実行してください。",
    code: "GOOGLE_API_00001",
  },

  LIMITED_QUANTITY_OF_TOKENS_ARE_REACHED: {
    message:
      "現在のご利用プランでは、チャットの上限に達しました。\n引き続きAIと会話を続けるには、アカウントのアップグレードが必要です。",
    code: "LIMITED_QUANTITY_OF_TOKENS_ARE_REACHED",
  },
  INVALID_ORDER_KEY: {
    message: "無効なソートキーです",
    code: "INVALID_ORDER_KEY",
  },
  RECENT_FILE_NOT_FOUND: {
    message: "最近のファイルが見つかりません",
    code: "RECENT_FILE_NOT_FOUND",
  },
  ADD_FEEDBACK_FAILED: {
    message: "フィードバックの追加に失敗しました",
    code: "FEEDBACK_00001",
  },
  FILE_SIZE_EXCEEDED: {
    message: "ファイルサイズが制限を超えています",
    code: "FILE_SIZE_EXCEEDED",
  },
  INVALID_FILE_TYPE: {
    message: "無効なファイルタイプです",
    code: "INVALID_FILE_TYPE",
  },
  INVALID_FILE: {
    message: "無効なファイルです",
    code: "INVALID_FILE",
  },
  CAN_NOT_UPLOAD_FILE: {
    message: "ファイルのアップロードに失敗しました",
    code: "CAN_NOT_UPLOAD_FILE",
  },
  CAN_NOT_DELETE_FILE: {
    message: "ファイルの削除に失敗しました",
    code: "CAN_NOT_DELETE_FILE",
  },
  AN_ERROR_OCCURRED_WHILE_CREATE_METRIC: {
    message: "メトリックの作成中にエラーが発生しました",
    code: "METRIC_00001",
  },
  AN_ERROR_OCCURRED_WHILE_CREATE_RELATED_DOCUMENTS: {
    message: "関連ドキュメントの作成中にエラーが発生しました",
    code: "RELATED_DOCUMENTS_00001",
  },
  AN_ERROR_OCCURRED_WHILE_CREATE_IMPLEMENTATION_STEPS: {
    message: "実施ステップの作成中にエラーが発生しました",
    code: "IMPLEMENTATION_STEPS_00001",
  },
  CAN_NOT_GET_CATEGORIES: {
    message: "カテゴリーの取得に失敗しました",
    code: "CAN_NOT_GET_CATEGORIES",
  },
  CREATE_RELATED_DOCUMENT_FAILED: {
    message: "関連ドキュメントの作成に失敗しました",
    code: "RELATED_DOCUMENTS_00002",
  },
  CREATE_RELATED_DOCUMENTS_FAILED: {
    message: "関連ドキュメントの作成に失敗しました",
    code: "RELATED_DOCUMENTS_00003",
  },
  DELETE_RELATED_DOCUMENT_FAILED: {
    message: "関連ドキュメントの削除に失敗しました",
    code: "RELATED_DOCUMENTS_00003",
  },
  CAN_NOT_CREATE_IMPLEMENTATION_STEP: {
    message: "実施ステップの作成に失敗しました",
    code: "IMPLEMENTATION_STEPS_00002",
  },
  CAN_NOT_DELETE_IMPLEMENTATION_STEP: {
    message: "実施ステップの削除に失敗しました",
    code: "IMPLEMENTATION_STEPS_00003",
  },
  CAN_NOT_CREATE_IMPLEMENTATION_STEPS: {
    message: "実施ステップの作成に失敗しました",
    code: "IMPLEMENTATION_STEPS_00004",
  },
  AN_ERROR_OCCURRED_WHILE_UPDATE_RELATED_DOCUMENTS: {
    message: "関連ドキュメントの更新中にエラーが発生しました",
    code: "RELATED_DOCUMENTS_00004",
  },
  AN_ERROR_OCCURRED_WHILE_UPDATE_IMPLEMENTATION_STEPS: {
    message: "実施ステップの更新中にエラーが発生しました",
    code: "IMPLEMENTATION_STEPS_00005",
  },
  RELATED_DOCUMENT_NOT_FOUND: {
    message: "関連ドキュメントが見つかりません",
    code: "RELATED_DOCUMENTS_00005",
  },
  IMPLEMENTATION_STEP_NOT_FOUND: {
    message: "実施ステップが見つかりません",
    code: "IMPLEMENTATION_STEPS_00006",
  },
  IMPLEMENTATION_STEPS_NOT_FOUND: {
    message: "実施ステップが見つかりません",
    code: "IMPLEMENTATION_STEPS_00007",
  },
  DELETE_FILE_FROM_S3_FAILED: {
    message: "S3からファイルを削除できませんでした",
    code: "DELETE_FILE_FROM_S3_FAILED",
  },
};

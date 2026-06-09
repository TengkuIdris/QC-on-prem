export const handleAuthError = (error: any) => {
  switch (error.code) {
    case "UserNotFoundException":
      return "ユーザーが見つかりません。";
    case "NotAuthorizedException":
      return "ユーザー名またはパスワードが間違っています。";
    case "UserNotConfirmedException":
      return "ユーザーが確認されていません。確認コードを入力してください。";
    case "MemberRoleNotAllowed":
      return "メンバー権限ではログインできません。管理者にお問い合わせください。";
    case "OnlyMemberAllowed":
      return "メンバー以外の権限ではログインできません。";
    default:
      return "認証エラーが発生しました。もう一度お試しください。";
  }
};

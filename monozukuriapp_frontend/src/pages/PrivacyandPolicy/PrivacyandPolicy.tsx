import React from "react";
import { Helmet } from "react-helmet-async";

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>プライバシーポリシー | カイゼンハブ</title>
        <meta
          name="description"
          content="カイゼンハブのプライバシーポリシーです。お問い合わせ情報や利用データなどの個人情報の取り扱い方針、利用目的、第三者提供、安全管理措置について説明します。"
        />
      </Helmet>
      <div className="max-w-3xl mx-auto  bg-white font-family-Arial">
        <div className="py-12">
          <div className="pt-10 pb-12 shadow-custom p-5">
            <h1 className="text-center mb-[30px] text-[32px] font-bold mt-5">プライバシーポリシー</h1>
            <p className="my-[16px] font-bold">
              <strong>最終更新日: 2024年6月28日</strong>
            </p>
            <p className="mb-[16px]">
              当社は、新規事業においてお客様の個人情報の保護に努めています。本プライバシーポリシーは、お客様が当社のLP（ランディングページ）をご利用になる際に収集する情報の種類、その情報の使用方法、およびその情報を保護するために取られる手段について説明します。
            </p>

            <h2 className="mb-[20px] font-bold text-[24px]">1. 収集する情報</h2>
            <p className="mb-[16px]">当社は、以下の情報を収集することがあります。</p>
            <ul className="list-disc pl-8">
              <li>
                <strong className="font-bold">個人情報</strong>:
                お客様がメールマガジン登録や問い合わせフォームを利用する際に提供されるメールアドレス、お名前、電話番号など。
              </li>
              <li>
                <strong>問い合わせ内容</strong>: お客様が問い合わせフォームを利用して送信するメッセージや質問。
              </li>
              <li>
                <strong>利用状況情報</strong>:
                サイト利用状況の分析のため、Googleアナリティクスを使用して収集される情報（IPアドレス、ブラウザの種類、アクセス時間、閲覧ページなど）。
              </li>
            </ul>

            <h2 className="my-[20px] font-bold text-[24px]">2. 情報の使用目的</h2>
            <p className="mb-[16px]">収集した情報は以下の目的で使用されます。</p>
            <ul className="list-disc pl-8">
              <li>
                <strong>個人情報</strong>: 新しい情報の提供、ニュースレターの送信、お問い合わせへの対応。
              </li>
              <li>
                <strong>問い合わせ内容</strong>: お客様からのお問い合わせに対する対応。
              </li>
              <li>
                <strong>利用状況情報</strong>: サイトの改善、ユーザーエクスペリエンスの向上、トラフィックの分析。
              </li>
            </ul>

            <h2 className="my-[20px] font-bold text-[24px]">3. 情報の共有</h2>
            <p className="mb-[16px]">
              当社は、お客様の個人情報を以下の場合を除き、第三者に開示または共有することはありません。
            </p>
            <ul className="list-disc pl-8">
              <li>
                <strong>法令に基づく場合</strong>: 法律の規定に従って情報を開示する必要がある場合。
              </li>
              <li>
                <strong>業務委託先への提供</strong>:
                メールマガジンの配信や問い合わせ対応を行うために必要な範囲で業務委託先に情報を提供する場合。
              </li>
            </ul>

            <h2 className="my-[20px] text-[24px] title_policy">4. クッキー（Cookies）の使用</h2>
            <p>
              当社のウェブサイトは、ユーザーエクスペリエンスを向上させるためにクッキーを使用することがあります。クッキーとは、ウェブサイトがユーザーのコンピュータに送信する小さなデータファイルで、ウェブサイトの利用状況を記憶するものです。お客様は、ブラウザの設定を変更することでクッキーを無効にすることができますが、その場合、ウェブサイトの一部の機能が利用できなくなる可能性があります。
            </p>

            <h2 className="my-[20px] font-bold text-[24px]">5. セキュリティ</h2>
            <p>
              当社は、お客様の個人情報を保護するために、適切なセキュリティ対策を講じています。ただし、インターネットを介した情報の送信は完全に安全ではないため、その点をご理解いただきますようお願いいたします。
            </p>

            <h2 className="my-[20px] font-bold text-[24px]">6. プライバシーポリシーの変更</h2>
            <p>
              当社は、必要に応じて本プライバシーポリシーを変更することがあります。変更があった場合、当ウェブサイトにて告知いたしますので、定期的にご確認ください。
            </p>

            <h2 className="my-[20px] font-bold text-[24px]">7. お問い合わせ</h2>
            <p className="mb-[16px]">
              本プライバシーポリシーに関するご質問やお問い合せは、以下の連絡先までご連絡ください。
            </p>
            <p>
              <strong>連絡先</strong>
              <br />
              Email: contact@kznhub.com
              <br />
              住所: 静岡県富士市今泉700-1
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;

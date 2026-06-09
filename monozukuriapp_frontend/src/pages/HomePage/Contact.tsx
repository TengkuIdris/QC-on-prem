import { useAppSelector } from "@/core/hooks";
import { Auth } from "@/enum/pathnames";
// import CommonBreadcrumbs from "@/features/fta/components/beardcumd";
import sesService, { MailBody } from "@/services/apis/sesService";
import { handleApi } from "@/utils/handleApi";
import { useFormik } from "formik";
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as Yup from "yup";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import PublicHeader from "@/components/layout/Header/PublicHeader";
import { Helmet } from "react-helmet-async";

const validationSchema = Yup.object({
  email: Yup.string()
    .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
      message: "正しい形式のメールアドレスを入力してください",
    })
    .required("メールアドレスは必須です"),
});

const Contact: React.FC = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [isDisable, setIsDisbale] = useState(false);
  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      company: "",
      role: "",
      detail: "",
    },
    validationSchema,
    onSubmit: async (values: MailBody) => {
      setIsDisbale(true);
      const [res] = await handleApi(sesService.sendMail(values));
      if (res) {
        setTimeout(() => setIsDisbale(false), 10000);
        toast.success("送信できました。");
        formik.resetForm();
      } else {
        setIsDisbale(false);
        toast.error("送信が失敗しました。");
      }
    },
  });

  const navigate = useNavigate();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);
  useEffect(() => {
    setBreadcrumbItems([
      { label: "TOP", href: "#", onClick: () => navigate("/") },
      { label: "お問い合わせ", href: "#" },
    ]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems, navigate]);

  return (
    <>
      <Helmet>
        <title>お問い合わせ | 特性要因図・パレート図・なぜなぜ分析ツールに関するご相談 | カイゼンハブ</title>
        <meta
          name="description"
          content="特性要因図・パレート図・なぜなぜ分析ツール、AIを活用した品質管理・現場改善に関するご質問やデモのご依頼はこちらからお問い合わせください。"
        />
      </Helmet>
      <PublicHeader />
      <div style={{ background: "#f6f9ff", minHeight: "100vh", padding: "40px 0" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "32px",
            maxWidth: "1200px",
            margin: "0 auto",
            background: "#fff",
            borderRadius: "16px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            overflow: "hidden",
            padding: "0",
          }}
        >
          <div style={{ flex: 1, padding: "40px 32px", minWidth: 0 }}>
            <h2 className="text-2xl text-top-page-title-color font-bold">お問い合わせ・料金案内</h2>
            <p className="text-top-page-text-color my-5">
              担当よりご連絡いたします。カイゼンハブのご利用料金につきましては、ご要望をお伺いした上でお見積りさせていただきます。
            </p>
            <form
              className="flex flex-col mt-4"
              noValidate
              onSubmit={formik.handleSubmit}
            >
              <label
                htmlFor="name"
                className="text-sm text-top-page-text-color mt-2"
              >
                お名前
              </label>
              <input
                type="text"
                id="name"
                name="name"
                onChange={formik.handleChange}
                value={formik.values.name}
                className="mt-1 p-2 border border-gray-300 rounded bg-white"
              />

              <label
                htmlFor="email"
                className="text-sm text-top-page-text-color mt-2"
              >
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                onChange={formik.handleChange}
                value={formik.values.email}
                className="mt-1 p-2 border border-gray-300 rounded bg-white"
              />
              {formik.touched.email && formik.errors.email && <div className="text-red-500">{formik.errors.email}</div>}

              <label
                htmlFor="company"
                className="text-sm text-top-page-text-color mt-2"
              >
                会社名
              </label>
              <input
                type="text"
                id="company"
                name="company"
                onChange={formik.handleChange}
                value={formik.values.company}
                className="mt-1 p-2 border border-gray-300 rounded bg-white"
              />

              <label
                htmlFor="role"
                className="text-sm text-top-page-text-color mt-2"
              >
                役職名
              </label>
              <input
                type="text"
                id="role"
                name="role"
                onChange={formik.handleChange}
                value={formik.values.role}
                className="mt-1 p-2 border border-gray-300 rounded bg-white"
              />

              <label
                htmlFor="detail"
                className="text-sm text-top-page-text-color mt-2"
              >
                お問い合わせ内容
              </label>
              <textarea
                id="detail"
                name="detail"
                onChange={formik.handleChange}
                value={formik.values.detail}
                className="mt-1 p-2 border border-gray-300 rounded h-40 bg-white"
              />

              <button
                type="submit"
                className={`mt-4 p-3  text-white rounded ${isDisable ? "bg-gray-400" : "hover:bg-[#005D0F] bg-[#004D0D]"}`}
                disabled={isDisable}
              >
                送信する
              </button>
              {!isAuthenticated && (
                <>
                  <div className="my-6 flex items-center justify-center">
                    <div className="line border-t-2 grow"></div>
                    <div className="text-top-page-title-color mx-5 font-bold">アカウントをお持ちの方</div>
                    <div className="line border-t-2 grow border-[bg-blue-900]"></div>
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      className="bg-[#004D0D] text-white rounded hover:bg-[#005D0F]"
                      onClick={() => navigate(Auth.LOGIN)}
                    >
                      ログイン
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
          <div style={{ flex: 1, padding: "40px 32px", background: "#f9fafb", minWidth: 0 }}>
            <h2 className="text-2xl text-top-page-title-color font-bold">料金案内プラン</h2>
            <div
              id="pricing-image"
              style={{
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "32px 0",
                overflow: "hidden",
                background: "#fff",
                minHeight: 320,
              }}
            >
              <img
                src="/image/img_contact.png"
                alt="料金プラン_temp"
                style={{ width: "100%", height: "auto", objectFit: "contain", maxHeight: 400 }}
              />
            </div>
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) {
            div[style*='display: flex'][style*='max-width: 1200px'] {
              flex-direction: column;
              padding: 0;
            }
            div[style*='padding: 40px 32px'] {
              padding: 24px 12px !important;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default Contact;

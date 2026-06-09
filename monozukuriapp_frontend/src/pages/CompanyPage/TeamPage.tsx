import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import PublicHeader from "@/components/layout/Header/PublicHeader";
import { FooterSection } from "@/pages/InitialPage/FooterSection";
import { App } from "@/enum/pathnames";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  credentials: string[];
  experience: string;
  description: string;
  expertise: string[];
  image: string | null;
  featured: boolean;
}

function MemberCard({ member, featured }: { member: TeamMember; featured: boolean }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative rounded-2xl bg-white border border-zinc-200 overflow-hidden hover:shadow-lg transition-all duration-300 h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-square bg-[#f6f9ff] flex items-center justify-center p-6">
        {member.image ? (
          <img
            src={member.image}
            alt={member.name}
            className="w-32 h-32 object-contain rounded-full"
            loading="lazy"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-[#004d0f] flex items-center justify-center">
            <span className="text-white text-4xl font-bold">{member.name.charAt(0)}</span>
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-zinc-900 mb-1">{member.name}</h3>
        <p className="text-sm font-semibold text-[#004d0f] mb-3">{member.role}</p>

        {/* Skill Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {member.expertise.map((skill) => (
            <span
              key={skill}
              className="px-2 py-1 bg-zinc-100 text-zinc-700 text-xs rounded-md"
            >
              {skill}
            </span>
          ))}
        </div>

        <p className="text-sm text-zinc-600 leading-relaxed">{member.description}</p>

        {/* Hover Overlay with Additional Details */}
        {isHovered && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm p-6 flex flex-col justify-center">
            {member.experience && (
              <p className="text-sm text-zinc-600 mb-2">
                <strong className="text-zinc-900">経歴:</strong> {member.experience}
              </p>
            )}
            {member.credentials && member.credentials.length > 0 && (
              <p className="text-sm text-zinc-600">
                <strong className="text-zinc-900">資格:</strong> {member.credentials.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamPage() {
  const navigate = useNavigate();

  const teamMembers = [
    {
      id: 1,
      name: "プロジェクトリーダー",
      role: "プロジェクトリーダー",
      credentials: ["QC検定1級"],
      experience: "製造業8年（日本・中国・メキシコ）",
      description:
        "現場の声を常に意識し、実践的な品質改善を推進。グローバルな視点で製造現場の課題解決に取り組んでいます。",
      expertise: ["品質保証", "現場改善", "国際プロジェクト"],
      image: "/image/member1.png",
      featured: true,
    },
    {
      id: 2,
      name: "技術担当",
      role: "テクニカルリーダー",
      credentials: [],
      experience: "システム開発・製造技術",
      description: "最新の製造技術とクラウドツールの導入を担当。現場とITの架け橋として効率化を実現します。",
      expertise: ["システム設計", "データ基盤", "UI/UX"],
      image: null,
      featured: false,
    },
    {
      id: 3,
      name: "品質管理担当",
      role: "品質管理スペシャリスト",
      credentials: [],
      experience: "品質管理・改善活動",
      description: "製品の品質向上と維持に注力し、品質基準の策定と監視を行っています。データに基づく改善を推進します。",
      expertise: ["品質管理", "データ分析", "改善活動"],
      image: null,
      featured: false,
    },
  ];

  const values = [
    {
      title: "現場第一",
      description: "製造現場の実態を理解し、現場で使いやすいツールを提供します。",
    },
    {
      title: "継続的改善",
      description: "お客様のフィードバックを大切にし、常にサービスの改善を続けます。",
    },
    {
      title: "技術革新",
      description: "最新のAI・データ分析技術を活用し、新しい価値を創造します。",
    },
  ];

  return (
    <>
      <Helmet>
        <title>チーム紹介 | カイゼンハブプロジェクトチーム</title>
        <meta
          name="description"
          content="カイゼンハブプロジェクトチームの紹介。ジヤトコ株式会社新規事業推進部のメンバーです。"
        />
        <style>
          {`
            @media (prefers-reduced-motion: reduce) {
              * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
              }
            }
          `}
        </style>
      </Helmet>
      <PublicHeader />
      <div className="min-h-screen bg-[#f6f9ff] antialiased pt-16">
        {/* Table of Contents - Desktop Only */}
        <nav className="hidden lg:block fixed top-24 right-8 w-64 z-40">
          <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-900 mb-3">目次</p>
            <ul className="space-y-2">
              <li>
                <a
                  href="#overview"
                  className="text-sm text-zinc-600 hover:text-[#004d0f] transition-colors"
                >
                  プロジェクト概要
                </a>
              </li>
              <li>
                <a
                  href="#mission"
                  className="text-sm text-zinc-600 hover:text-[#004d0f] transition-colors"
                >
                  ミッション・ビジョン
                </a>
              </li>
              <li>
                <a
                  href="#values"
                  className="text-sm text-zinc-600 hover:text-[#004d0f] transition-colors"
                >
                  価値観
                </a>
              </li>
              <li>
                <a
                  href="#team"
                  className="text-sm text-zinc-600 hover:text-[#004d0f] transition-colors"
                >
                  チーム
                </a>
              </li>
            </ul>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative bg-white text-zinc-900 py-20 md:py-32 border-b border-zinc-200">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-[#004d0f]">
                カイゼンハブ
                <br />
                プロジェクトチーム
              </h1>
              <p className="text-xl md:text-2xl text-zinc-600 leading-relaxed">ジヤトコ株式会社新規事業推進部</p>
            </div>
          </div>
        </section>

        {/* Project Overview Section */}
        <section
          id="overview"
          className="py-16 md:py-24"
        >
          <div className="max-w-4xl mx-auto px-6 md:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">プロジェクト概要</h2>
              <div className="w-20 h-1 bg-[#ffd700] mx-auto"></div>
            </div>
            <div className="space-y-6 text-zinc-700 leading-relaxed text-lg">
              <p>
                カイゼンハブは、ジヤトコ株式会社内の新規事業推進部によって推進されているプロジェクトです。
                製造現場の効率化と品質向上を目的とし、最新の技術と革新的なアプローチを取り入れています。
              </p>
              <p>
                このプロジェクトは、ジヤトコの企業理念である「技術と情熱でモビリティの可能性を拡げる」を体現し、
                製造現場の継続的な改善と革新を目指しています。
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section
          id="mission"
          className="py-16 md:py-24 bg-white"
        >
          <div className="max-w-6xl mx-auto px-6 md:px-8">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              {/* Mission Card */}
              <div className="rounded-2xl bg-white border border-zinc-200 p-8 md:p-10 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#ffd700] flex items-center justify-center">
                    <span className="text-zinc-900 text-lg font-semibold">🎯</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-zinc-900">ミッション</h3>
                </div>
                <p className="text-zinc-700 leading-relaxed text-lg">
                  カイゼンハブは、製造現場の品質改善活動をデジタル技術でサポートし、
                  より効率的で効果的な改善サイクルの実現を目指しています。
                </p>
              </div>

              {/* Vision Card */}
              <div className="rounded-2xl bg-white border border-zinc-200 p-8 md:p-10 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#ffd700] flex items-center justify-center">
                    <span className="text-zinc-900 text-lg font-semibold">👁️</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-zinc-900">ビジョン</h3>
                </div>
                <p className="text-zinc-700 leading-relaxed text-lg">
                  データ分析とAI技術を活用し、製造現場の課題解決を加速させ、 日本のものづくりの競争力向上に貢献します。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section
          id="values"
          className="py-16 md:py-24"
        >
          <div className="max-w-6xl mx-auto px-6 md:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">私たちの価値観</h2>
              <div className="w-20 h-1 bg-[#ffd700] mx-auto"></div>
            </div>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-6 md:p-8 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-xl font-semibold text-zinc-900 mb-3">{value.title}</h3>
                  <p className="text-zinc-600 leading-relaxed">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Members Section */}
        <section
          id="team"
          className="py-16 md:py-24 bg-white"
        >
          <div className="max-w-6xl mx-auto px-6 md:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">チームメンバー</h2>
              <div className="w-20 h-1 bg-[#ffd700] mx-auto mb-6"></div>
              <p className="text-zinc-600 text-lg max-w-2xl mx-auto">
                製造業の現場経験者、品質管理、保全エンジニアなど、 多様なバックグラウンドを持つメンバーが集まり、
                お客様の課題解決に取り組んでいます。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              {teamMembers.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  featured={member.featured}
                />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-6 md:px-8">
            <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 md:p-12 text-center shadow-xl">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">お問い合わせ</h2>
              <p className="text-zinc-300 text-lg mb-6 max-w-2xl mx-auto">
                サービスに関するご質問やご相談は、お気軽にお問い合わせください。
              </p>
              <button
                onClick={() => navigate(App.CONTACT)}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#ffd700] text-[#004d0f] font-semibold text-base hover:bg-[#e6c200] transition-colors shadow-lg"
              >
                <span>お問い合わせフォームへ</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </section>

        <FooterSection navigate={navigate} />
      </div>
    </>
  );
}

export default TeamPage;

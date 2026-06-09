import React from "react";
import style from "./initial.module.css";

const teamMembers = [
  {
    id: 1,
    name: "プロジェクトリーダー",
    description:
      "QC検定1級保持。日本、中国、メキシコで工場の品質保証部を8年間従事。現場の声を常に意識した行動をモットーとしています。",
    image: "/image/member1.png",
  },
  {
    id: 2,
    name: "技術担当",
    description: "最新の製造技術とクラウドツールの導入を担当。現場とITの架け橋として効率化を実現します。",
    image: null,
  },
  {
    id: 3,
    name: "品質管理担当",
    description: "製品の品質向上と維持に注力し、品質基準の策定と監視を行っています。データに基づく改善を推進します。",
    image: null,
  },
];

export function TeamSection() {
  return (
    <section
      id="team"
      className={style["team-section"]}
    >
      <div className={style["container"]}>
        <h2 className={style["section-title"]}>チーム紹介</h2>
        <div className={style["team-grid"]}>
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className={style["team-item"]}
            >
              <div className="flex justify-center mb-4">
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className="rounded-full w-[120px] h-[120px] object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-[120px] h-[120px] rounded-full bg-[#004d0f] flex items-center justify-center">
                    <span className="text-white text-4xl font-bold">{member.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              <h3 className="text-center font-medium text-[18px] mb-1">{member.name}</h3>
              <p className="text-center text-top-page-text-color text-sm max-w-[400px] mx-auto">{member.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

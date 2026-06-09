import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import event from "@/utils/eventEmitter";
import { EventType } from "@/constant/enum";

const PublicHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogoClick = () => {
    // Check if currently on WhyWhy analysis view page (need to intercept navigation)
    const isOnWhyWhyAnalysisView = location.pathname.startsWith("/whywhy/view/");
    
    if (isOnWhyWhyAnalysisView) {
      // Emit event để WhyWhyAnalysisView có thể intercept
      event.emit(EventType.PARETO_CHECK_SAVE_DATA, "/");
    } else {
      navigate("/");
    }
  };
  
  return (
    <header
      style={{
        width: "100%",
        background: "#004d0d",
        borderBottom: "1px solid #1a294d",
        padding: 0,
        minHeight: 64,
        display: "flex",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          justifyContent: "space-between",
        }}
      >
        <img
          src="/image/logo_kaizenhub_ver2.png"
          alt="KaizenHub Logo 1"
          style={{ height: 40, cursor: "pointer", marginRight: 24 }}
          onClick={handleLogoClick}
        />
        <span
          style={{ fontWeight: 700, fontSize: 20, color: "#fff", cursor: "pointer", marginLeft: "auto" }}
          onClick={handleLogoClick}
        >
          ホーム
        </span>
      </div>
    </header>
  );
};

export default PublicHeader;

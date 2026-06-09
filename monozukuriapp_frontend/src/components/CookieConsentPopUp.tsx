import React from "react";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import { Checkbox, FormControlLabel, FormGroup, Collapse } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { getCookie, setCookie } from "@/utils/cookie";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 800,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  opacity: 1,
  transition: "all 0.3s ease-in-out",
};

interface CookieSettings {
  necessary: boolean;
  preferences: boolean;
  statistics: boolean;
  marketing: boolean;
}

export default function CookieConsentPopUp() {
  const [openOtherCheckbox, setOpenOtherCheckbox] = React.useState(true);
  const [open, setOpen] = React.useState(() => {
    const cookieValue = getCookie("cookie_consent");
    return cookieValue !== "true";
  });

  const [cookieSettings, setCookieSettings] = React.useState<CookieSettings>(() => {
    const cookieValue = getCookie("cookie_preferences");
    return {
      necessary: true,
      preferences: cookieValue.includes("preferences"),
      statistics: cookieValue.includes("statistics"),
      marketing: cookieValue.includes("marketing"),
    };
  });

  const handleAllowSelected = () => {
    const acceptedTypes = Object.entries(cookieSettings)
      .filter(([, accepted]) => accepted)
      .map(([type]) => type);

    setCookie("cookie_consent", "true", 365);
    setCookie("cookie_preferences", JSON.stringify(acceptedTypes), 365);
    setOpen(false);
  };

  const handleAllowAll = () => {
    const allAccepted = {
      necessary: true,
      preferences: true,
      statistics: true,
      marketing: true,
    };

    setCookie("cookie_consent", "true", 365);
    setCookie("cookie_preferences", JSON.stringify(Object.keys(allAccepted)), 365);
    setOpen(false);
  };

  return (
    <Modal
      open={open}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
      closeAfterTransition
      BackdropProps={{
        timeout: 300,
      }}
      sx={{
        "& .MuiBackdrop-root": {
          transition: "opacity 0.3s ease !important",
        },
      }}
    >
      <Box sx={style}>
        <h2 className="font-noto font-bold text-[1.75rem]">このウェブサイトはCookieを使用します</h2>
        <p className="font-noto mt-2">
          このサイトではCookieを使って、 ユーザーに合わせたコンテンツや広告の表示、 トラフィックの分析を行っています。
          またユーザーによ るサイトの利用状況についても情報を収集し、 ソーシャルメディアや広告配信、
          データ解析の各パートナーに情報を共有しています。 こ こで収集された情報は、
          ユーザーが各パートナーに提供した他の情報や各パートナーのサービスを使用した際に収集された情報と組み合
          わされ、各パートナーによって使用されることがあります。
        </p>
        <Box sx={{ display: "flex", gap: 2, mt: 2, alignItems: "center", justifyContent: "space-between" }}>
          <FormGroup sx={{ width: "100%" }}>
            <div>
              <FormControlLabel
                disabled
                control={<Checkbox />}
                label="必須"
                checked={true}
                defaultChecked={true}
              />
            </div>
            <div>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={cookieSettings.preferences}
                    onChange={(e) =>
                      setCookieSettings((prev) => ({
                        ...prev,
                        preferences: e.target.checked,
                      }))
                    }
                  />
                }
                label="設定情報"
              />
            </div>
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-start" }}>
              <Collapse
                in={openOtherCheckbox}
                timeout={300}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={cookieSettings.statistics}
                        onChange={(e) =>
                          setCookieSettings((prev) => ({
                            ...prev,
                            statistics: e.target.checked,
                          }))
                        }
                      />
                    }
                    label="統計"
                  />
                </div>
                <div>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={cookieSettings.marketing}
                        onChange={(e) =>
                          setCookieSettings((prev) => ({
                            ...prev,
                            marketing: e.target.checked,
                          }))
                        }
                      />
                    }
                    label="マーケティング"
                  />
                </div>
              </Collapse>

              <p
                className="font-bold flex items-center cursor-pointer font-noto text-[#2a4073]"
                onClick={() => setOpenOtherCheckbox(!openOtherCheckbox)}
              >
                詳細を表示
                <KeyboardArrowDownIcon
                  sx={{
                    transform: !openOtherCheckbox ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.3s ease",
                  }}
                />
              </p>
            </Box>
          </FormGroup>
        </Box>
        <Box sx={{ display: "flex", gap: 2, mt: 2, justifyContent: "flex-end" }}>
          <button
            className="bg-white font-bold border text-[#2a4073] font-noto border-[#2a4073] border-2 hover:border-[#2a4073] px-4 py-2 rounded"
            onClick={handleAllowSelected}
          >
            選択中のCookieを許可
          </button>
          <button
            className="bg-[#ffad00] font-bold text-[#2a4073] font-noto border border-2 hover:border-[#ffad00] px-4 py-2 rounded"
            onClick={handleAllowAll}
          >
            全て許可
          </button>
        </Box>
      </Box>
    </Modal>
  );
}
